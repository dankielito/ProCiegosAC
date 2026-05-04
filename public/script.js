let audioContext;
let recorder;
let gumStream;
let animationId; // Para el vúmetro

const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const textIngles = document.getElementById('textIngles');
const textEspanol = document.getElementById('textEspanol');

// Creamos un pequeño vúmetro visual en el botón de grabar
const createVisualizer = (stream) => {
    const source = audioContext.createMediaStreamSource(stream);
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    source.connect(analyzer);

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const update = () => {
        analyzer.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }
        let average = sum / bufferLength;
        // Cambiamos el brillo del botón según el volumen
        stopBtn.style.boxShadow = `0 0 ${average}px rgba(255, 75, 43, 0.8)`;
        animationId = requestAnimationFrame(update);
    };
    update();
};

recordBtn.onclick = async () => {
    textIngles.innerText = "Escuchando...";
    textEspanol.innerText = "---";
    
    try {
        // Configuramos el micro para que NO use filtros del navegador
        // Esto es vital para interfaces como Scarlett
        const constraints = { 
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false, // Dejamos que la Scarlett mande la señal pura
                sampleRate: 16000
            } 
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        gumStream = stream;
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const input = audioContext.createMediaStreamSource(stream);
        
        // Recorder.js a 1 solo canal (Mono) para Vosk
        recorder = new Recorder(input, { numChannels: 1 });
        recorder.record();

        createVisualizer(stream);

        recordBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
    } catch (err) {
        alert("Error de acceso al micro: " + err);
        console.error(err);
    }
};

stopBtn.onclick = () => {
    cancelAnimationFrame(animationId);
    recorder.stop();
    gumStream.getAudioTracks()[0].stop(); 
    
    recordBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    stopBtn.style.boxShadow = "none";

    textIngles.innerText = "Procesando...";

    recorder.exportWAV((blob) => {
        const formData = new FormData();
        formData.append('audio', blob, 'mic_record.wav');

        fetch('/upload-audio', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (!data.ingles || data.ingles.trim() === "") {
                textIngles.innerText = "[No se detectó voz clara]";
                textEspanol.innerText = "Revisa el nivel de ganancia en tu Scarlett";
            } else {
                textIngles.innerText = data.ingles;
                textEspanol.innerText = data.espanol;
            }
        })
        .catch(err => {
            console.error("Error en Fetch:", err);
            textIngles.innerText = "Error de conexión con el servidor";
        });
    });
};