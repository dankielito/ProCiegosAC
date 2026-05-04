export const Altavoz = {
    // Función interna para encontrar la voz correcta
    getVoice: (langCode) => {
        const voices = window.speechSynthesis.getVoices();
        if (langCode === 'es-MX') {
            // Busca voces de México (Paulina, Sabina, etc.)
            return voices.find(v => v.lang.includes('MX') || v.name.includes('Mexico')) || voices.find(v => v.lang.includes('es'));
        }
        if (langCode === 'en-US') {
            // Busca voz femenina de EE.UU. (Zira, Samantha, Google US English)
            return voices.find(v => v.lang.includes('US') && (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Google'))) || voices.find(v => v.lang.includes('en'));
        }
    },

    decirObjetivo: (texto) => {
        return new Promise((resolve) => {
            const mensaje = new SpeechSynthesisUtterance(texto);
            mensaje.lang = 'en-US';
            mensaje.rate = 0.85; // Un poco más lento para claridad
            mensaje.voice = Altavoz.getVoice('en-US');
            mensaje.onend = () => resolve();
            window.speechSynthesis.speak(mensaje);
        });
    },

    notificar: (texto) => {
        return new Promise((resolve) => {
            const mensaje = new SpeechSynthesisUtterance(texto);
            mensaje.lang = 'es-MX';
            mensaje.rate = 1.0;
            mensaje.voice = Altavoz.getVoice('es-MX');
            mensaje.onend = () => resolve();
            window.speechSynthesis.speak(mensaje);
        });
    }
};