<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Ruta de Aprendizaje | Pro-Ciegos A.C.</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        :root {
            --azul-pro: #001F3F;
            --oro-pro: #D4AF37;
            --gris-locked: #b2bec3;
            --overlay: rgba(0, 0, 0, 0.4); 
        }

        body {
            margin: 0;
            background: #000;
            font-family: 'Inter', sans-serif;
            color: white;
            overflow-x: hidden;
        }

        /* Estilos base para las secciones (se mantienen de tu código original) */
        .island-section {
            position: relative;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 120px 0;
            background-attachment: fixed;
            background-position: center;
            background-size: cover;
            transition: filter 0.6s ease-in-out;
            border-bottom: 10px solid rgba(0,0,0,0.5);
        }

        .island-section:not(:hover) { filter: blur(8px) brightness(0.7); }

        /* Tus fondos locales */
        .playa { background-image: linear-gradient(var(--overlay), var(--overlay)), url('img/fondoPlaya.png'); }
        .jungla { background-image: linear-gradient(var(--overlay), var(--overlay)), url('img/fondoJungla.png'); }
        .lava { background-image: linear-gradient(var(--overlay), var(--overlay)), url('img/fondoVolcan.png'); }

        .island-title {
            background: var(--azul-pro);
            color: var(--oro-pro);
            padding: 15px 50px;
            border-radius: 50px;
            margin-bottom: 80px;
            border: 3px solid var(--oro-pro);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            text-transform: uppercase;
            z-index: 5;
        }

        .path { display: flex; flex-direction: column; align-items: center; gap: 35px; z-index: 5; }

        .level-btn {
            width: 85px; height: 85px; border-radius: 50%; border: none;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.8rem; font-weight: 900; text-decoration: none;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative; box-shadow: 0 10px 0 rgba(0,0,0,0.3);
        }

        .level-btn:nth-child(5n+1) { transform: translateX(0); }
        .level-btn:nth-child(5n+2) { transform: translateX(70px); }
        .level-btn:nth-child(5n+3) { transform: translateX(110px); }
        .level-btn:nth-child(5n+4) { transform: translateX(70px); }
        .level-btn:nth-child(5n+5) { transform: translateX(0); }

        .level-btn.current { background: var(--azul-pro); color: var(--oro-pro); border: 4px solid var(--oro-pro); cursor: pointer; }
        .level-btn.completed { background: var(--oro-pro); color: white; cursor: pointer; }
        .level-btn.locked { background: var(--gris-locked); color: #636e72; cursor: not-allowed; filter: grayscale(1); box-shadow: 0 5px 0 rgba(0,0,0,0.2); }

        .mapache-guia {
            position: fixed; bottom: 40px; left: 40px;
            width: 140px; z-index: 100;
            filter: drop-shadow(0 10px 15px rgba(0,0,0,0.5));
            animation: float 3s ease-in-out infinite;
        }

        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        
        /* Estilos para el HUD (Barra de arriba) */
        .hud-container {
            position: fixed; top: 0; width: 100%; height: 70px;
            background: white; color: var(--azul-pro);
            display: flex; justify-content: center; align-items: center;
            gap: 40px; z-index: 1000; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            font-weight: bold;
        }
    </style>
</head>
<body>

    <!-- Incluimos la barra de racha y recompensas (HUD) -->
    <div class="hud-container">
        <?php include 'contenidoDashBord/racha.php'; ?>
        <?php include 'contenidoDashBord/recompensas.php'; ?>
    </div>

    <!-- Incluimos el mapa de niveles -->
    <?php include 'contenidoDashBord/nivelesDashbord.php'; ?>

    <!-- Mapache Guía -->
    <img src="img/raccoon_guide.png" class="mapache-guia" alt="Guía Mapache">

    <script src="js/sistemaBloqueo.js"></script>
    <script>
        window.onload = () => {
            verificarNiveles();
        };
    </script>
</body>
</html>