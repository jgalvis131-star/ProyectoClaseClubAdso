<?php
require_once __DIR__ . '/../Config/conexion.php';

class Asociado {
    private $conexion;
    private $documento;
    private $nombres;
    private $apellidos;
    private $fechaNacimiento;
    private $genero;
    private $direccionResidencia;
    private $ciudad;
    private $telefono;
    private $email;
    private $contraseña;

    public function __construct($datos) {
        $this->documento = $datos['documento'];
        $this->nombres = $datos['nombres'];
        $this->apellidos = $datos['apellidos'];
        
        // Lee la contraseña sin importar si viene con o sin eñe desde el cliente
        $passPlana = isset($datos['contraseña']) ? $datos['contraseña'] : $datos['contrasena'];
        $this->contraseña = password_hash($passPlana, PASSWORD_DEFAULT);
        
        $this->fechaNacimiento = $datos['fechaNacimiento'];
        $this->genero = $datos['genero'];
        $this->direccionResidencia = $datos['direccionResidencia'];
        $this->ciudad = $datos['ciudad'];
        $this->telefono = $datos['telefono'];
        $this->email = $datos['email'];
        
        $conexion = new Conexion();
        $this->conexion = $conexion->conectar();
    }

    public function guardar() {
        // La columna en tu BD sigue siendo 'contraseña', pero usamos ':pass' para evitar conflictos de PDO
        $sql = "INSERT INTO asociados (documento, nombres, apellidos, fechaNacimiento, genero, direccionResidencia, ciudad, telefono, email, contraseña) 
                VALUES (:documento, :nombres, :apellidos, :fechaNacimiento, :genero, :direccionResidencia, :ciudad, :telefono, :email, :pass)";
        
        $consulta = $this->conexion->prepare($sql);
        
        return $consulta->execute([
            ':documento' => $this->documento,
            ':nombres' => $this->nombres,
            ':apellidos' => $this->apellidos,
            ':fechaNacimiento' => $this->fechaNacimiento,
            ':genero' => $this->genero,
            ':direccionResidencia' => $this->direccionResidencia,
            ':ciudad' => $this->ciudad,
            ':telefono' => $this->telefono,
            ':email' => $this->email,
            ':pass' => $this->contraseña
        ]);
    }   
}