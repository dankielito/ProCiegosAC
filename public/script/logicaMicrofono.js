import { Altavoz } from './altavoz.js';

export const LogicaMicrofono = {
    procesarComando: async (texto, callbackCambiarModo) => {
        const comando = texto.toLowerCase();
        
        if (comando.includes("detener") || comando.includes("parar") || comando.includes("stop")) {
            await Altavoz.notificar("Asistente detenido. Recarga la página para reiniciar.");
            return "DETENER";
        }

        if (comando.includes("palabra") || comando.includes("palabras")) {
            await Altavoz.notificar("Cambiando a modo palabras.");
            callbackCambiarModo("Palabras");
            return "CAMBIO_MODO";
        }

        if (comando.includes("oración") || comando.includes("oraciones") || comando.includes("oracion")) {
            await Altavoz.notificar("Cambiando a modo oraciones.");
            callbackCambiarModo("Oraciones");
            return "CAMBIO_MODO";
        }

        return "CONTINUAR";
    }
};