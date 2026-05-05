const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Model, KaldiRecognizer } = require('vosk');
const { translate } = require('google-translate-api-x');
const levenshtein = require('fast-levenshtein');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURACIÓN DE MIDDLEWARES ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public')); 

// Configuración de Sesiones
app.use(session({
    secret: 'pro-ciegos-aesthetic-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        maxAge: 1000 * 60 * 60 * 24 
    } 
}));

// --- CONFIGURACIÓN DE BASE DE DATOS (SQLite) ---
let db;
(async () => {
    db = await open({
        filename: './prociegos.db',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            xp INTEGER DEFAULT 0,
            gemas INTEGER DEFAULT 0,
            progreso_bioma INTEGER DEFAULT 1
        )
    `);

    // Verificación de columnas para migraciones rápidas
    const tableInfo = await db.all("PRAGMA table_info(users)");
    const columns = tableInfo.map(c => c.name);
    
    if (!columns.includes('xp')) await db.run("ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0");
    if (!columns.includes('gemas')) await db.run("ALTER TABLE users ADD COLUMN gemas INTEGER DEFAULT 0");
    if (!columns.includes('progreso_bioma')) await db.run("ALTER TABLE users ADD COLUMN progreso_bioma INTEGER DEFAULT 1");

    // Usuario administrador por defecto
    const user = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
    if (!user) {
        const hash = await bcrypt.hash('1234', 10);
        await db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hash]);
        console.log("👤 Usuario 'admin' creado por defecto (pass: 1234).");
    }
    
    console.log("✅ Base de datos estructurada y lista.");
})();

// --- CONFIGURACIÓN DE VOSK ---
const modelPath = path.join(__dirname, 'model');
let model;
if (!fs.existsSync(modelPath)) {
    console.error("❌ Error: No se encuentra la carpeta 'model'. Descárgala en la raíz del proyecto.");
} else {
    model = new Model(modelPath);
    console.log("✅ Modelo Vosk cargado correctamente.");
}

// --- MIDDLEWARE DE PROTECCIÓN ---
const authRequired = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "SESIÓN EXPIRADA", message: "Debes iniciar sesión." });
    }
    next();
};

// --- RUTAS DE AUTENTICACIÓN ---

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash]);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, message: 'El usuario ya existe.' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user.id;
            req.session.username = user.username;
            res.json({ 
                success: true, 
                username: user.username,
                xp: user.xp,
                gemas: user.gemas 
            });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

app.get('/api/user-data', async (req, res) => {
    if (req.session.userId) {
        const user = await db.get('SELECT username, xp, gemas, progreso_bioma FROM users WHERE id = ?', [req.session.userId]);
        res.json({ loggedIn: true, ...user });
    } else {
        res.json({ loggedIn: false });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});

app.post('/api/update-progress', authRequired, async (req, res) => {
    const { xp, gemas } = req.body;
    try {
        await db.run(
            'UPDATE users SET xp = xp + ?, gemas = gemas + ?, progreso_bioma = progreso_bioma + 1 WHERE id = ?',
            [xp, gemas, req.session.userId]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar progreso" });
    }
});

// --- RUTA DE EVALUACIÓN DE VOZ ---
app.post('/evaluate-audio', async (req, res) => {
    // Verificación manual de sesión para evitar errores de red genéricos
    if (!req.session.userId) {
        return res.status(401).json({ error: "NO_AUTH", message: "Sesión no válida" });
    }

    const { audioBase64, targetText } = req.body;

    if (!audioBase64) {
        return res.status(400).json({ error: "No se recibió audio" });
    }

    try {
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        const rec = new KaldiRecognizer(model, 16000);
        
        rec.acceptWaveform(audioBuffer);
        const result = rec.finalResult();
        
        const spokenText = result.text.toLowerCase().trim();
        const target = (targetText || "").toLowerCase().trim();

        // Cálculo de precisión
        let score = 0;
        if (spokenText === target && target !== "") {
            score = 100;
        } else if (spokenText !== "" && target !== "") {
            const distance = levenshtein.get(target, spokenText);
            const longestLength = Math.max(target.length, spokenText.length);
            score = Math.round(((longestLength - distance) / longestLength) * 100);
        }

        // Traducción
        let translation = "Sin transcripción";
        if (spokenText) {
            try {
                const tr = await translate(spokenText, { to: 'es' });
                translation = tr.text;
            } catch (e) {
                translation = "[Error en traducción]";
            }
        }

        console.log(`🎤 [${req.session.username}] -> "${spokenText}" | Obj: "${target}" | Score: ${score}%`);

        res.json({ 
            spoken: spokenText || "No se detectó voz", 
            accuracy: score,
            espanol: translation,
            user: req.session.username 
        });

        rec.free();

    } catch (error) {
        console.error("❌ Error en reconocimiento:", error);
        res.status(500).json({ error: "Error interno del motor de voz" });
    }
});

// --- INICIO ---
app.listen(PORT, () => {
    console.log(`
    ==================================================
    🚀 SISTEMA PRO-CIEGOS A.C. ACTIVO
    📂 Puerto: ${PORT}
    📡 Modelo: Vosk 16kHz
    🔗 Acceso: http://localhost:${PORT}/login.html
    ==================================================
    `);
});