<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

try {
    // 1. Validar que exista una sesión activa con documento y rol
    if (!isset($_SESSION["documento"], $_SESSION["rol"])) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Inicia sesión para continuar."]);
        exit;
    }
    
    require_once __DIR__ . '/../Config/conexion.php';
    $conexionDB = new Conexion();
    $conexion = $conexionDB->conectar();

    $documentoSesion = $_SESSION["documento"];
    $rolSesion = $_SESSION["rol"];
    $metodo = $_SERVER["REQUEST_METHOD"];

    switch ($metodo) {
        case "GET":
            // 2. Consultar préstamos dependiendo del rol (Admin ve todos, Asociado solo los suyos)
            if ($rolSesion === "admin") {
                $sql = "SELECT p.*, a.nombres, a.apellidos 
                        FROM prestamos p 
                        INNER JOIN asociados a ON p.idAsociado = a.idAsociado 
                        ORDER BY p.fechaPrestamo DESC";
                $consulta = $conexion->prepare($sql);
                $consulta->execute();
            } else {
                $sql = "SELECT p.*, a.nombres, a.apellidos 
                        FROM prestamos p 
                        INNER JOIN asociados a ON p.idAsociado = a.idAsociado 
                        WHERE a.documento = :documento 
                        ORDER BY p.fechaPrestamo DESC";
                $consulta = $conexion->prepare($sql);
                $consulta->execute([':documento' => $documentoSesion]);
            }
            
            $prestamos = $consulta->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "rol" => $rolSesion,
                "prestamos" => $prestamos
            ]);
            break;

        case "POST":
            // 3. Registrar un nuevo préstamo con validación de reglas de negocio (Tope 80M y máx 3 préstamos)
            $datos = json_decode(file_get_contents("php://input"), true);

            if (empty($datos['valorPrestamo']) || empty($datos['numeroCuotas']) || empty($datos['fechaPrestamo'])) {
                http_response_code(400);
                throw new Exception("Todos los campos obligatorios deben ser completados.");
            }

            // Determinar el idAsociado según el rol
            $idAsociado = null;
            if ($rolSesion === "admin") {
                if (empty($datos['idAsociado'])) {
                    http_response_code(400);
                    throw new Exception("El ID del asociado es obligatorio para el administrador.");
                }
                $idAsociado = $datos['idAsociado'];
            } else {
                $sqlAsoc = "SELECT idAsociado FROM asociados WHERE documento = :documento";
                $consAsoc = $conexion->prepare($sqlAsoc);
                $consAsoc->execute([':documento' => $documentoSesion]);
                $resAsoc = $consAsoc->fetch(PDO::FETCH_ASSOC);
                
                if (!$resAsoc) {
                    http_response_code(404);
                    throw new Exception("No se encontró el asociado en la base de datos.");
                }
                $idAsociado = $resAsoc['idAsociado'];
            }

            $nuevoValor = floatval($datos['valorPrestamo']);
            $valorMinimo = 100000;         // Mínimo $100.000 COP
            $limiteMaximoTotal = 80000000; // Máximo 80 Millones acumulados[cite: 6]
            $tasaInteres = isset($datos['tasaInteres']) ? floatval($datos['tasaInteres']) : 0.0;

            if ($nuevoValor < $valorMinimo) {
                http_response_code(400);
                throw new Exception("El valor mínimo del préstamo es de $" . number_format($valorMinimo, 0, ',', '.'));
            }

            // REGLA: Verificar cantidad de préstamos activos/pendientes y la suma de sus valores[cite: 6]
            $sqlCant = "SELECT COUNT(*) as total, SUM(valorPrestamo) as sumaValor 
                        FROM prestamos 
                        WHERE idAsociado = :idAsociado 
                        AND estado IN ('Pendiente', 'Aprobado')";
            $consCant = $conexion->prepare($sqlCant);
            $consCant->execute([':idAsociado' => $idAsociado]);
            $prestamosActuales = $consCant->fetch(PDO::FETCH_ASSOC);

            if ($prestamosActuales['total'] >= 3) {
                http_response_code(400);
                throw new Exception("Has alcanzado el límite máximo de 3 préstamos simultáneos[cite: 6].");
            }

            $sumaActual = floatval($prestamosActuales['sumaValor'] ?? 0);
            $cupoDisponible = $limiteMaximoTotal - $sumaActual;

            if (($sumaActual + $nuevoValor) > $limiteMaximoTotal) {
                http_response_code(400);
                throw new Exception("El préstamo supera el cupo permitido. Tu cupo disponible actual es de: $" . number_format($cupoDisponible, 0, ',', '.'));
            }

            // Toda nueva solicitud nace con estado 'Pendiente'
            $sql = "INSERT INTO prestamos (valorPrestamo, tasaInteres, numeroCuotas, fechaPrestamo, idAsociado, estado) 
                    VALUES (:valor, :tasa, :cuotas, :fecha, :idAsociado, 'Pendiente')";
            
            $consulta = $conexion->prepare($sql);
            $consulta->execute([
                ':valor' => $nuevoValor,
                ':tasa' => $tasaInteres,
                ':cuotas' => $datos['numeroCuotas'],
                ':fecha' => $datos['fechaPrestamo'],
                ':idAsociado' => $idAsociado
            ]);

            echo json_encode([
                "success" => true,
                "message" => "Solicitud de préstamo registrada con éxito. Quedó en estado Pendiente."
            ]);
            break;

        case "PUT":
            // 4. Actualizar información o cambiar estado (Aprobar / Rechazar)
            $datos = json_decode(file_get_contents("php://input"), true);

            if (empty($datos['idPrestamo'])) {
                http_response_code(400);
                throw new Exception("ID de préstamo no proporcionado.");
            }

            if (isset($datos['estado'])) {
                $sql = "UPDATE prestamos SET estado = :estado WHERE idPrestamo = :idPrestamo";
                $consulta = $conexion->prepare($sql);
                $consulta->execute([
                    ':estado' => $datos['estado'],
                    ':idPrestamo' => $datos['idPrestamo']
                ]);

                echo json_encode([
                    "success" => true,
                    "message" => "Estado del préstamo actualizado correctamente."
                ]);
                break;
            }

            if (empty($datos['idAsociado']) || empty($datos['valorPrestamo']) || empty($datos['tasaInteres']) || empty($datos['numeroCuotas']) || empty($datos['fechaPrestamo'])) {
                http_response_code(400);
                throw new Exception("Todos los campos son obligatorios para actualizar.");
            }

            $sql = "UPDATE prestamos 
                    SET valorPrestamo = :valor, tasaInteres = :tasa, numeroCuotas = :cuotas, fechaPrestamo = :fecha, idAsociado = :idAsociado 
                    WHERE idPrestamo = :idPrestamo";
            
            $consulta = $conexion->prepare($sql);
            $consulta->execute([
                ':valor' => $datos['valorPrestamo'],
                ':tasa' => $datos['tasaInteres'],
                ':cuotas' => $datos['numeroCuotas'],
                ':fecha' => $datos['fechaPrestamo'],
                ':idAsociado' => $datos['idAsociado'],
                ':idPrestamo' => $datos['idPrestamo']
            ]);

            echo json_encode([
                "success" => true,
                "message" => "Préstamo actualizado correctamente."
            ]);
            break;

        case "DELETE":
            // 5. Eliminar un préstamo
            $datos = json_decode(file_get_contents("php://input"), true);

            if (empty($datos['idPrestamo'])) {
                http_response_code(400);
                throw new Exception("ID de préstamo no proporcionado.");
            }

            $sql = "DELETE FROM prestamos WHERE idPrestamo = :idPrestamo";
            $consulta = $conexion->prepare($sql);
            $consulta->execute([':idPrestamo' => $datos['idPrestamo']]);

            echo json_encode([
                "success" => true,
                "message" => "Préstamo eliminado correctamente."
            ]);
            break;

        default:
            http_response_code(405);
            throw new Exception("Método HTTP no permitido.");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}