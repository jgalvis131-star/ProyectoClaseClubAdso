<?php
require_once __DIR__ . '/../Config/conexion.php';

class Asociado {
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

    private $conexion;

    public function __construct($datos = null){
        $conexionDB = new Conexion();
        $this->conexion = $conexionDB->conectar();

        if ($datos) {
            $this->documento = $datos['documento'] ?? null;
            $this->nombres = $datos['nombres'] ?? null;
            $this->apellidos = $datos['apellidos'] ?? null;
            $this->fechaNacimiento = $datos['fechaNacimiento'] ?? null;
            $this->genero = $datos['genero'] ?? null;
            $this->direccionResidencia = $datos['direccionResidencia'] ?? null;
            $this->ciudad = $datos['ciudad'] ?? null;
            $this->telefono = $datos['telefono'] ?? null;
            $this->email = $datos['email'] ?? null;
            if (isset($datos['contraseña'])) {
                $this->contraseña = password_hash($datos['contraseña'], PASSWORD_DEFAULT);
            }
        }
    }

    public function guardar($datos = null) {
        $documento = $datos['documento'] ?? $this->documento;
        $nombres = $datos['nombres'] ?? $this->nombres;
        $apellidos = $datos['apellidos'] ?? $this->apellidos;
        $telefono = $datos['telefono'] ?? $this->telefono;
        $email = $datos['email'] ?? $this->email;
        
        if (isset($datos['fechaNacimiento']) || isset($this->fechaNacimiento)) {
            $fechaNacimiento = $datos['fechaNacimiento'] ?? $this->fechaNacimiento;
            $genero = $datos['genero'] ?? $this->genero;
            $direccionResidencia = $datos['direccionResidencia'] ?? $this->direccionResidencia;
            $ciudad = $datos['ciudad'] ?? $this->ciudad;
            $contraseña = isset($datos['contraseña']) ? password_hash($datos['contraseña'], PASSWORD_DEFAULT) : $this->contraseña;

            $sql = "INSERT INTO asociados (documento, nombres, apellidos, fechaNacimiento, genero, direccionResidencia, ciudad, telefono, email, contraseña) 
                    VALUES (:documento, :nombres, :apellidos, :fechaNacimiento, :genero, :direccionResidencia, :ciudad, :telefono, :email, :contrasena)";
            $consulta = $this->conexion->prepare($sql);
            return $consulta->execute([
                ':documento' => $documento,
                ':nombres' => $nombres,
                ':apellidos' => $apellidos,
                ':fechaNacimiento' => $fechaNacimiento,
                ':genero' => $genero,
                ':direccionResidencia' => $direccionResidencia,
                ':ciudad' => $ciudad,
                ':telefono' => $telefono,
                ':email' => $email,
                ':contrasena' => $contraseña
            ]);
        } else {
            $sql = "INSERT INTO asociados (documento, nombres, apellidos, telefono, email, fechaNacimiento, genero, direccionResidencia, ciudad, contraseña) 
                    VALUES (:documento, :nombres, :apellidos, :telefono, :email, :fechaNacimiento, :genero, :direccionResidencia, :ciudad, :contrasena)";
            $consulta = $this->conexion->prepare($sql);
            return $consulta->execute([
                ':documento' => $documento,
                ':nombres' => $nombres,
                ':apellidos' => $apellidos,
                ':telefono' => $telefono,
                ':email' => $email,
                ':fechaNacimiento' => '2000-01-01',
                ':genero' => 'No especificado',
                ':direccionResidencia' => 'N/A',
                ':ciudad' => 'N/A',
                ':contrasena' => password_hash('123456', PASSWORD_DEFAULT)
            ]);
        }
    }

    public function obtenerAsociados() {
        $sql = "SELECT idAsociado, documento, nombres, apellidos, telefono, email FROM asociados";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute();
        return $consulta->fetchAll(PDO::FETCH_ASSOC);
    }

    public function editar($datos) {
        $sql = "UPDATE asociados 
                SET documento = :documento, 
                    nombres = :nombres, 
                    apellidos = :apellidos, 
                    telefono = :telefono, 
                    email = :email 
                WHERE idAsociado = :idAsociado";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute([
            ':idAsociado' => $datos['idAsociado'],
            ':documento' => $datos['documento'],
            ':nombres' => $datos['nombres'],
            ':apellidos' => $datos['apellidos'],
            ':telefono' => $datos['telefono'],
            ':email' => $datos['email']
        ]);
        return $consulta->rowCount() > 0;
    }

    public function eliminar($idAsociado) {
        $sql = "DELETE FROM asociados WHERE idAsociado = :idAsociado";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute([':idAsociado' => $idAsociado]);
        return $consulta->rowCount() > 0;
    }
}