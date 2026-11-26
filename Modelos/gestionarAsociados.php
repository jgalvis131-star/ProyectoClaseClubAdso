<?php
session_start();

header("Content-Type: application/json; charset=UTF-8");


function leerDatos() {
    $datos = json_decode(file_get_contents("php://input"), true);
    if(json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400); 
        throw new Exception("Error al decodificar JSON: " . json_last_error_msg());
    }
    return $datos;
}

function validarAsociado($datos){
    $nombres = $datos['nombres'] ?? null;
    $apellidos = $datos['apellidos'] ?? null;
    $documento = $datos['documento'] ?? null;
    $email = $datos['email'] ?? null;
    $telefono = $datos['telefono'] ?? null;

    if(!is_string($nombres) || trim($nombres) === "" || strlen($nombres) > 100 || 
       !is_string($apellidos) || trim($apellidos) === "" || strlen($apellidos) > 100 || 
       !is_string($documento) || trim($documento) === "" || strlen($documento) > 50 || 
       !is_string($email) || trim($email) === "" || strlen($email) > 100 || 
       !is_string($telefono) || trim($telefono) === "" || strlen($telefono) > 30) {
        http_response_code(400);
        throw new Exception("Ingresa datos válidos para el asociado (nombres, apellidos, documento, email y teléfono)");   
    }
    return [
        "nombres" => trim($nombres),
        "apellidos" => trim($apellidos),
        "documento" => trim($documento),
        "email" => trim($email),
        "telefono" => trim($telefono)
    ];
}

function validarId($id){
    $idAsociado = filter_var($id, FILTER_VALIDATE_INT, ["options" => ["min_range" => 1]]);
    if ($idAsociado === false){
        http_response_code(400);
        throw new Exception("El identificador del asociado no es válido");
    }
    return $idAsociado;
}

try{
    if (!isset($_SESSION["documento"], $_SESSION["rol"])) {
        http_response_code(401);
        throw new Exception("Inicia sesión para consultar los asociados.");
    }
    $metodo = $_SERVER["REQUEST_METHOD"];
    if (!in_array($metodo, ["GET", "POST", "PUT", "DELETE"], true)){
        http_response_code(405); 
        throw new Exception("Método HTTP no permitido");
    }

    if($metodo !== "GET" && $_SESSION["rol"] !== "admin"){
        http_response_code(403); 
        throw new Exception("No tienes permisos para realizar esta acción");
    }
    require_once __DIR__ . "/Asociado.php";
    $asociado = new Asociado();

  
    switch($metodo){
        case "GET":
            $resultado = [
                "success" => true,
                "rol" => $_SESSION["rol"],
                "asociados" => $asociado->obtenerAsociados()
            ];
            http_response_code(200); 
            break;
            
        case "POST":
            $datos = validarAsociado(leerDatos());
            $asociado->guardar($datos);
            $resultado = [
                "success" => true,
                "message" => "Asociado creado exitosamente"
            ];
            http_response_code(201); // Creado exitosamente
            break;
            
        case "PUT":
            $datos = leerDatos();
            $datos["idAsociado"] = validarId($datos["idAsociado"] ?? null);
            $datos = array_merge($datos, validarAsociado($datos));
            
            if(!$asociado->editar($datos)){
                http_response_code(404);
                throw new Exception("No se encontró el asociado");
            }
            $resultado = [
                "success" => true,
                "mensaje" => "Asociado actualizado correctamente"
            ];
            http_response_code(200);
            break;
            
        case "DELETE":
            $datos = leerDatos();
            $idAsociado = validarId($datos["idAsociado"] ?? null);
            
            if(!$asociado->eliminar($idAsociado)){
                http_response_code(404);
                throw new Exception("No se encontró el asociado");
            }
            $resultado = [
                "success" => true,
                "mensaje" => "Asociado eliminado correctamente"
            ];
            http_response_code(200);
            break;
    }
    echo json_encode($resultado);
    
}catch(PDOException $e){
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error en la base de datos: " . $e->getMessage()
    ]);
}catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}