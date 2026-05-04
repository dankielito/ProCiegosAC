// js/planes.js

const detallesPlanes = {
    basico: {
        titulo: "Plan Básico",
        descripcion: "Ideal para iniciar tu camino en el aprendizaje inclusivo.",
        detalles: [
            "10 lecciones diarias interactivas",
            "Reconocimiento de voz estándar",
            "Acceso a la comunidad Pro-Ciegos",
            "Soporte técnico vía email"
        ]
    },
    pro: {
        titulo: "Plan Pro",
        descripcion: "Nuestra opción más equilibrada para un aprendizaje intensivo.",
        detalles: [
            "Lecciones ilimitadas 24/7",
            "IA de análisis fonético avanzado",
            "Reportes de progreso mensuales",
            "Soporte prioritario"
        ]
    },
    premium: {
        titulo: "Plan Premium",
        descripcion: "La experiencia completa de accesibilidad e innovación.",
        detalles: [
            "Todo lo incluido en el Plan Pro",
            "Tutoría personalizada con IA",
            "Certificación oficial de aprovechamiento",
            "Modo offline y descarga de materiales"
        ]
    }
};

function abrirModalPlan(planKey) {
    const plan = detallesPlanes[planKey];
    
    // Crear el fondo del modal
    const overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.8); display: flex; justify-content: center;
        align-items: center; z-index: 2000; backdrop-filter: blur(5px);
    `;

    // Crear el contenedor blanco
    const modal = document.createElement('div');
    modal.style = `
        background: #FFFFFF; width: 90%; max-width: 500px;
        padding: 40px; border-radius: 20px; border: 3px solid #D4AF37;
        box-shadow: 0 10px 50px rgba(0,0,0,0.5); text-align: center;
        position: relative; animation: modalPop 0.3s ease-out;
    `;

    const listaDetalles = plan.detalles.map(d => 
        `<li style="margin: 10px 0; color: #001F3F; font-weight: 500;">
            <i class="fa-solid fa-star" style="color: #D4AF37; margin-right: 10px;"></i>${d}
        </li>`
    ).join('');

    modal.innerHTML = `
        <h2 style="color: #001F3F; font-size: 2rem; margin-bottom: 10px; font-weight: 800;">${plan.titulo}</h2>
        <p style="color: #718096; margin-bottom: 25px;">${plan.descripcion}</p>
        <ul style="list-style: none; padding: 0; margin-bottom: 30px; text-align: left;">
            ${listaDetalles}
        </ul>
        <div style="display: flex; gap: 15px; justify-content: center;">
            <button onclick="cerrarModal()" style="padding: 12px 25px; border-radius: 10px; border: 1px solid #CBD5E0; background: #EDF2F7; cursor: pointer; font-weight: 600;">Cerrar</button>
            <a href="login.html" style="padding: 12px 25px; border-radius: 10px; background: #001F3F; color: #D4AF37; text-decoration: none; font-weight: 800; border: 1px solid #D4AF37;">Continuar</a>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function cerrarModal() {
    const modal = document.getElementById('modal-overlay');
    if (modal) modal.remove();
}

// Cerrar al hacer click fuera
window.onclick = function(event) {
    const overlay = document.getElementById('modal-overlay');
    if (event.target == overlay) cerrarModal();
}