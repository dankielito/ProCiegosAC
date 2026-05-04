const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Model, Recognizer } = require('vosk');
const wav = require('wav');
const { translate } = require('google-translate-api-x');
const multer = require('multer');
const levenshtein = require('fast-levenshtein');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: 'Sonidos/' });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Carga del modelo Vosk
const modelPath = path.join(__dirname, 'model');
if (!fs.existsSync(modelPath)) {
    console.error("❌ Error: No se encuentra la carpeta 'model' en la raíz.");
    process.exit(1);
}

const model = new Model(modelPath);
console.log("✅ Servidor Pro-Ciegos A.C. iniciado correctamente.");

app.post('/evaluate-audio', upload.single('audio'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No se recibió audio" });

    const targetText = (req.body.targetText || "").toLowerCase().trim();
    const filePath = req.file.path;

    try {
        const wfReader = new wav.Reader();
        const wfReadable = fs.createReadStream(filePath);

        wfReader.on('format', (format) => {
            const rec = new Recognizer({ model: model, sampleRate: format.sampleRate });
            wfReader.on('data', (data) => rec.acceptWaveform(data));
            wfReader.on('end', async () => {
                const result = rec.finalResult();
                const spokenText = result.text.toLowerCase().trim();

                // Lógica de Precisión Estricta
                let score = 0;
                if (spokenText === targetText && targetText !== "") {
                    score = 100;
                } else if (spokenText !== "") {
                    const distance = levenshtein.get(targetText, spokenText);
                    const longestLength = Math.max(targetText.length, spokenText.length);
                    score = Math.round(((longestLength - distance) / longestLength) * 100);
                }

                // Traducción al español
                let translation = "Sin transcripción";
                if (spokenText) {
                    try {
                        const tr = await translate(spokenText, { to: 'es' });
                        translation = tr.text;
                    } catch (e) {
                        translation = "[Error en traducción]";
                    }
                }

                res.json({ 
                    spoken: spokenText || "No se detectó voz", 
                    accuracy: score,
                    espanol: translation 
                });

                rec.free();
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
        });
        wfReadable.pipe(wfReader);
    } catch (error) {
        console.error("Error procesando audio:", error);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.listen(PORT, () => console.log(`🚀 Accede a: http://localhost:${PORT}`));