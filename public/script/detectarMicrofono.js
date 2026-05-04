import { Altavoz } from './altavoz.js';
import { LogicaMicrofono } from './logicaMicrofono.js';

let audioContext, recorder, gumStream, silenceTimer;
let currentTarget = "";
let modoActual = "Palabras"; // Modo por defecto
let sistemaActivo = false;

const targetDisplay = document.getElementById('targetDisplay');
const textIngles = document.getElementById('textIngles');
const textEspanol = document.getElementById('textEspanol');

// Función para cargar contenido (Palabras u Oraciones)
async function cargarNuevoReto() {
    if (!sistemaActivo) return;

    const path = `../Diccionario/${modoActual}.js`;
    try {
        const module = await import(path);
        const data = module.default;
        currentTarget = data[Math.floor(Math.random() * data.length)];
        
        targetDisplay.innerHTML = `Repite: <span style="color: #4facfe;">${currentTarget}</span>`;
        
        await Altavoz.notificar("Escucha y repite:");
        await Altavoz.decirObjetivo(currentTarget);
        
        iniciarEscucha();
    } catch (err) {
        console.error("Error al cargar diccionario:", err);
        await Altavoz.notificar("Error al cargar los archivos de práctica.");
    }
}

// Bucle de Escucha Activa (Siempre Abierto)
async function iniciarEscucha() {
    if (!sistemaActivo) return;

    try {
        playBeep(880, 0.15); // Luz verde sonora

        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 16000 } 
        });
        
        gumStream = stream;
        audioContext = new AudioContext({ sampleRate: 16000 });
        const input = audioContext.createMediaStreamSource(stream);
        recorder = new Recorder(input, { numChannels: 1 });
        recorder.record();

        const analyzer = audioContext.createAnalyser();
        input.connect(analyzer);
        const pcmData = new Float32Array(analyzer.fftSize);
        
        const monitorizarSilencio = () => {
            if (!gumStream || !gumStream.active) return;
            analyzer.getFloatTimeDomainData(pcmData);
            let sumSquares = 0.0;
            for (const amplitude of pcmData) { sumSquares += amplitude * amplitude; }
            let volumen = Math.sqrt(sumSquares / pcmData.length);

            // Si detecta silencio prolongado, procesa automáticamente
            if (volumen < 0.012) {
                if (!silenceTimer) silenceTimer = setTimeout(procesarAudio, 1800);
            } else {
                clearTimeout(silenceTimer);
                silenceTimer = null;
            }
            requestAnimationFrame(monitorizarSilencio);
        };
        monitorizarSilencio();
    } catch (e) {
        console.error("Error de micro:", e);
    }
}

async function procesarAudio() {
    if (!recorder) return;
    recorder.stop();
    if (gumStream) gumStream.getAudioTracks()[0].stop();
    playBeep(440, 0.1); 

    recorder.exportWAV(async (blob) => {
        const formData = new FormData();
        formData.append('audio', blob, 'capture.wav');
        formData.append('targetText', currentTarget);

        try {
            const response = await fetch('/evaluate-audio', { method: 'POST', body: formData });
            const data = await response.json();

            // Mostrar resultados en pantalla para el guía
            textIngles.innerHTML = `<strong>Diste:</strong> "${data.spoken}" (${data.accuracy}%)`;
            textEspanol.innerHTML = `<strong>Traducción:</strong> ${data.espanol}`;

            // 1. Verificar si el usuario pidió un cambio de modo o detenerse
            const accion = await LogicaMicrofono.procesarComando(data.spoken, (nuevoModo) => {
                modoActual = nuevoModo;
                cargarNuevoReto();
            });

            if (accion === "DETENER") {
                sistemaActivo = false;
                return;
            }
            if (accion === "CAMBIO_MODO") return;

            // 2. Evaluación de pronunciación
            if (data.accuracy === 100) {
                await Altavoz.notificar("¡Excelente! Muy bien hecho.");
                setTimeout(cargarNuevoReto, 800);
            } else {
                await Altavoz.notificar(`Dijiste ${data.spoken}. Tu precisión fue del ${data.accuracy} por ciento.`);
                await Altavoz.notificar("Inténtalo de nuevo. La palabra es:");
                await Altavoz.decirObjetivo(currentTarget);
                iniciarEscucha(); // Reintento automático
            }
        } catch (err) {
            console.error("Error servidor:", err);
            iniciarEscucha(); // Reiniciar en caso de error de red
        }
    });
}

function playBeep(freq, duration) {
    const context = new AudioContext();
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.connect(gain);
    gain.connect(context.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.05, context.currentTime);
    osc.start();
    osc.stop(context.currentTime + duration);
}

// Inicio por teclado para accesibilidad total
window.onload = async () => {
    targetDisplay.innerText = "Presiona cualquier tecla para iniciar el asistente";
    
    const iniciarSistema = async () => {
        if (sistemaActivo) return;
        window.speechSynthesis.getVoices(); // Precarga de voces
        sistemaActivo = true;
        await Altavoz.notificar("Bienvenido al asistente de voz. Actualmente estamos en modo palabras. Puedes decir: oraciones, palabras o detener.");
        cargarNuevoReto();
        window.removeEventListener('keydown', iniciarSistema);
        window.removeEventListener('click', iniciarSistema);
    };

    window.addEventListener('keydown', iniciarSistema);
    window.addEventListener('click', iniciarSistema); // También por clic por si acaso
};