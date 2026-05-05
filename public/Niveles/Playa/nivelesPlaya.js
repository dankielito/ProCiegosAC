// --- CONFIGURACIÓN DE VOCABULARIO ---
const VOCABULARIO = {
    1: ["Sun", "Sand", "Sea", "Shell", "Wave"],
    2: ["Fish", "Crab", "Shark", "Whale", "Gull"],
    3: ["Boat", "Mask", "Net", "Ball", "Palm"]
};

let appState = {
    indice: 0,
    nivel: new URLSearchParams(window.location.search).get('n') || 1,
    activo: false,
    audioContext: null,
    recorder: null,
    stream: null
};

const UI = {
    word: document.getElementById('target-word'),
    status: document.getElementById('status-text'),
    btn: document.getElementById('btn-record'),
    result: document.getElementById('result-area'),
    spoken: document.getElementById('spoken-text'),
    accuracy: document.getElementById('accuracy-val')
};

const Altavoz = {
    speak: (text, lang = 'en-US') => {
        return new Promise((resolve) => {
            window.speechSynthesis.cancel();
            const msg = new SpeechSynthesisUtterance(text);
            msg.lang = lang;
            msg.rate = 0.9;
            msg.onend = resolve;
            window.speechSynthesis.speak(msg);
        });
    }
};

async function iniciarJuego() {
    // Verificar si el usuario está logueado antes de empezar
    try {
        const res = await fetch('/api/user-data');
        const user = await res.json();
        if (!user.loggedIn) {
            Swal.fire("Error", "Debes iniciar sesión primero", "error").then(() => {
                window.location.href = '../../login.html';
            });
            return;
        }
        appState.activo = true;
        siguienteReto();
    } catch (e) {
        console.error("Error de sesión");
    }
}

async function siguienteReto() {
    const palabras = VOCABULARIO[appState.nivel];
    if (appState.indice >= palabras.length) return finalizarNivel();

    const palabraActual = palabras[appState.indice];
    UI.word.innerText = palabraActual;
    UI.status.innerText = "ESCUCHANDO...";
    UI.btn.classList.add('recording');

    await Altavoz.speak("Repite:", "es-MX");
    await Altavoz.speak(palabraActual, "en-US");
    capturarAudio(palabraActual);
}

async function capturarAudio(target) {
    try {
        appState.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        appState.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const source = appState.audioContext.createMediaStreamSource(appState.stream);
        appState.recorder = new Recorder(source, { numChannels: 1 });
        appState.recorder.record();

        setTimeout(() => procesarVoz(target), 3500);
    } catch (err) {
        UI.status.innerText = "MICRO NO DETECTADO";
    }
}

async function procesarVoz(target) {
    if (!appState.recorder) return;
    appState.recorder.stop();
    UI.btn.classList.remove('recording');
    UI.status.innerText = "PROCESANDO...";

    appState.recorder.exportWAV(async (blob) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64Audio = reader.result.split(',')[1];
            try {
                const response = await fetch('/evaluate-audio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ audioBase64: base64Audio, targetText: target })
                });

                const data = await response.json();
                
                if (data.error) throw new Error(data.error);

                // Mostrar resultados usando los nombres de tu server.js
                document.getElementById('result-area').style.display = "block";
                UI.spoken.innerText = data.spoken;
                UI.accuracy.innerText = data.accuracy;

                if (data.accuracy >= 75) {
                    appState.indice++;
                    await Altavoz.speak("¡Excelente!", "es-MX");
                    setTimeout(siguienteReto, 1000);
                } else {
                    await Altavoz.speak("Inténtalo de nuevo", "es-MX");
                    setTimeout(siguienteReto, 1000);
                }
            } catch (err) {
                console.error(err);
                UI.status.innerText = "SESIÓN EXPIRADA O ERROR";
            } finally {
                if (appState.stream) appState.stream.getTracks().forEach(t => t.stop());
                if (appState.audioContext) appState.audioContext.close();
            }
        };
    });
}

function finalizarNivel() {
    Swal.fire("¡Nivel Completado!", "Has ganado XP y Gemas", "success").then(async () => {
        // Opcional: Actualizar progreso en DB
        await fetch('/api/update-progress', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ xp: 50, gemas: 10 })
        });
        window.location.href = '../../dashboard.html';
    });
}

window.onload = () => {
    Swal.fire({
        title: 'Práctica de Playa',
        text: '¿Listo para practicar tu pronunciación?',
        icon: 'info',
        confirmButtonText: '¡Vamos!'
    }).then(iniciarJuego);
};