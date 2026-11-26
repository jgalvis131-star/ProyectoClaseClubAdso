const formregistro = document.getElementById('formRegistroAsociado');

formregistro.addEventListener('submit', async function (e) {
    e.preventDefault();
    const botonGuardar = formregistro.querySelector('button[type="submit"]');
    const asociado = Object.fromEntries(new FormData(formregistro).entries());
    
    if(asociado.contraseña !== asociado.confirmarContraseña) {
        document.getElementById("mensajeRegistro").textContent = "Las contraseñas no coinciden.";
        return;
    }

    delete asociado.confirmarContraseña; 

    botonGuardar.disabled = true; 
    document.getElementById('mensajeRegistro').textContent = 'Guardando...';
    document.getElementById('mensajeRegistro').dataset.tipo = '';

    try {
        const respuesta = await fetch(formregistro.action, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(asociado)
        });
        
        const resultado = await respuesta.json();
        document.getElementById('mensajeRegistro').textContent = resultado.mensaje;

        if (respuesta.ok && resultado.success) {
            formregistro.reset(); 
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('mensajeRegistro').textContent = 'Error al guardar los datos.';
    } finally {
        botonGuardar.disabled = false; 
    }
});