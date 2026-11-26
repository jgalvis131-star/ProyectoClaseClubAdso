const listaactividades = document.getElementById("listaActividades");
let esAdministrador = false;
let actividades = [];
let misInscripciones = [];
let accionesConfiguradas = false;
const formularioActividad = document.getElementById("formActividad");
const modalActividad = new bootstrap.Modal(document.getElementById("modalActividad"));
const modalInscritos = new bootstrap.Modal(document.getElementById("modalInscritos"));

document.addEventListener("DOMContentLoaded", () => {
    const hoy = new Date().toISOString().split('T')[0];
    
    const inputFechaEvento = document.getElementById("fechaEvento");
    if (inputFechaEvento) inputFechaEvento.min = hoy;

    const inputFechaLimite = document.getElementById("fechaLimite");
    if (inputFechaLimite) inputFechaLimite.min = hoy;

    cargarActividades();
});

async function solicitarApi(metodo, urlExtra = "", datos = null) {
    const opciones = {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
    }

    if (datos) {
        opciones.body = JSON.stringify(datos);
    }
    const respuesta = await fetch(`../Modelos/gestionarActividades.php${urlExtra}`, opciones);
    const resultado = await respuesta.json();
    if (respuesta.status === 401) {
        window.location.href = "../Vista/login.html";
    }
    if (!respuesta.ok) {
        throw new Error(resultado.message || resultado.mensaje || "Error en la solicitud");
    }
    return resultado;
}

async function cargarActividades() {
    try {
        const resultado = await solicitarApi("GET");
        esAdministrador = (resultado.rol === "admin");
        misInscripciones = resultado.misInscripciones || [];
        configurarAcciones();
        actividades = resultado.actividades;
        mostrarActividades();

    } catch (error) {
        alert("Error al cargar las actividades: " + error.message);
    }

    function mostrarActividades() {
        listaactividades.replaceChildren();
        if (actividades.length === 0) {
            const fila = document.createElement("tr");
            const celda = document.createElement("td");
            celda.colSpan = 6;
            celda.className = "text-center py-4 text-muted";
            celda.textContent = "No hay actividades disponibles.";
            fila.append(celda);
            listaactividades.append(fila);
            return;
        }

        const hoy = new Date().toISOString().split('T')[0];

        actividades.forEach((actividad) => {
            const fila = document.createElement("tr");
            
            const recaudadoFormateado = actividad.totalRecaudado === null 
                ? "Pendiente" 
                : Number(actividad.totalRecaudado).toLocaleString("es-CO", { style: "currency", currency: "COP" });

            fila.innerHTML = `
                <td class="ps-4 fw-semibold">${actividad.nombreActividad}</td>
                <td>${actividad.fechaEvento}</td>
                <td>${actividad.municipio}</td>
                <td>${actividad.fechaLimite ?? "No definida"}</td>
                <td>${recaudadoFormateado}</td>
            `;

            const tdAccion = document.createElement("td");
            tdAccion.className = "text-center text-nowrap";

            if (esAdministrador) {
                // Botón "Ojito" para ver inscritos y reparto financiero
                const botonVer = document.createElement("button");
                botonVer.type = "button";
                botonVer.className = "btn btn-sm btn-outline-info me-1";
                botonVer.innerHTML = '<i class="bi bi-eye"></i>';
                botonVer.title = "Ver asociados inscritos y recaudo";
                botonVer.addEventListener("click", () => verInscritos(actividad));

                // Botón Editar
                const botonEditar = document.createElement("button");
                botonEditar.type = "button";
                botonEditar.className = "btn btn-sm btn-outline-primary me-1";
                botonEditar.innerHTML = '<i class="bi bi-pencil-square"></i>';
                botonEditar.title = "Editar";
                botonEditar.addEventListener("click", () => abrirEdicion(actividad));

                // Botón Eliminar
                const botonEliminar = document.createElement("button");
                botonEliminar.type = "button";
                botonEliminar.className = "btn btn-sm btn-outline-danger";
                botonEliminar.innerHTML = '<i class="bi bi-trash"></i>';
                botonEliminar.title = "Eliminar";
                botonEliminar.addEventListener("click", () => eliminarActividad(actividad));

                tdAccion.append(botonVer, botonEditar, botonEliminar);
            } else {
                const yaInscrito = misInscripciones.includes(String(actividad.idActividad)) || misInscripciones.includes(Number(actividad.idActividad));
                const fechaLimite = actividad.fechaLimite;

                if (yaInscrito) {
                    const badgeInscrito = document.createElement("span");
                    badgeInscrito.className = "badge bg-success py-2 px-3";
                    badgeInscrito.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Inscrito';
                    tdAccion.append(badgeInscrito);
                } else if (fechaLimite && hoy <= fechaLimite) {
                    const botonInscribirse = document.createElement("button");
                    botonInscribirse.type = "button";
                    botonInscribirse.className = "btn btn-sm btn-success";
                    botonInscribirse.innerHTML = '<i class="bi bi-check-circle me-1"></i> Inscribirme';
                    botonInscribirse.addEventListener("click", () => inscribirAActividad(actividad.idActividad));
                    tdAccion.append(botonInscribirse);
                } else {
                    const spanCerrado = document.createElement("span");
                    spanCerrado.className = "badge bg-secondary";
                    spanCerrado.textContent = "Inscripción cerrada";
                    tdAccion.append(spanCerrado);
                }
            }

            fila.append(tdAccion);
            listaactividades.append(fila);
        });
    }
}

// Función del "Ojito" (Admin) con cálculo del 50/50
async function verInscritos(actividad) {
    document.getElementById("nombreActividadModal").textContent = `Actividad: ${actividad.nombreActividad}`;
    
    const elTotal = document.getElementById("resTotalRecaudado");
    const elFondo = document.getElementById("resFondoClub");
    const elReparto = document.getElementById("resRepartoParticipante");
    
    const tbody = document.getElementById("listaInscritosDetalle");
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">Cargando...</td></tr>`;
    modalInscritos.show();

    try {
        const resultado = await solicitarApi("GET", `?accion=ver_inscritos&idActividad=${actividad.idActividad}`);
        tbody.replaceChildren();

        const inscritos = resultado.inscritos || [];
        const totalRecaudado = Number(actividad.totalRecaudado) || 0;
        const cantidadParticipantes = inscritos.length;

        // Cálculo matemático de la regla del club
        const fondoClub = totalRecaudado * 0.50;
        const bolsaParticipantes = totalRecaudado * 0.50;
        const valorPorParticipante = cantidadParticipantes > 0 ? (bolsaParticipantes / cantidadParticipantes) : 0;

        elTotal.textContent = totalRecaudado.toLocaleString("es-CO", { style: "currency", currency: "COP" });
        elFondo.textContent = fondoClub.toLocaleString("es-CO", { style: "currency", currency: "COP" });
        elReparto.textContent = valorPorParticipante.toLocaleString("es-CO", { style: "currency", currency: "COP" });

        if (cantidadParticipantes === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-3">No hay asociados inscritos en esta actividad.</td></tr>`;
            return;
        }

        inscritos.forEach(asoc => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${asoc.documento}</td>
                <td class="fw-semibold">${asoc.nombres} ${asoc.apellidos}</td>
                <td><small>${asoc.email} / ${asoc.telefono ?? 'N/A'}</small></td>
            `;
            tbody.append(tr);
        });

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-3">Error al cargar datos: ${error.message}</td></tr>`;
    }
}

async function inscribirAActividad(idActividad) {
    if (!confirm("¿Deseas confirmar tu participación en esta actividad?")) return;

    try {
        const respuesta = await solicitarApi("POST", "", { accion: "inscribir", idActividad: idActividad });
        alert(respuesta.message || "Te has inscrito correctamente.");
        cargarActividades();
    } catch (error) {
        alert("Error al inscribirse: " + error.message);
    }
}

async function eliminarActividad(actividad) {
    const confirmar = window.confirm(`¿Desea eliminar la actividad "${actividad.nombreActividad}"?`);
    if (!confirmar) return;

    try {
        await solicitarApi("DELETE", "", { idActividad: actividad.idActividad });
        await cargarActividades();
        alert("Se eliminó correctamente");
    } catch (error) {
        alert(error.message);
    }
}

function configurarAcciones() {
    if (accionesConfiguradas) return;
    const botonNueva = document.getElementById("nuevaActividad");
    const encabezadoAcciones = document.getElementById("encabezadoAcciones");
    const textoEncabezado = document.getElementById("textoEncabezadoAcciones");

    if (encabezadoAcciones) encabezadoAcciones.classList.remove("d-none");

    if (esAdministrador) {
        if (botonNueva) botonNueva.classList.remove("d-none");
        if (textoEncabezado) textoEncabezado.textContent = "Acciones";
    } else {
        if (textoEncabezado) textoEncabezado.textContent = "Inscripción";
    }
    
    accionesConfiguradas = true;
}

function abrirEdicion(actividad) {
    formularioActividad.reset();
    document.getElementById("idActividad").value = actividad.idActividad;
    document.getElementById("nombreActividad").value = actividad.nombreActividad;
    document.getElementById("fechaEvento").value = actividad.fechaEvento;
    document.getElementById("municipio").value = actividad.municipio;
    document.getElementById("fechaLimite").value = actividad.fechaLimite ?? "";
    document.getElementById("totalRecaudado").value = actividad.totalRecaudado ?? "";

    document.getElementById("campoTotalRecaudado").classList.remove("d-none");
    document.getElementById("tituloModalActividad").textContent = "Editar Actividad y Recaudo";
    document.getElementById("guardarActividad").textContent = "Guardar Cambios";
    modalActividad.show();
}

document.getElementById("nuevaActividad")?.addEventListener("click", () => {
    formularioActividad.reset();
    document.getElementById("idActividad").value = "";
    document.getElementById("campoTotalRecaudado").classList.add("d-none");
    document.getElementById("tituloModalActividad").textContent = "Nueva Actividad";
    document.getElementById("guardarActividad").textContent = "Guardar Actividad";
});

formularioActividad.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const idActividad = document.getElementById("idActividad").value;

    const fechaEvento = document.getElementById("fechaEvento").value;
    const fechaLimite = document.getElementById("fechaLimite").value;
    const hoy = new Date().toISOString().split('T')[0];

    if (fechaLimite < hoy) {
        alert("La fecha límite de inscripción no puede ser anterior a hoy.");
        return;
    }

    const datos = {
        nombreActividad: document.getElementById("nombreActividad").value.trim(),
        fechaEvento: fechaEvento,
        fechaLimite: fechaLimite,
        municipio: document.getElementById("municipio").value.trim(),
    }
    
    if (idActividad) {
        datos.idActividad = Number(idActividad);
        const total = document.getElementById("totalRecaudado")?.value;
        datos.totalRecaudado = (total === "" || total === undefined) ? null : Number(total); 
    }

    try {
        await solicitarApi(idActividad ? "PUT" : "POST", "", datos); 
        modalActividad.hide();
        alert("Guardado correctamente");
        cargarActividades();
    } catch (error) { 
        alert(error.message);
    }
});