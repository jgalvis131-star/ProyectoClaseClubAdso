const listaPrestamos = document.getElementById("listaPrestamos");
let esAdministrador = false;
let prestamos = [];
let accionesConfiguradas = false;
const formularioPrestamo = document.getElementById("formPrestamo");
const modalPrestamo = new bootstrap.Modal(document.getElementById("modalPrestamo"));

document.addEventListener("DOMContentLoaded", () => {
    const hoy = new Date().toISOString().split('T')[0];
    const inputFecha = document.getElementById("fechaPrestamo");
    if (inputFecha) {
        inputFecha.min = hoy; // Bloquear fechas pasadas en préstamos
    }
});

async function solicitarApi(metodo, datos) {
    const opciones = {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
    }

    if (datos) {
        opciones.body = JSON.stringify(datos);
    }
    const respuesta = await fetch("../Modelos/gestionarPrestamos.php", opciones);
    const resultado = await respuesta.json();
    if (respuesta.status === 401) {
        window.location.href = "../Vista/login.html";
    }
    if (!respuesta.ok) {
        throw new Error(resultado.message || resultado.mensaje || "Error en la solicitud");
    }
    return resultado;
}

async function cargarAsociadosSelect() {
    try {
        const respuesta = await fetch("../Modelos/gestionarAsociados.php");
        const resultado = await respuesta.json();
        if (resultado.success) {
            const selectAsociado = document.getElementById("idAsociado");
            selectAsociado.innerHTML = '<option value="">Seleccione un asociado...</option>';
            resultado.asociados.forEach(asociado => {
                const option = document.createElement("option");
                option.value = asociado.idAsociado;
                option.textContent = `${asociado.nombres} ${asociado.apellidos} - Doc: ${asociado.documento}`;
                selectAsociado.append(option);
            });
        }
    } catch (error) {
        console.error("No se pudieron cargar los asociados", error);
    }
}

async function cargarPrestamos() {
    try {
        const resultado = await solicitarApi("GET");
        esAdministrador = resultado.rol === "admin";
        configurarAcciones();
        prestamos = resultado.prestamos;
        mostrarPrestamos();

    } catch (error) {
        alert("Error al cargar los préstamos: " + error.message);
    }

    function mostrarPrestamos() {
        listaPrestamos.replaceChildren();
        if (prestamos.length === 0) {
            const fila = document.createElement("tr");
            const celda = document.createElement("td");
            celda.colSpan = esAdministrador ? 7 : 6;
            celda.className = "text-center py-4 text-muted";
            celda.textContent = "No hay préstamos disponibles.";
            fila.append(celda);
            listaPrestamos.append(fila);
            return;
        }
        prestamos.forEach((prestamo) => {
            const fila = document.createElement("tr");
            const valorFormateado = Number(prestamo.valorPrestamo).toLocaleString("es-CO", { 
                style: "currency", 
                currency: "COP" 
            });

            let badgeEstado = '<span class="badge bg-warning text-dark">Pendiente</span>';
            if (prestamo.estado === 'Aprobado') {
                badgeEstado = '<span class="badge bg-success">Aprobado</span>';
            } else if (prestamo.estado === 'Rechazado') {
                badgeEstado = '<span class="badge bg-danger">Rechazado</span>';
            }

            fila.append(
                crearCelda(`${prestamo.nombres} ${prestamo.apellidos}`),
                crearCelda(valorFormateado),
                crearCelda(`${prestamo.tasaInteres}%`),
                crearCelda(prestamo.numeroCuotas),
                crearCelda(prestamo.fechaPrestamo),
                crearCeldaEstado(badgeEstado)
            );

            if (esAdministrador) {
                const acciones = document.createElement("td");
                acciones.className = "text-nowrap";

                const botonEditar = document.createElement("button");
                botonEditar.type = "button";
                botonEditar.className = "btn btn-sm btn-outline-primary me-1";
                botonEditar.innerHTML = '<i class="bi bi-pencil-square"></i>';
                botonEditar.addEventListener("click", () => abrirEdicion(prestamo));

                const botonAprobar = document.createElement("button");
                botonAprobar.type = "button";
                botonAprobar.className = "btn btn-sm btn-success me-1";
                botonAprobar.innerHTML = '<i class="bi bi-check-lg"></i>';
                botonAprobar.title = "Aprobar";
                botonAprobar.addEventListener("click", () => actualizarEstadoPrestamo(prestamo.idPrestamo, "Aprobado"));

                const botonRechazar = document.createElement("button");
                botonRechazar.type = "button";
                botonRechazar.className = "btn btn-sm btn-danger";
                botonRechazar.innerHTML = '<i class="bi bi-x-lg"></i>';
                botonRechazar.title = "Rechazar";
                botonRechazar.addEventListener("click", () => actualizarEstadoPrestamo(prestamo.idPrestamo, "Rechazado"));

                acciones.append(botonEditar, botonAprobar, botonRechazar);
                fila.append(acciones);
            }
            listaPrestamos.append(fila);
        });
    }

    function crearCelda(texto) {
        const celda = document.createElement("td");
        celda.textContent = texto;
        return celda;
    }

    function crearCeldaEstado(htmlContenido) {
        const celda = document.createElement("td");
        celda.innerHTML = htmlContenido;
        return celda;
    }
}

async function actualizarEstadoPrestamo(idPrestamo, nuevoEstado) {
    const confirmar = window.confirm(`¿Estás seguro de marcar este préstamo como "${nuevoEstado}"?`);
    if (!confirmar) return;

    try {
        await solicitarApi("PUT", { idPrestamo: idPrestamo, estado: nuevoEstado });
        await cargarPrestamos();
        alert(`Préstamo ${nuevoEstado.toLowerCase()} correctamente.`);
    } catch (error) {
        alert(error.message);
    }
}

function configurarAcciones() {
    if (accionesConfiguradas) return;
    const botonNuevo = document.getElementById("nuevoPrestamo");
    const encabezadoAcciones = document.getElementById("encabezadoAcciones");

    if (esAdministrador) {
        botonNuevo.classList.remove("d-none");
        encabezadoAcciones.classList.remove("d-none");
        accionesConfiguradas = true;
    }
}

async function abrirEdicion(prestamo) {
    formularioPrestamo.reset();
    await cargarAsociadosSelect();
    const selectAsociado = document.getElementById("idAsociado");

    let existeOpcion = Array.from(selectAsociado.options).some(opt => opt.value == prestamo.idAsociado);
    if (!existeOpcion && prestamo.idAsociado) {
        const option = document.createElement("option");
        option.value = prestamo.idAsociado;
        option.textContent = `${prestamo.nombres} ${prestamo.apellidos}`;
        selectAsociado.append(option);
    }

    document.getElementById("idPrestamo").value = prestamo.idPrestamo;
    document.getElementById("idAsociado").value = prestamo.idAsociado;
    document.getElementById("valorPrestamo").value = prestamo.valorPrestamo;
    document.getElementById("tasaInteres").value = prestamo.tasaInteres;
    document.getElementById("numeroCuotas").value = prestamo.numeroCuotas;
    document.getElementById("fechaPrestamo").value = prestamo.fechaPrestamo;

    document.getElementById("tituloModalPrestamo").textContent = "Editar Préstamo";
    document.getElementById("guardarPrestamo").textContent = "Guardar Cambios";
    modalPrestamo.show();
}

document.getElementById("nuevoPrestamo").addEventListener("click", async () => {
    formularioPrestamo.reset();
    await cargarAsociadosSelect();
    document.getElementById("idPrestamo").value = "";
    document.getElementById("tituloModalPrestamo").textContent = "Nuevo Préstamo";
    document.getElementById("guardarPrestamo").textContent = "Guardar Préstamo";
});

async function guardarPrestamo(datos, idPrestamo) {
    try {
        await solicitarApi(idPrestamo ? "PUT" : "POST", datos); 
        modalPrestamo.hide();
        alert(idPrestamo ? "Actualizado correctamente" : "Registrado correctamente");
        cargarPrestamos();
    } catch (error) { 
        alert(error.message);
    }
}

formularioPrestamo.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const idPrestamo = document.getElementById("idPrestamo").value;
    const fechaSeleccionada = document.getElementById("fechaPrestamo").value;
    const hoy = new Date().toISOString().split('T')[0];

    if (fechaSeleccionada < hoy) {
        alert("No puedes seleccionar una fecha anterior a la actual.");
        return;
    }

    const datos = {
        idAsociado: Number(document.getElementById("idAsociado").value),
        valorPrestamo: Number(document.getElementById("valorPrestamo").value),
        tasaInteres: Number(document.getElementById("tasaInteres").value),
        numeroCuotas: Number(document.getElementById("numeroCuotas").value),
        fechaPrestamo: fechaSeleccionada,
    };

    if (idPrestamo) {
        datos.idPrestamo = Number(idPrestamo);
    }

    await guardarPrestamo(datos, idPrestamo);
});

cargarPrestamos();