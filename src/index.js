import '../styles/main.css';
import {Engine} from './core/engine.js';
import {GameManager} from './managers/gameManager.js';
import {MenuManager} from './ui/menu.js';
import {HUD} from './ui/hud.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM geladen, initialisiere Spiel...');

    // Erstelle die Engine
    const engine = new Engine();

    // Erstelle den GameManager mit der Engine
    const gameManager = new GameManager(engine);

    // Erstelle den MenuManager
    const menuManager = new MenuManager(gameManager);

    // Erstelle HUD
    const hud = new HUD();

    // UI-Setup
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
    document.getElementById('info').classList.remove('hidden');

    // Event-Listener für den Start-Button
    document.getElementById('start-game').addEventListener('click', () => {
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');

        // Lade Spielressourcen und starte
        startGame();
    });

    // Spielstart-Funktion mit Ladefortschritt
    function startGame() {
        // Zeige Ladescreen
        menuManager.showLoadingScreen(0);

        // Simuliere Ladefortschritt (in einem echten Spiel würdest du Assets laden)
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            menuManager.showLoadingScreen(progress);

            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    menuManager.hideLoadingScreen();
                    menuManager.showHUD();

                    // Starte das Spiel
                    gameManager.startGame();
                }, 500);
            }
        }, 100);
    }
});