/**
 * Módulo para gestionar el cambio de niveles por comandos de voz
 */
export const ManejadorNiveles = {
    analizarComando: (texto, selectElement, callbackActualizar) => {
        const comando = texto.toLowerCase();
        let cambioRealizado = false;

        if (comando.includes("nivel a")) {
            selectElement.value = "A";
            cambioRealizado = true;
        } else if (comando.includes("nivel b")) {
            selectElement.value = "B";
            cambioRealizado = true;
        } else if (comando.includes("nivel c")) {
            selectElement.value = "C";
            cambioRealizado = true;
        }

        if (cambioRealizado) {
            callbackActualizar(); // Disparar la carga del nuevo diccionario
            return true;
        }
        return false;
    }
};