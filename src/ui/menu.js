export class MenuManager {
    constructor(gameManager) {
        this.gameManager = gameManager;

        // Menü-Elemente
        this.menuElement = document.getElementById('menu');
        this.loadingScreenElement = document.getElementById('loading-screen');
        this.hudElement = document.getElementById('hud');

        // Aktiver Dialog
        this.activeDialog = null;

        // Event-Listener für Menü-Buttons
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Hauptmenü-Buttons
        document.getElementById('start-game').addEventListener('click', () => this.startGame());
        document.getElementById('options').addEventListener('click', () => this.showOptionsMenu());
        document.getElementById('credits').addEventListener('click', () => this.showCredits());

        // ESC-Taste für Pausenmenü
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                this.togglePauseMenu();
            }
        });
    }

    showMainMenu() {
        this.hideAllMenus();
        this.menuElement.classList.remove('hidden');
    }

    hideMainMenu() {
        this.menuElement.classList.add('hidden');
    }

    showLoadingScreen(progress = 0) {
        this.hideAllMenus();
        this.loadingScreenElement.classList.remove('hidden');
        document.getElementById('loading-progress').textContent = `${Math.round(progress)}%`;
    }

    hideLoadingScreen() {
        this.loadingScreenElement.classList.add('hidden');
    }

    showHUD() {
        this.hudElement.classList.remove('hidden');
    }

    hideHUD() {
        this.hudElement.classList.add('hidden');
    }

    hideAllMenus() {
        this.menuElement.classList.add('hidden');
        this.loadingScreenElement.classList.add('hidden');
        this.closeDialog();
    }

    startGame() {
        this.showLoadingScreen(0);

        // Simuliere Ladefortschritt (in einem echten Spiel würdest du Assets laden)
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            this.showLoadingScreen(progress);

            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    this.hideLoadingScreen();
                    this.showHUD();
                    this.gameManager.startGame();
                }, 500);
            }
        }, 100);
    }

    showOptionsMenu() {
        // Erstelle das Optionsmenü
        const dialogContent = `
            <div class="options-menu">
                <div class="option-group">
                    <label class="option-label">Musik-Lautstärke</label>
                    <div class="slider-container">
                        <input type="range" min="0" max="100" value="50" class="slider" id="music-volume">
                        <span class="slider-value">50%</span>
                    </div>
                </div>
                
                <div class="option-group">
                    <label class="option-label">Effekt-Lautstärke</label>
                    <div class="slider-container">
                        <input type="range" min="0" max="100" value="80" class="slider" id="sfx-volume">
                        <span class="slider-value">80%</span>
                    </div>
                </div>
                
                <div class="option-group">
                    <label class="option-label">Grafik-Qualität</label>
                    <select id="graphics-quality">
                        <option value="low">Niedrig</option>
                        <option value="medium" selected>Mittel</option>
                        <option value="high">Hoch</option>
                    </select>
                </div>
                
                <div class="option-group">
                    <label class="option-label">Vollbild</label>
                    <input type="checkbox" id="fullscreen">
                </div>
            </div>
        `;

        this.showDialog('Optionen', dialogContent, [
            {
                text: 'Speichern',
                callback: () => this.saveOptions()
            },
            {
                text: 'Abbrechen',
                callback: () => this.closeDialog()
            }
        ]);

        // Event-Listener für Slider
        document.querySelectorAll('.slider').forEach(slider => {
            const valueDisplay = slider.parentElement.querySelector('.slider-value');
            slider.addEventListener('input', () => {
                valueDisplay.textContent = `${slider.value}%`;
            });
        });
    }

    saveOptions() {
        // Optionen aus den Formularfeldern auslesen
        const musicVolume = parseInt(document.getElementById('music-volume').value) / 100;
        const sfxVolume = parseInt(document.getElementById('sfx-volume').value) / 100;
        const graphicsQuality = document.getElementById('graphics-quality').value;
        const fullscreen = document.getElementById('fullscreen').checked;

        // Optionen anwenden
        if (this.gameManager.soundManager) {
            this.gameManager.soundManager.setMusicVolume(musicVolume);
            this.gameManager.soundManager.setSFXVolume(sfxVolume);
        }

        // Grafikqualität anwenden
        this.applyGraphicsSettings(graphicsQuality);

        // Vollbild umschalten
        if (fullscreen) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }

        // Speichere Einstellungen im LocalStorage
        const settings = {
            musicVolume,
            sfxVolume,
            graphicsQuality,
            fullscreen
        };
        localStorage.setItem('gameSettings', JSON.stringify(settings));

        this.closeDialog();
    }

    applyGraphicsSettings(quality) {
        // Hier würdest du die Grafikqualität im Renderer anpassen
        if (this.gameManager.engine && this.gameManager.engine.renderer) {
            const renderer = this.gameManager.engine.renderer;

            switch (quality) {
                case 'low':
                    renderer.setPixelRatio(window.devicePixelRatio * 0.5);
                    renderer.shadowMap.enabled = false;
                    break;

                case 'medium':
                    renderer.setPixelRatio(window.devicePixelRatio * 0.75);
                    renderer.shadowMap.enabled = true;
                    break;

                case 'high':
                    renderer.setPixelRatio(window.devicePixelRatio);
                    renderer.shadowMap.enabled = true;
                    break;
            }
        }
    }

    enterFullscreen() {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }

    showCredits() {
        const dialogContent = `
            <div class="credits">
                <h3>Entwicklung</h3>
                <p>Dein Name</p>
                
                <h3>Grafik und Design</h3>
                <p>Dein Name</p>
                
                <h3>Verwendete Bibliotheken</h3>
                <ul>
                    <li>Three.js</li>
                    <li>Cannon.js</li>
                    <li>Howler.js</li>
                    <li>TweenJS</li>
                </ul>
                
                <h3>Besonderer Dank</h3>
                <p>An alle, die dieses Projekt unterstützt haben!</p>
            </div>
        `;

        this.showDialog('Credits', dialogContent, [
            {
                text: 'Schließen',
                callback: () => this.closeDialog()
            }
        ]);
    }

    togglePauseMenu() {
        if (this.gameManager.isRunning) {
            this.showPauseMenu();
        } else {
            this.resumeGame();
        }
    }

    showPauseMenu() {
        // Spiel pausieren
        this.gameManager.pauseGame();

        const dialogContent = `
            <div class="pause-menu">
                <p>Spiel pausiert</p>
            </div>
        `;

        this.showDialog('Pause', dialogContent, [
            {
                text: 'Fortsetzen',
                callback: () => this.resumeGame()
            },
            {
                text: 'Optionen',
                callback: () => this.showOptionsMenu()
            },
            {
                text: 'Zum Hauptmenü',
                callback: () => this.confirmQuitToMenu()
            }
        ]);
    }

    resumeGame() {
        this.closeDialog();
        this.gameManager.resumeGame();
    }

    confirmQuitToMenu() {
        this.showDialog('Zurück zum Hauptmenü?', 'Möchtest du wirklich zum Hauptmenü zurückkehren? Dein Fortschritt geht verloren.', [
            {
                text: 'Ja',
                callback: () => this.quitToMenu()
            },
            {
                text: 'Nein',
                callback: () => this.showPauseMenu()
            }
        ]);
    }

    quitToMenu() {
        this.gameManager.stopGame();
        this.hideHUD();
        this.showMainMenu();
    }

    showDialog(title, content, buttons = []) {
        // Schließe vorhandene Dialoge
        this.closeDialog();

        // Erstelle neuen Dialog
        this.activeDialog = document.createElement('div');
        this.activeDialog.className = 'dialog fade-in';

        // Setze Dialog-Inhalt
        this.activeDialog.innerHTML = `
            <div class="dialog-title">${title}</div>
            <div class="dialog-content">${content}</div>
            <div class="dialog-buttons"></div>
        `;

        // Füge Buttons hinzu
        const buttonsContainer = this.activeDialog.querySelector('.dialog-buttons');
        buttons.forEach(button => {
            const buttonElement = document.createElement('button');
            buttonElement.className = 'dialog-button';
            buttonElement.textContent = button.text;
            buttonElement.addEventListener('click', button.callback);
            buttonsContainer.appendChild(buttonElement);
        });

        // Füge Dialog zum DOM hinzu
        document.body.appendChild(this.activeDialog);
    }

    closeDialog() {
        if (this.activeDialog) {
            this.activeDialog.classList.remove('fade-in');
            this.activeDialog.classList.add('fade-out');

            setTimeout(() => {
                if (this.activeDialog && this.activeDialog.parentNode) {
                    this.activeDialog.parentNode.removeChild(this.activeDialog);
                }
                this.activeDialog = null;
            }, 300);
        }
    }

    loadSettings() {
        // Lade gespeicherte Einstellungen aus dem LocalStorage
        const savedSettings = localStorage.getItem('gameSettings');

        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);

                // Wende Einstellungen an
                if (this.gameManager.soundManager) {
                    this.gameManager.soundManager.setMusicVolume(settings.musicVolume || 0.5);
                    this.gameManager.soundManager.setSFXVolume(settings.sfxVolume || 0.8);
                }

                this.applyGraphicsSettings(settings.graphicsQuality || 'medium');

                if (settings.fullscreen) {
                    this.enterFullscreen();
                }

                return settings;
            } catch (error) {
                console.error('Fehler beim Laden der Einstellungen:', error);
            }
        }

        // Standardeinstellungen, wenn keine gespeicherten vorhanden sind
        return {
            musicVolume: 0.5,
            sfxVolume: 0.8,
            graphicsQuality: 'medium',
            fullscreen: false
        };
    }
}