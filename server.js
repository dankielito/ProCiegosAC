const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Model, Recognizer } = require('vosk');
const wav = require('wav');
const { translate } = require('google-translate-api-x');
const multer = require('multer');
const levenshtein = require('fast-levenshtein');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de almacenamiento para audios
if (!fs.existsSync('Sonidos/')) {
    fs.mkdirSync('Sonidos/');
}
const upload = multer({ dest: 'Sonidos/' });

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Carpeta para tus .html, .css y .js

// Configuración de Sesiones
app.use(session({
    secret: 'pro-ciegos-aesthetic-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Cambiar a true si usas HTTPS
        maxAge: 1000 * 60 * 60 * 24 // 24 horas
    } 
}));

// --- CONFIGURACIÓN DE BASE DE DATOS (SQLite) ---
let db;
(async () => {
    db = await open({
        filename: './prociegos.db', // Nombre actualizado a tu solicitud
        driver: sqlite3.Database
    });

    // Aseguramos que la tabla exista (por si borras el archivo .db por accidente)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    `);

    // Usuario inicial de prueba
    const user = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
    if (!user) {
        const hash = await bcrypt.hash('1234', 10);
        await db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hash]);
        console.log("👤 Usuario 'admin' creado por defecto.");
    }
})();

// --- CONFIGURACIÓN DE VOSK ---
const modelPath = path.join(__dirname, 'model');
let model;
if (!fs.existsSync(modelPath)) {
    console.error("❌ Error: No se encuentra la carpeta 'model'. Descárgala de la web de Vosk.");
} else {
    model = new Model(modelPath);
    console.log("✅ Modelo Vosk cargado correctamente.");
}

// --- RUTAS DE AUTENTICACIÓN ---

// Registro de nuevos usuarios
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash]);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, message: 'El usuario ya existe o hubo un error.' });
    }
});

// Inicio de sesión
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (user && await bcrypt.compare(password, user.password)) {
            // Guardamos datos en la sesión del servidor
            req.session.userId = user.id;
            req.session.username = user.username;
            
            res.json({ success: true, username: user.username });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// Ruta para obtener los datos del usuario actual (Sidebar)
app.get('/api/user-data', (req, res) => {
    if (req.session.username) {
        res.json({ loggedIn: true, username: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});

// Cerrar sesión
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});

// Middleware para proteger rutas
const authRequired = (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: "No autorizado. Inicia sesión." });
    next();
};

// --- RUTAS DE EVALUACIÓN DE VOZ ---

app.post('/evaluate-audio', authRequired, upload.single('audio'), async (req, res) => {
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

                // Lógica de Precisión (Levenshtein)
                let score = 0;
                if (spokenText === targetText && targetText !== "") {
                    score = 100;
                } else if (spokenText !== "" && targetText !== "") {
                    const distance = levenshtein.get(targetText, spokenText);
                    const longestLength = Math.max(targetText.length, spokenText.length);
                    score = Math.round(((longestLength - distance) / longestLength) * 100);
                }

                // Traducción automática
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
                    espanol: translation,
                    user: req.session.username 
                });

                rec.free();
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
        });
        wfReadable.pipe(wfReader);
    } catch (error) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ error: "Error procesando audio" });
    }
});

// Iniciar Servidor
app.listen(PORT, () => {
    console.log(`
    --------------------------------------------------
    🚀 Servidor Pro-Ciegos A.C. iniciado
    📂 Puerto: ${PORT}
    📂 DB SQLite: Activa (prociegos.db)
    🔗 URL: http://localhost:${PORT}/login.html
    --------------------------------------------------
    `);
});