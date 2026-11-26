<?php
session_start();
header('Content-Type: application/json; charset=UTF-8');

try {
    if (!isset($_SESSION["documento"], $_SESSION["rol"])) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "No autorizado"]);
        exit();
    }

    require_once __DIR__ . '/../Config/conexion.php';
    $conexionDB = new Conexion();
    $db = $conexionDB->conectar();

    $metodo = $_SERVER['REQUEST_METHOD'];
    $rolUsuario = $_SESSION["rol"];
    $documentoUsuario = $_SESSION["documento"];

    $idAsociadoLogueado = null;
    if ($rolUsuario !== 'admin') {
        $stmtAsoc = $db->prepare("SELECT idAsociado FROM asociados WHERE documento = :doc");
        $stmtAsoc->execute([':doc' => $documentoUsuario]);
        $resAsoc = $stmtAsoc->fetch(PDO::FETCH_ASSOC);
        if ($resAsoc) {
            $idAsociadoLogueado = $resAsoc['idAsociado'];
        }
    }

    // 1. OBTENER ACTIVIDADES E INSCRIPCIONES (GET)
    if ($metodo === 'GET') {
        if (isset($_GET['accion']) && $_GET['accion'] === 'ver_inscritos') {
            if ($rolUsuario !== 'admin') {
                http_response_code(403);
                throw new Exception("No autorizado");
            }
            $idActividad = $_GET['idActividad'] ?? 0;
            
            $sqlInscritos = "SELECT a.documento, a.nombres, a.apellidos, a.email, a.telefono 
                             FROM asociados a
                             JOIN actividades_asociado ia ON a.idAsociado = ia.idAsociado
                             WHERE ia.idActividad = :idActividad";
            $stmtInc = $db->prepare($sqlInscritos);
            $stmtInc->execute([':idActividad' => $idActividad]);
            $inscritos = $stmtInc->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(["success" => true, "inscritos" => $inscritos]);
            exit();
        }

        $sql = "SELECT idActividad, nombreActividad, fechaEvento, municipio, fechaLimite, totalRecaudado FROM actividades";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $actividades = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $misInscripciones = [];
        if ($idAsociadoLogueado) {
            $stmtMis = $db->prepare("SELECT idActividad FROM actividades_asociado WHERE idAsociado = :idAsoc");
            $stmtMis->execute([':idAsoc' => $idAsociadoLogueado]);
            $misInscripciones = $stmtMis->fetchAll(PDO::FETCH_COLUMN);
        }

        echo json_encode([
            "success" => true,
            "rol" => $rolUsuario,
            "actividades" => $actividades,
            "misInscripciones" => $misInscripciones
        ]);
        exit();
    }

    // 2. CREAR O INSCRIBIR (POST)
    if ($metodo === 'POST') {
        $datos = json_decode(file_get_contents("php://input"), true);

        if (isset($datos['accion']) && $datos['accion'] === 'inscribir') {
            if (!$idAsociadoLogueado) {
                throw new Exception("Asociado no encontrado.");
            }

            $sqlIns = "INSERT IGNORE INTO actividades_asociado (idActividad, idAsociado) VALUES (:act, :asoc)";
            $stmtIns = $db->prepare($sqlIns);
            $stmtIns->execute([
                ':act' => $datos['idActividad'],
                ':asoc' => $idAsociadoLogueado
            ]);

            echo json_encode(["success" => true, "message" => "Te has inscrito exitosamente a la actividad."]);
            exit();
        }

        if ($rolUsuario !== 'admin') {
            http_response_code(403);
            throw new Exception("No tienes permisos.");
        }

        $totalRecaudado = (isset($datos['totalRecaudado']) && $datos['totalRecaudado'] !== '') ? $datos['totalRecaudado'] : null;

        $sql = "INSERT INTO actividades (nombreActividad, fechaEvento, fechaLimite, municipio, totalRecaudado) 
                VALUES (:nombre, :evento, :limite, :municipio, :recaudado)";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':nombre' => $datos['nombreActividad'],
            ':evento' => $datos['fechaEvento'],
            ':limite' => $datos['fechaLimite'],
            ':municipio' => $datos['municipio'],
            ':recaudado' => $totalRecaudado
        ]);

        echo json_encode(["success" => true, "message" => "Actividad registrada correctamente"]);
        exit();
    }

    // 3. EDITAR (PUT - Solo Admin)
    if ($metodo === 'PUT') {
        if ($rolUsuario !== 'admin') {
            http_response_code(403);
            throw new Exception("No autorizado.");
        }

        $datos = json_decode(file_get_contents("php://input"), true);
        $totalRecaudado = (isset($datos['totalRecaudado']) && $datos['totalRecaudado'] !== '') ? $datos['totalRecaudado'] : null;

        $sql = "UPDATE actividades 
                SET nombreActividad = :nombre, fechaEvento = :evento, fechaLimite = :limite, municipio = :municipio, totalRecaudado = :recaudado 
                WHERE idActividad = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':id' => $datos['idActividad'],
            ':nombre' => $datos['nombreActividad'],
            ':evento' => $datos['fechaEvento'],
            ':limite' => $datos['fechaLimite'],
            ':municipio' => $datos['municipio'],
            ':recaudado' => $totalRecaudado
        ]);

        echo json_encode(["success" => true, "message" => "Actividad actualizada correctamente"]);
        exit();
    }

    // 4. ELIMINAR (DELETE - Solo Admin)
    if ($metodo === 'DELETE') {
        if ($rolUsuario !== 'admin') {
            http_response_code(403);
            throw new Exception("No autorizado.");
        }

        $datos = json_decode(file_get_contents("php://input"), true);
        $sql = "DELETE FROM actividades WHERE idActividad = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $datos['idActividad']]);

        echo json_encode(["success" => true, "message" => "Actividad eliminada correctamente"]);
        exit();
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}