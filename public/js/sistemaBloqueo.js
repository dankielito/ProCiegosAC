// Inicializamos el progreso y recompensas
let nivelProgreso = parseInt(localStorage.getItem('nivelProgreso')) || 1;
let xpActual = parseInt(localStorage.getItem('xpTotal')) || 0;
let gemasActual = parseInt(localStorage.getItem('gemasTotal')) || 0;

function verificarNiveles() {
    const botones = document.querySelectorAll('.level-btn');
    
    // Actualizar HUD visualmente
    document.getElementById('xp-count').innerText = xpActual;
    document.getElementById('gem-count').innerText = gemasActual;

    botones.forEach(boton => {
        const nivelBoton = parseInt(boton.getAttribute('data-level'));
        
        if (nivelBoton < nivelProgreso) {
            boton.classList.add('completed');
            boton.innerHTML = '<i class="fas fa-check"></i>';
        } else if (nivelBoton === nivelProgreso) {
            boton.classList.add('current');
            boton.innerHTML = nivelBoton;
        } else {
            boton.classList.add('locked');
            boton.innerHTML = '<i class="fas fa-lock"></i>';
            boton.onclick = (e) => {
                e.preventDefault();
                Swal.fire({
                    icon: 'error',
                    title: '¡Nivel bloqueado!',
                    text: 'Debes completar los desafíos anteriores.',
                    confirmButtonColor: '#001F3F'
                });
            };
        }
    });
}

// Función para subir nivel y dar recompensas
function finalizarNivel(xpGanada, gemasGanadas) {
    nivelProgreso++;
    xpActual += xpGanada;
    gemasActual += gemasGanadas;

    localStorage.setItem('nivelProgreso', nivelProgreso);
    localStorage.setItem('xpTotal', xpActual);
    localStorage.setItem('gemasTotal', gemasActual);
}