const infoPerfil = document.getElementById("infoPerfil");
const modalEditar = new bootstrap.Modal(document.getElementById("modalEditarPerfil"));
const formEditar = document.getElementById("formEditarPerfil");
const btnEditarModal = document.getElementById("btnEditarModal");

let datosUsuarioActual = {};

async function solicitarApi(metodo, datos = null) {
    const opciones = {
        method: metodo,
        headers: { 'Content-Type': 'application/json' }
    };

    if (datos) {
        opciones.body = JSON.stringify(datos);
    }
    
    const respuesta = await fetch("../Modelos/gestionarPerfil.php", opciones);
    
    if (respuesta.status === 401) {
        window.location.href = "../Vista/login.html";
        return;
    }

    const textoRespuesta = await respuesta.text();
    if (!textoRespuesta) {
        throw new Error("El servidor respondió con un contenido vacío.");
    }

    const resultado = JSON.parse(textoRespuesta);
    
    if (!respuesta.ok || !resultado.success) {
        throw new Error(resultado.message || "Error en la solicitud");
    }
    
    return resultado;
}

async function cargarPerfil() {
    try {
        const resultado = await solicitarApi("GET");
        datosUsuarioActual = resultado.usuario;
        
        mostrarPerfil(datosUsuarioActual);
        prepararModalEdicion(datosUsuarioActual);
        btnEditarModal.removeAttribute("disabled");

    } catch (error) {
        infoPerfil.innerHTML = `<div class="col-12"><div class="alert alert-danger text-center">Error al cargar el perfil: ${error.message}</div></div>`;
    }
}

function mostrarPerfil(usuario) {
    infoPerfil.replaceChildren();

    const campos = [
        { etiqueta: "Nombres", valor: usuario.nombres },
        { etiqueta: "Apellidos", valor: usuario.apellidos },
        { etiqueta: "Documento", valor: usuario.documento },
        { etiqueta: "Correo Electrónico", valor: usuario.email },
        { etiqueta: "Teléfono", valor: usuario.telefono ?? "No registrado" },
        { etiqueta: "Fecha de Nacimiento", valor: usuario.fechaNacimiento ?? "No registrada" },
        { etiqueta: "Género", valor: usuario.genero ?? "No especificado" },
        { etiqueta: "Ciudad", valor: usuario.ciudad ?? "No registrada" },
        { etiqueta: "Dirección de Residencia", valor: usuario.direccionResidencia ?? "No registrada" }
    ];

    campos.forEach((campo) => {
        const div = document.createElement("div");
        div.className = "col-md-6 mb-3";
        div.innerHTML = `
            <div class="p-3 border rounded bg-white shadow-sm h-100">
                <small class="text-muted d-block fw-bold">${campo.etiqueta}</small>
                <span class="fs-6 text-dark">${campo.valor}</span>
            </div>
        `;
        infoPerfil.append(div);
    });
}

function prepararModalEdicion(usuario) {
    document.getElementById("editEmail").value = usuario.email ?? "";
    document.getElementById("editTelefono").value = usuario.telefono ?? "";
    document.getElementById("editCiudad").value = usuario.ciudad ?? "";
    document.getElementById("editDireccion").value = usuario.direccionResidencia ?? "";
}

formEditar.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const datosActualizados = {
        email: document.getElementById("editEmail").value.trim(),
        telefono: document.getElementById("editTelefono").value.trim(),
        ciudad: document.getElementById("editCiudad").value.trim(),
        direccionResidencia: document.getElementById("editDireccion").value.trim()
    };

    try {
        const resultado = await solicitarApi("PUT", datosActualizados);
        modalEditar.hide();
        alert(resultado.message || "Perfil actualizado correctamente");
        cargarPerfil(); 
    } catch (error) {
        alert("Error al actualizar: " + error.message);
    }
});

cargarPerfil();