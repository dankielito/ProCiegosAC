class ProCiegosAudio {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
    }

    /**
     * Configura el micrófono con los parámetros óptimos para Vosk (16000Hz, Mono)
     */
    async getMicrophone() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            return this.stream;
        } catch (err) {
            console.error("Error accediendo al micrófono:", err);
            return null;
        }
    }

    /**
     * Inicia la grabación capturando los fragmentos de audio
     */
    startRecording() {
        this.audioChunks = [];
        
        // Intentamos usar audio/webm que es ampliamente soportado en navegadores modernos
        const options = { mimeType: 'audio/webm' };
        
        try {
            this.mediaRecorder = new MediaRecorder(this.stream, options);
        } catch (e) {
            // Fallback para navegadores que no soportan webm específicamente
            this.mediaRecorder = new MediaRecorder(this.stream);
        }

        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                this.audioChunks.push(e.data);
            }
        };

        this.mediaRecorder.start();
        console.log("Grabación iniciada...");
    }

    /**
     * Detiene la grabación y devuelve un Promise con el Blob de audio
     */
    stopRecording() {
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                // Creamos el blob final. El servidor lo recibirá como Buffer vía Base64
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                console.log("Grabación finalizada. Tamaño del blob:", audioBlob.size);
                resolve(audioBlob);
            };

            this.mediaRecorder.stop();
        });
    }

    /**
     * Limpia los recursos del micrófono si es necesario
     */
    stopStream() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }
}