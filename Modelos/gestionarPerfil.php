<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

try {
    if (!isset($_SESSION["documento"], $_SESSION["rol"])) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Inicia sesión para continuar."]);
        exit;
    }
    
    require_once __DIR__ . '/../Config/conexion.php';
    $conexionDB = new Conexion();
    $conexion = $conexionDB->conectar();

    $documento = $_SESSION["documento"];
    $metodo = $_SERVER["REQUEST_METHOD"];

    if (!in_array($metodo, ["GET", "PUT"], true)) {
        http_response_code(405);
        throw new Exception("Método HTTP no permitido");
    }

    switch ($metodo) {
        case "GET":
            $sql = "SELECT nombres, apellidos, documento, fechaNacimiento, genero, direccionResidencia, ciudad, telefono, email, rol 
                    FROM asociados 
                    WHERE documento = :documento";
                    
            $consulta = $conexion->prepare($sql);
            $consulta->execute([':documento' => $documento]);
            $usuario = $consulta->fetch(PDO::FETCH_ASSOC);

            if (!$usuario) {
                http_response_code(404);
                throw new Exception("No se encontró información del usuario.");
            }

            echo json_encode([
                "success" => true,
                "usuario" => $usuario
            ]);
            break;

        case "PUT":
            $datos = json_decode(file_get_contents("php://input"), true);

            if (empty($datos['email']) || empty($datos['telefono']) || empty($datos['ciudad']) || empty($datos['direccionResidencia'])) {
                http_response_code(400);
                throw new Exception("Todos los campos editables son obligatorios.");
            }

            $sql = "UPDATE asociados 
                    SET email = :email, telefono = :telefono, ciudad = :ciudad, direccionResidencia = :direccionResidencia 
                    WHERE documento = :documento";
                    
            $consulta = $conexion->prepare($sql);
            $consulta->execute([
                ':email' => trim($datos['email']),
                ':telefono' => trim($datos['telefono']),
                ':ciudad' => trim($datos['ciudad']),
                ':direccionResidencia' => trim($datos['direccionResidencia']),
                ':documento' => $documento
            ]);

            echo json_encode([
                "success" => true,
                "message" => "Perfil actualizado correctamente"
            ]);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}