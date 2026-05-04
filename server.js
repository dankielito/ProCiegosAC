const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Model, Recognizer } = require('vosk');
const wav = require('wav');
const { translate } = require('google-translate-api-x');
const multer = require('multer'); // Para recibir audio del navegador
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Multer (Almacenamiento temporal de grabaciones)
const upload = multer({ dest: 'Sonidos/' });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Para servir index.html y script.js

// 1. Configuración de Rutas y Modelo
const modelPath = path.join(__dirname, 'model');
const sonidosPath = path.join(__dirname, 'Sonidos');

if (!fs.existsSync(sonidosPath)) {
    fs.mkdirSync(sonidosPath);
}

if (!fs.existsSync(modelPath)) {
    console.error("❌ Error: No se encuentra la carpeta 'model'.");
    process.exit(1);
}

const model = new Model(modelPath);
console.log("✅ Modelo de Vosk cargado correctamente.");

// --- RUTAS ---

// Status para el equipo
app.get('/status', (req, res) => {
    res.json({ 
        mensaje: "Sistema Pro-Ciegos A.C. en línea",
        equipo: ["Alexis", "Cass", "Eduardo"],
        fase: "2.0 - Captura de Micrófono" 
    });
});

/**
 * RUTA PARA EL MICRÓFONO (NUEVA)
 * Recibe el audio desde el navegador, lo transcribe y traduce.
 */
app.post('/upload-audio', upload.single('audio'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No se recibió audio." });

    const filePath = req.file.path;

    try {
        const wfReader = new wav.Reader();
        const wfReadable = fs.createReadStream(filePath);

        // Parche para evitar el error 'dest.destroy is not a function' en Node.js
        wfReader.on('error', (err) => {
            console.log("⚠️ Flujo de audio finalizado o corregido.");
        });

        wfReader.on('format', (format) => {
            console.log(`🎙️ Procesando Mic: ${format.sampleRate}Hz, ${format.channels} canal(es)`);
            const rec = new Recognizer({ model: model, sampleRate: format.sampleRate });
            
            wfReader.on('data', (data) => rec.acceptWaveform(data));

            wfReader.on('end', async () => {
                const result = rec.finalResult();
                const textoIngles = result.text;
                let textoEspanol = "";

                if (textoIngles && textoIngles.trim() !== "") {
                    try {
                        const translation = await translate(textoIngles, { to: 'es' });
                        textoEspanol = translation.text;
                    } catch (e) { textoEspanol = "[Error de traducción]"; }
                }

                console.log(`📝 MIC -> EN: ${textoIngles} | ES: ${textoEspanol}`);
                
                res.json({ ingles: textoIngles, espanol: textoEspanol });
                rec.free();

                // Borramos el archivo temporal para no llenar el disco D:
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
        });

        wfReadable.pipe(wfReader);

    } catch (error) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ error: "Error procesando audio del micro." });
    }
});

/**
 * RUTA PARA ARCHIVO LOCAL (TEST.WAV)
 */
app.post('/recognize', (req, res) => {
    const filePath = path.join(sonidosPath, 'test.wav');

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "No se encontró test.wav" });
    }

    const wfReader = new wav.Reader();
    const wfReadable = fs.createReadStream(filePath);

    wfReader.on('format', (format) => {
        const rec = new Recognizer({ model: model, sampleRate: format.sampleRate });
        wfReader.on('data', (data) => rec.acceptWaveform(data));
        wfReader.on('end', async () => {
            const result = rec.finalResult();
            const translation = await translate(result.text, { to: 'es' });
            res.json({ ingles: result.text, espanol: translation.text });
            rec.free();
        });
    });

    wfReadable.pipe(wfReader);
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor en: http://localhost:${PORT}`);
});