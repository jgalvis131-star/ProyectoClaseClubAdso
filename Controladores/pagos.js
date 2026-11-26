let esAdminGlobal = false;
const modalPago = new bootstrap.Modal(document.getElementById("modalPago"));
const modalDetalles = new bootstrap.Modal(document.getElementById("modalDetallesPrestamo"));
let listaGlobalPagos = [];

document.addEventListener("DOMContentLoaded", () => {
    cargarDatosGenerales();
    const hoy = new Date().toISOString().split('T')[0];
    const inputFechaPago = document.getElementById('fechaPago');
    if (inputFechaPago) {
        inputFechaPago.value = hoy;
        inputFechaPago.min = hoy; // Bloquear fechas pasadas en pagos
    }
});

async function cargarDatosGenerales() {
    await cargarHistorialPagos();
    await cargarPrestamosAsociado();
}

async function cargarHistorialPagos() {
    const tablaPagos = document.getElementById("tablaPagos");
    const seccionHistorial = document.getElementById("seccionHistorialAsociado");

    try {
        const respuesta = await fetch("../Modelos/gestionarPagos.php");
        const resultado = await respuesta.json();
        
        if (resultado.success) {
            listaGlobalPagos = resultado.pagos;
        }

        if (esAdminGlobal) {
            if (seccionHistorial) seccionHistorial.style.display = "none";
            return;
        } else {
            if (seccionHistorial) seccionHistorial.style.display = "block";
        }

        tablaPagos.replaceChildren();

        if (!resultado.success || resultado.pagos.length === 0) {
            tablaPagos.innerHTML = `<tr><td colspan="2" class="text-center text-muted py-4">No tienes pagos registrados.</td></tr>`;
            return;
        }

        resultado.pagos.forEach(pago => {
            const fila = document.createElement("tr");
            const valorFormateado = Number(pago.valorCuota).toLocaleString("es-CO", { 
                style: "currency", 
                currency: "COP" 
            });

            fila.innerHTML = `
                <td class="fw-semibold text-success">${valorFormateado}</td>
                <td>${pago.fechaPago}</td>
            `;
            tablaPagos.append(fila);
        });

    } catch (error) {
        console.error("Error historial:", error);
    }
}

async function cargarPrestamosAsociado() {
    const tablaPrestamos = document.getElementById("tablaMisPrestamos");
    const encabezado = document.getElementById("encabezadoTablaPrestamos");
    const subtitulo = document.getElementById("subtituloPrestamos");

    try {
        const respuesta = await fetch("../Modelos/gestionarPrestamos.php");
        const resultado = await respuesta.json();

        if (!resultado.success) {
            throw new Error(resultado.message || "Error al cargar los préstamos.");
        }

        esAdminGlobal = (resultado.rol === "admin");

        if (esAdminGlobal) {
            subtitulo.textContent = "Gestión de Préstamos y Pagos de Asociados";
            encabezado.innerHTML = `
                <th>Asociado</th>
                <th>Valor Préstamo</th>
                <th>Tasa</th>
                <th>Cuotas</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th class="text-center">Acciones / Detalles</th>
            `;
        } else {
            subtitulo.textContent = "Mis Préstamos Activos y Aprobados";
            encabezado.innerHTML = `
                <th>Valor Préstamo</th>
                <th>Tasa Interés</th>
                <th>Cuotas</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
            `;
        }

        cargarHistorialPagos();
        tablaPrestamos.replaceChildren();

        if (resultado.prestamos.length === 0) {
            const colSpan = esAdminGlobal ? 7 : 6;
            tablaPrestamos.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-4 text-muted">No hay préstamos registrados.</td></tr>`;
            return;
        }

        resultado.prestamos.forEach(prestamo => {
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

            if (esAdminGlobal) {
                fila.innerHTML = `
                    <td class="fw-semibold">${prestamo.nombres} ${prestamo.apellidos}</td>
                    <td>${valorFormateado}</td>
                    <td>${prestamo.tasaInteres}%</td>
                    <td>${prestamo.numeroCuotas}</td>
                    <td>${prestamo.fechaPrestamo}</td>
                    <td>${badgeEstado}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary" title="Ver detalles y pagos" onclick='verDetallesPrestamo(${JSON.stringify(prestamo)})'>
                            <i class="bi bi-eye-fill"></i> Ver Detalles
                        </button>
                    </td>
                `;
            } else {
                let botonAccion = '<span class="text-muted small">Esperando aprobación</span>';
                if (prestamo.estado === 'Aprobado') {
                    botonAccion = `<button class="btn btn-sm btn-success" onclick="abrirModalPago(${prestamo.idPrestamo})">
                                       <i class="bi bi-cash"></i> Pagar Cuota
                                   </button>`;
                }

                fila.innerHTML = `
                    <td>${valorFormateado}</td>
                    <td>${prestamo.tasaInteres}%</td>
                    <td>${prestamo.numeroCuotas}</td>
                    <td>${prestamo.fechaPrestamo}</td>
                    <td>${badgeEstado}</td>
                    <td>${botonAccion}</td>
                `;
            }

            tablaPrestamos.append(fila);
        });

    } catch (error) {
        console.error("Error:", error);
        tablaPrestamos.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">Error al cargar la información.</td></tr>`;
    }
}

function verDetallesPrestamo(prestamo) {
    document.getElementById("detAsociado").textContent = `${prestamo.nombres} ${prestamo.apellidos} (Doc: ${prestamo.documento || 'N/A'})`;
    document.getElementById("detValor").textContent = Number(prestamo.valorPrestamo).toLocaleString("es-CO", { style: "currency", currency: "COP" });
    document.getElementById("detTasa").textContent = `${prestamo.tasaInteres}%`;
    document.getElementById("detCuotas").textContent = prestamo.numeroCuotas;
    document.getElementById("detEstado").textContent = prestamo.estado;

    const abonosDelPrestamo = listaGlobalPagos.filter(p => p.idPrestamo == prestamo.idPrestamo);
    const tablaAbonos = document.getElementById("tablaAbonosDetalle");
    const lblTotalPagado = document.getElementById("detTotalPagado");

    tablaAbonos.replaceChildren();
    let sumaAcumulada = 0;

    if (abonosDelPrestamo.length === 0) {
        tablaAbonos.innerHTML = `<tr><td colspan="2" class="text-center text-muted">Este préstamo aún no registra abonos.</td></tr>`;
    } else {
        abonosDelPrestamo.forEach(abono => {
            sumaAcumulada += Number(abono.valorCuota);
            const filaAbono = document.createElement("tr");
            const valorAbonoFormateado = Number(abono.valorCuota).toLocaleString("es-CO", { style: "currency", currency: "COP" });
            filaAbono.innerHTML = `
                <td class="text-success fw-semibold">${valorAbonoFormateado}</td>
                <td>${abono.fechaPago}</td>
            `;
            tablaAbonos.append(filaAbono);
        });
    }

    lblTotalPagado.textContent = sumaAcumulada.toLocaleString("es-CO", { style: "currency", currency: "COP" });
    modalDetalles.show();
}

function abrirModalPago(idPrestamo) {
    document.getElementById("idPrestamoSeleccionado").value = idPrestamo;
    document.getElementById("valorPago").value = "";
    modalPago.show();
}

document.getElementById("formRegistrarPago").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const datosPago = {
        idPrestamo: document.getElementById("idPrestamoSeleccionado").value,
        valorCuota: Number(document.getElementById("valorPago").value),
        fechaPago: document.getElementById("fechaPago").value
    };

    try {
        const respuesta = await fetch("../Modelos/gestionarPagos.php", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosPago)
        });

        const resultado = await respuesta.json();
        if (!respuesta.ok || !resultado.success) {
            throw new Error(resultado.message || "No se pudo registrar el pago.");
        }

        alert(resultado.message);
        modalPago.hide();
        cargarDatosGenerales();
    } catch (error) {
        alert("Aviso: " + error.message);
    }
});