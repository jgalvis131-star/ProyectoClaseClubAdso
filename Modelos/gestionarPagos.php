<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

try {
    // 1. Validar sesión activa (documento y rol obligatorios)
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
            // 2. Si es asociado, trae solo sus pagos. Si es admin, puede traer todos o filtrarlos.
            if ($rolSesion === "admin") {
                $sql = "SELECT pc.idPago, pc.valorCuota, pc.fechaPago, p.idPrestamo 
                        FROM pagos_cuotas pc
                        INNER JOIN prestamos p ON pc.idPrestamo = p.idPrestamo
                        ORDER BY pc.fechaPago DESC";
                $consulta = $conexion->prepare($sql);
                $consulta->execute();
            } else {
                $sql = "SELECT pc.idPago, pc.valorCuota, pc.fechaPago, p.idPrestamo 
                        FROM pagos_cuotas pc
                        INNER JOIN prestamos p ON pc.idPrestamo = p.idPrestamo
                        INNER JOIN asociados a ON p.idAsociado = a.idAsociado
                        WHERE a.documento = :documento
                        ORDER BY pc.fechaPago DESC";
                $consulta = $conexion->prepare($sql);
                $consulta->execute([':documento' => $documentoSesion]);
            }

            $pagos = $consulta->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "pagos" => $pagos
            ]);
            break;

        case "POST":
            // 3. Registrar un nuevo pago (Solo permitido para administradores)
            if ($rolSesion !== "admin") {
                http_response_code(403);
                throw new Exception("Acción no autorizada para tu rol.");
            }

            $datos = json_decode(file_get_contents("php://input"), true);

            if (empty($datos['idPrestamo']) || empty($datos['valorCuota']) || empty($datos['fechaPago'])) {
                http_response_code(400);
                throw new Exception("Todos los campos son obligatorios para registrar el pago.");
            }

            $sql = "INSERT INTO pagos_cuotas (valorCuota, fechaPago, idPrestamo) 
                    VALUES (:valorCuota, :fechaPago, :idPrestamo)";
                    
            $consulta = $conexion->prepare($sql);
            $consulta->execute([
                ':valorCuota' => $datos['valorCuota'],
                ':fechaPago' => $datos['fechaPago'],
                ':idPrestamo' => $datos['idPrestamo']
            ]);

            echo json_encode([
                "success" => true,
                "message" => "Pago registrado exitosamente."
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