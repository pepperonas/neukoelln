#!/bin/bash

# Definiere Projektname (kann als Parameter übergeben werden)
PROJECT_NAME=${1:-"gta-style-game"}

# Hauptverzeichnis erstellen
mkdir -p $PROJECT_NAME
cd $PROJECT_NAME

# Assets-Verzeichnisse
mkdir -p assets/models
mkdir -p assets/textures
mkdir -p assets/sounds
mkdir -p assets/maps

# Src-Verzeichnisse
mkdir -p src/config
mkdir -p src/core
mkdir -p src/entities/vehicles
mkdir -p src/entities/characters
mkdir -p src/entities/weapons
mkdir -p src/entities/environment
mkdir -p src/managers
mkdir -p src/ui
mkdir -p src/utils

# Styles und Dist
mkdir -p styles
mkdir -p dist

# Basisdateien erstellen
touch index.html
touch styles/main.css
touch README.md

# Config-Dateien
touch src/config/constants.js
touch src/config/controls.js
touch src/config/levels.js

# Core-Dateien
touch src/index.js
touch src/core/engine.js
touch src/core/physics.js
touch src/core/collision.js
touch src/core/input.js
touch src/core/sound.js
touch src/core/loader.js

# Entity-Basisdateien
touch src/entities/entity.js

# Fahrzeuge
touch src/entities/vehicles/vehicle.js
touch src/entities/vehicles/car.js
touch src/entities/vehicles/motorcycle.js
touch src/entities/vehicles/tank.js

# Charaktere
touch src/entities/characters/character.js
touch src/entities/characters/player.js
touch src/entities/characters/enemy.js

# Waffen
touch src/entities/weapons/weapon.js
touch src/entities/weapons/pistol.js
touch src/entities/weapons/machinegun.js
touch src/entities/weapons/projectile.js

# Umgebung
touch src/entities/environment/building.js
touch src/entities/environment/obstacle.js
touch src/entities/environment/pickup.js

# Manager-Dateien
touch src/managers/gameManager.js
touch src/managers/entityManager.js
touch src/managers/levelManager.js
touch src/managers/aiManager.js
touch src/managers/uiManager.js

# UI-Dateien
touch src/ui/hud.js
touch src/ui/menu.js
touch src/ui/dialogues.js
touch src/ui/minimap.js

# Utils-Dateien
touch src/utils/math.js
touch src/utils/helpers.js
touch src/utils/debugger.js

# Basisdateien mit Inhalt füllen

# package.json erstellen
cat > package.json << EOL
{
  "name": "${PROJECT_NAME}",
  "version": "1.0.0",
  "description": "Ein GTA-ähnliches Spiel mit modernem JavaScript",
  "main": "src/index.js",
  "scripts": {
    "start": "webpack serve --open",
    "build": "webpack --mode production",
    "test": "jest"
  },
  "keywords": ["game", "threejs", "3d", "gta"],
  "author": "",
  "license": "MIT",
  "devDependencies": {
    "@babel/core": "^7.16.0",
    "@babel/preset-env": "^7.16.0",
    "babel-loader": "^8.2.3",
    "css-loader": "^6.5.1",
    "file-loader": "^6.2.0",
    "html-webpack-plugin": "^5.5.0",
    "jest": "^27.3.1",
    "style-loader": "^3.3.1",
    "webpack": "^5.64.0",
    "webpack-cli": "^4.9.1",
    "webpack-dev-server": "^4.5.0"
  },
  "dependencies": {
    "cannon-es": "^0.20.0",
    "howler": "^2.2.3",
    "three": "^0.135.0",
    "@tweenjs/tween.js": "^18.6.4"
  }
}
EOL

# README.md mit Basisinhalt
cat > README.md << EOL
# ${PROJECT_NAME}

Ein 3D GTA-ähnliches Spiel entwickelt mit Three.js und modernem JavaScript.

## Installation

\`\`\`bash
npm install
\`\`\`

## Starten der Entwicklungsumgebung

\`\`\`bash
npm start
\`\`\`

## Build für Produktion

\`\`\`bash
npm run build
\`\`\`

## Projektstruktur

- \`assets/\`: Spielassets (Modelle, Texturen, Sounds)
- \`src/\`: Quellcode
  - \`config/\`: Spielkonfigurationen
  - \`core/\`: Kernsysteme
  - \`entities/\`: Spielobjekte
  - \`managers/\`: Manager-Klassen
  - \`ui/\`: Benutzeroberfläche
  - \`utils/\`: Hilfsfunktionen
- \`styles/\`: CSS-Dateien
- \`dist/\`: Kompilierte Dateien (nach Build)

## Features

- 3D-Umgebung mit einer Stadt
- Fahrzeuge mit realistischer Physik
- Waffen- und Kampfsystem
- Missionen und Quests
- Gegner mit KI
EOL

# HTML-Basisdatei
cat > index.html << EOL
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${PROJECT_NAME}</title>
    <link rel="stylesheet" href="styles/main.css">
</head>
<body>
    <div id="game-container"></div>
    <div id="loading-screen">
        <div class="loader"></div>
        <div id="loading-progress">0%</div>
    </div>
    <div id="menu" class="hidden">
        <h1>${PROJECT_NAME}</h1>
        <button id="start-game">Spiel starten</button>
        <button id="options">Optionen</button>
        <button id="credits">Credits</button>
    </div>
    <div id="hud" class="hidden">
        <div id="health-bar"></div>
        <div id="ammo-counter"></div>
        <div id="minimap"></div>
        <div id="mission-info"></div>
    </div>
</body>
</html>
EOL

# CSS-Basisdatei
cat > styles/main.css << EOL
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    overflow: hidden;
    font-family: Arial, sans-serif;
}

#game-container {
    position: absolute;
    width: 100%;
    height: 100%;
}

#loading-screen {
    position: absolute;
    width: 100%;
    height: 100%;
    background-color: #000;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
    z-index: 1000;
}

.loader {
    border: 5px solid #f3f3f3;
    border-top: 5px solid #3498db;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 2s linear infinite;
    margin-bottom: 20px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

#menu {
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 900;
}

#menu h1 {
    color: white;
    font-size: 3em;
    margin-bottom: 40px;
}

#menu button {
    background: #3498db;
    border: none;
    color: white;
    padding: 15px 30px;
    margin: 10px;
    font-size: 1.2em;
    cursor: pointer;
    border-radius: 5px;
    transition: background 0.3s;
}

#menu button:hover {
    background: #2980b9;
}

#hud {
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 800;
}

#health-bar {
    position: absolute;
    bottom: 20px;
    left: 20px;
    height: 20px;
    width: 200px;
    background: rgba(0, 0, 0, 0.5);
    border: 2px solid white;
}

#health-bar::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    background: #2ecc71;
}

#ammo-counter {
    position: absolute;
    bottom: 20px;
    right: 20px;
    color: white;
    font-size: 1.5em;
    background: rgba(0, 0, 0, 0.5);
    padding: 5px 10px;
    border-radius: 5px;
}

#minimap {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 150px;
    height: 150px;
    background: rgba(0, 0, 0, 0.5);
    border: 2px solid white;
    border-radius: 50%;
    overflow: hidden;
}

#mission-info {
    position: absolute;
    top: 20px;
    left: 20px;
    max-width: 300px;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    padding: 10px;
    border-radius: 5px;
}

.hidden {
    display: none !important;
}
EOL

# Index.js mit Basisfunktionalität
cat > src/index.js << EOL
import { Engine } from './core/engine.js';
import { GameManager } from './managers/gameManager.js';

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the game engine
    const engine = new Engine();
    
    // Initialize game manager
    const gameManager = new GameManager(engine);
    
    // Show menu
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
    
    // Add event listeners
    document.getElementById('start-game').addEventListener('click', () => {
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        gameManager.startGame();
    });
    
    document.getElementById('options').addEventListener('click', () => {
        // Show options menu
        console.log('Options menu clicked');
    });
    
    document.getElementById('credits').addEventListener('click', () => {
        // Show credits
        console.log('Credits clicked');
    });
});
EOL

# Engine Basisdatei
cat > src/core/engine.js << EOL
import * as THREE from 'three';
import { InputManager } from './input.js';
import { PhysicsEngine } from './physics.js';
import { SoundManager } from './sound.js';
import { LoaderManager } from './loader.js';

export class Engine {
    constructor() {
        // Create the renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        
        // Create the scene
        this.scene = new THREE.Scene();
        
        // Create the camera
        this.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        
        // Initialize other core systems
        this.inputManager = new InputManager();
        this.physicsEngine = new PhysicsEngine();
        this.soundManager = new SoundManager();
        this.loaderManager = new LoaderManager();
        
        // FPS and performance tracking
        this.clock = new THREE.Clock();
        this.fps = 0;
        this.frameTime = 0;
        this.framesThisSecond = 0;
        this.lastFpsUpdate = 0;
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Animation frame variables
        this.previousTime = 0;
        this.isRunning = false;
    }
    
    start() {
        this.isRunning = true;
        this.previousTime = performance.now();
        this.animate();
    }
    
    stop() {
        this.isRunning = false;
    }
    
    animate(currentTime = performance.now()) {
        if (!this.isRunning) return;
        
        requestAnimationFrame((time) => this.animate(time));
        
        // Calculate delta time
        const deltaTime = (currentTime - this.previousTime) / 1000;
        this.previousTime = currentTime;
        
        // Update FPS counter
        this.frameTime += deltaTime;
        this.framesThisSecond++;
        
        if (this.frameTime >= 1) {
            this.fps = this.framesThisSecond;
            this.framesThisSecond = 0;
            this.frameTime -= 1;
        }
        
        // Update physics
        this.physicsEngine.update(deltaTime);
        
        // Update game objects
        this.update(deltaTime);
        
        // Render the scene
        this.render();
    }
    
    update(deltaTime) {
        // This method should be overridden by the game implementation
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
}
EOL

echo "Projektstruktur für '${PROJECT_NAME}' wurde erfolgreich erstellt!"
echo "Grundlegende Dateien wurden mit Beispielinhalten erstellt."
echo ""
echo "Als nächstes:"
echo "1. Navigiere in das Projektverzeichnis: cd ${PROJECT_NAME}"
echo "2. Installiere die Abhängigkeiten: npm install"
echo "3. Starte den Entwicklungsserver: npm start"