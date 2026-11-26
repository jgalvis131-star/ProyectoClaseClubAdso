const listaAsociados = document.getElementById("listaAsociados");
const modalAsociado = new bootstrap.Modal(document.getElementById("modalAsociado"));
const formAsociado = document.getElementById("formAsociado");
const toastAsociado = new bootstrap.Toast(document.getElementById("toastAsociado"));
const mensajeAsociados = document.getElementById("mensajeAsociados");

let esAdministrador = false;

document.addEventListener("DOMContentLoaded", () => {
    cargarAsociados();
});

async function solicitarApi(metodo, datos = null) {
    const opciones = {
        method: metodo,
        headers: { 'Content-Type': 'application/json' }
    };

    if (datos) {
        opciones.body = JSON.stringify(datos);
    }

    const respuesta = await fetch("../Modelos/gestionarAsociados.php", opciones);
    
    if (respuesta.status === 401) {
        window.location.href = "../Vista/login.html";
        return;
    }

    const textoRespuesta = await respuesta.text();
    try {
        return JSON.parse(textoRespuesta);
    } catch (e) {
        throw new Error("El servidor no devolvió un JSON válido. Revisa el archivo PHP.");
    }
}

async function cargarAsociados() {
    try {
        const resultado = await solicitarApi("GET");
        
        if (!resultado.success) {
            throw new Error(resultado.message || "Error al obtener los datos");
        }

        esAdministrador = (resultado.rol === "admin");
        configurarAccionesAdmin();
        mostrarAsociados(resultado.asociados);

    } catch (error) {
        console.error("Error:", error);
        listaAsociados.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error: ${error.message}</td></tr>`;
    }
}

function configurarAccionesAdmin() {
    const botonNuevo = document.getElementById("nuevoAsociado");
    const encabezadoAcciones = document.getElementById("encabezadoAcciones");

    if (esAdministrador) {
        if (botonNuevo) botonNuevo.classList.remove("d-none");
        if (encabezadoAcciones) encabezadoAcciones.classList.remove("d-none");
    }
}

function mostrarAsociados(asociados) {
    listaAsociados.replaceChildren();

    if (!asociados || asociados.length === 0) {
        const colSpan = esAdministrador ? 6 : 5;
        listaAsociados.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-4 text-muted">No hay asociados registrados.</td></tr>`;
        return;
    }

    asociados.forEach((asociado) => {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td class="ps-4 fw-semibold">${asociado.nombres}</td>
            <td>${asociado.apellidos}</td>
            <td>${asociado.documento}</td>
            <td>${asociado.email}</td>
            <td>${asociado.telefono ?? "No registrado"}</td>
        `;

        if (esAdministrador) {
            const tdAcciones = document.createElement("td");
            tdAcciones.className = "text-center text-nowrap";

            const btnEditar = document.createElement("button");
            btnEditar.className = "btn btn-sm btn-outline-primary me-1";
            btnEditar.innerHTML = '<i class="bi bi-pencil-square"></i>';
            btnEditar.onclick = () => abrirEdicion(asociado);

            const btnEliminar = document.createElement("button");
            btnEliminar.className = "btn btn-sm btn-outline-danger";
            btnEliminar.innerHTML = '<i class="bi bi-trash"></i>';
            btnEliminar.onclick = () => eliminarAsociado(asociado.idAsociado);

            tdAcciones.append(btnEditar, btnEliminar);
            fila.append(tdAcciones);
        }

        listaAsociados.append(fila);
    });
}

function abrirEdicion(asociado) {
    formAsociado.reset();
    document.getElementById("idAsociado").value = asociado.idAsociado;
    document.getElementById("nombres").value = asociado.nombres;
    document.getElementById("apellidos").value = asociado.apellidos;
    document.getElementById("documento").value = asociado.documento;
    document.getElementById("email").value = asociado.email;
    document.getElementById("telefono").value = asociado.telefono ?? "";

    document.getElementById("tituloModalAsociado").textContent = "Editar Asociado";
    document.getElementById("guardarAsociado").textContent = "Guardar Cambios";
    modalAsociado.show();
}

async function eliminarAsociado(idAsociado) {
    if (!confirm("¿Deseas eliminar este asociado?")) return;

    try {
        const resultado = await solicitarApi("DELETE", { idAsociado });
        mensajeAsociados.textContent = resultado.message || "Eliminado correctamente";
        toastAsociado.show();
        cargarAsociados();
    } catch (error) {
        alert("Error al eliminar: " + error.message);
    }
}

formAsociado.addEventListener("submit", async (e) => {
    e.preventDefault();
    const idAsociado = document.getElementById("idAsociado").value;

    const datos = {
        nombres: document.getElementById("nombres").value.trim(),
        apellidos: document.getElementById("apellidos").value.trim(),
        documento: document.getElementById("documento").value.trim(),
        email: document.getElementById("email").value.trim(),
        telefono: document.getElementById("telefono").value.trim()
    };

    if (idAsociado) {
        datos.idAsociado = Number(idAsociado);
    }

    try {
        const metodo = idAsociado ? "PUT" : "POST";
        const resultado = await solicitarApi(metodo, datos);
        
        modalAsociado.hide();
        mensajeAsociados.textContent = resultado.message || "Guardado exitosamente";
        toastAsociado.show();
        cargarAsociados();
    } catch (error) {
        alert("Error al guardar: " + error.message);
    }
});