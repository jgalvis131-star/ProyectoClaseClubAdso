<?php

require_once __DIR__ . '/../Config/conexion.php';

class Actividad {
    private $conexion;

    public function __construct() {
        $conexionDB = new Conexion();
        $this->conexion = $conexionDB->conectar();
    }

    public function obtenerActividades() {
        $sql = "SELECT * FROM actividades ORDER BY fechaEvento ASC";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute();
        return $consulta->fetchAll(PDO::FETCH_ASSOC);
    }

    public function guardar($datos) {
        $sql = "INSERT INTO actividades (nombreActividad, municipio, fechaEvento) VALUES (:nombreActividad, :municipio, :fechaEvento)";
        $consulta = $this->conexion->prepare($sql);
        return $consulta->execute([
            ":nombreActividad" => $datos["nombreActividad"],
            ":municipio" => $datos["municipio"],
            ":fechaEvento" => $datos["fechaEvento"]
        ]);
    }

    public function eliminar($idActividad) {
        $sql = "DELETE FROM actividades WHERE idActividad = :idActividad";
        $consulta = $this->conexion->prepare($sql);
        $consulta->execute([":idActividad" => $idActividad]);
        return $consulta->rowCount() > 0;
    }

    public function editar($datos) {
        $sql = "UPDATE actividades SET nombreActividad = :nombreActividad, municipio = :municipio, fechaEvento = :fechaEvento, totalRecaudo = :totalRecaudo WHERE idActividad = :idActividad";
        $consulta = $this->conexion->prepare($sql);
        $ejecutado = $consulta->execute([
            ":nombreActividad" => $datos['nombreActividad'],
            ":municipio" => $datos['municipio'],
            ":fechaEvento" => $datos['fechaEvento'],
            ":totalRecaudo" => $datos['totalRecaudo'] ?? null,
            ":idActividad" => $datos['idActividad']
        ]);

        if (!$ejecutado) {
            return false;
        }

        if ($consulta->rowCount() > 0) {
            return true;
        }

        $verificar = $this->conexion->prepare("SELECT 1 FROM actividades WHERE idActividad = :idActividad");
        $verificar->execute([":idActividad" => $datos['idActividad']]);

        return (bool)$verificar->fetchColumn();
    }
}