<?php
require_once __DIR__ . '/../Config/conexion.php';

class Prestamo {
    private $conexion;

    public function __construct() {
        $conexionDB = new Conexion();
        $this->conexion = $conexionDB->conectar();
    }

    public function obtenerPrestamos() {
        $sql = "SELECT p.idPrestamo, p.valorPrestamo, p.tasaInteres, p.numeroCuotas, p.fechaPrestamo, 
                       a.nombres, a.apellidos, a.documento, a.idAsociado 
                FROM prestamos p 
                INNER JOIN asociados a ON p.idAsociado = a.idAsociado 
                ORDER BY p.fechaPrestamo DESC";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute();
        return $consulta->fetchAll(PDO::FETCH_ASSOC);
    }

    public function guardar($datos) {
        $sql = "INSERT INTO prestamos (valorPrestamo, tasaInteres, numeroCuotas, fechaPrestamo, idAsociado)
                VALUES (:valorPrestamo, :tasaInteres, :numeroCuotas, :fechaPrestamo, :idAsociado)";
        $consulta = $this->conexion->prepare($sql);
        return $consulta->execute([
            ':valorPrestamo' => $datos['valorPrestamo'],
            ':tasaInteres' => $datos['tasaInteres'],
            ':numeroCuotas' => $datos['numeroCuotas'],
            ':fechaPrestamo' => $datos['fechaPrestamo'],
            ':idAsociado' => $datos['idAsociado']
        ]);
    }

    public function editar($datos) {
        $sql = "UPDATE prestamos 
                SET valorPrestamo = :valorPrestamo, 
                    tasaInteres = :tasaInteres, 
                    numeroCuotas = :numeroCuotas, 
                    fechaPrestamo = :fechaPrestamo, 
                    idAsociado = :idAsociado 
                WHERE idPrestamo = :idPrestamo";
        $consulta = $this->conexion->prepare($sql);
        return $consulta->execute([
            ':idPrestamo' => $datos['idPrestamo'],
            ':valorPrestamo' => $datos['valorPrestamo'],
            ':tasaInteres' => $datos['tasaInteres'],
            ':numeroCuotas' => $datos['numeroCuotas'],
            ':fechaPrestamo' => $datos['fechaPrestamo'],
            ':idAsociado' => $datos['idAsociado']
        ]);
    }

    public function eliminar($idPrestamo) {
        $sql = "DELETE FROM prestamos WHERE idPrestamo = :idPrestamo";
        $consulta = $this->conexion->prepare($sql);
        return $consulta->execute([':idPrestamo' => $idPrestamo]);
    }
}