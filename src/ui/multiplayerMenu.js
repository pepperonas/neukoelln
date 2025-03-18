// src/ui/multiplayerMenu.js
export class MultiplayerMenu {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.menuElement = null;
        this.roomCode = null;
    }

    show() {
        // Erstelle das Multiplayer-Menü, falls es noch nicht existiert
        if (!this.menuElement) {
            this.createMenuElement();
        }

        // Menü anzeigen
        document.body.appendChild(this.menuElement);
        this.menuElement.classList.add('fade-in');
    }

    hide() {
        if (this.menuElement && this.menuElement.parentNode) {
            this.menuElement.classList.remove('fade-in');
            this.menuElement.classList.add('fade-out');

            setTimeout(() => {
                if (this.menuElement && this.menuElement.parentNode) {
                    this.menuElement.parentNode.removeChild(this.menuElement);
                }
                this.menuElement.classList.remove('fade-out');
            }, 300);
        }
    }

    createMenuElement() {
        // Haupt-Container
        this.menuElement = document.createElement('div');
        this.menuElement.className = 'multiplayer-menu';

        // Titel
        const title = document.createElement('h2');
        title.textContent = 'GTA-Neukölln Multiplayer';
        this.menuElement.appendChild(title);

        // Spielername-Eingabe
        const nameContainer = document.createElement('div');
        nameContainer.className = 'input-container';

        const nameLabel = document.createElement('label');
        nameLabel.htmlFor = 'player-name';
        nameLabel.textContent = 'Dein Name:';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'player-name';
        nameInput.maxLength = 15;
        nameInput.placeholder = 'Spielername eingeben';
        nameInput.value = localStorage.getItem('playerName') || '';

        nameContainer.appendChild(nameLabel);
        nameContainer.appendChild(nameInput);
        this.menuElement.appendChild(nameContainer);

        // Optionen-Container
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'options-container';

        // Raum erstellen
        const createRoomButton = document.createElement('button');
        createRoomButton.className = 'mp-button create-room';
        createRoomButton.textContent = 'Neues Spiel erstellen';
        createRoomButton.addEventListener('click', () => this.createRoom(nameInput.value));

        // Raum beitreten
        const joinContainer = document.createElement('div');
        joinContainer.className = 'join-container';

        const roomCodeInput = document.createElement('input');
        roomCodeInput.type = 'text';
        roomCodeInput.placeholder = 'Raum-Code eingeben';
        roomCodeInput.maxLength = 6;

        const joinRoomButton = document.createElement('button');
        joinRoomButton.className = 'mp-button join-room';
        joinRoomButton.textContent = 'Spiel beitreten';
        joinRoomButton.addEventListener('click', () => this.joinRoom(nameInput.value, roomCodeInput.value));

        joinContainer.appendChild(roomCodeInput);
        joinContainer.appendChild(joinRoomButton);

        optionsContainer.appendChild(createRoomButton);
        optionsContainer.appendChild(joinContainer);
        this.menuElement.appendChild(optionsContainer);

        // Status-Anzeige
        this.statusContainer = document.createElement('div');
        this.statusContainer.className = 'status-container hidden';

        this.statusText = document.createElement('p');
        this.statusText.className = 'status-text';

        this.roomCodeDisplay = document.createElement('div');
        this.roomCodeDisplay.className = 'room-code-display hidden';

        this.roomCodeText = document.createElement('span');
        this.roomCodeText.className = 'room-code';

        this.copyButton = document.createElement('button');
        this.copyButton.className = 'copy-button';
        this.copyButton.textContent = 'Kopieren';
        this.copyButton.addEventListener('click', () => this.copyRoomCode());

        this.roomCodeDisplay.appendChild(this.roomCodeText);
        this.roomCodeDisplay.appendChild(this.copyButton);

        this.statusContainer.appendChild(this.statusText);
        this.statusContainer.appendChild(this.roomCodeDisplay);
        this.menuElement.appendChild(this.statusContainer);

        // Spielerliste
        this.playerListContainer = document.createElement('div');
        this.playerListContainer.className = 'player-list-container hidden';

        const playerListTitle = document.createElement('h3');
        playerListTitle.textContent = 'Spieler im Raum:';

        this.playerList = document.createElement('ul');
        this.playerList.className = 'player-list';

        this.playerListContainer.appendChild(playerListTitle);
        this.playerListContainer.appendChild(this.playerList);
        this.menuElement.appendChild(this.playerListContainer);

        // Start-Button (nur für Host sichtbar)
        this.startButton = document.createElement('button');
        this.startButton.className = 'mp-button start-game hidden';
        this.startButton.textContent = 'Spiel starten';
        this.startButton.addEventListener('click', () => this.startMultiplayerGame());
        this.menuElement.appendChild(this.startButton);

        // Zurück-Button
        const backButton = document.createElement('button');
        backButton.className = 'mp-button back';
        backButton.textContent = 'Zurück';
        backButton.addEventListener('click', () => this.hide());
        this.menuElement.appendChild(backButton);

        // Styling
        this.addStyles();
    }

    createRoom(playerName) {
        if (!this.validatePlayerName(playerName)) return;

        this.showStatus('Verbinde mit Server...');

        // NetworkManager-Verbindung herstellen
        if (this.gameManager.networkManager.connect()) {
            // Event-Listener für erfolgreiche Raumerstellung registrieren
            this.gameManager.networkManager.onRoomCreated = (data) => {
                this.showStatus('Raum erstellt! Teile den Code mit deinen Freunden.');
                this.showRoomCode(data.roomCode);

                // Spielerliste aktualisieren
                this.updatePlayerList(data.players);

                // Start-Button anzeigen (nur für Host)
                this.startButton.classList.remove('hidden');
            };

            this.gameManager.networkManager.onPlayerJoined = (data) => {
                this.updatePlayerList(data.players);
            };

            this.gameManager.networkManager.onPlayerLeft = (data) => {
                this.updatePlayerList(data.players);
            };

            this.gameManager.networkManager.onError = (data) => {
                this.showError(data.message);
            };

            // Warte kurz, um sicherzustellen, dass die Verbindung hergestellt wird
            setTimeout(() => {
                if (this.gameManager.networkManager.connected) {
                    // Raum erstellen
                    this.gameManager.networkManager.createRoom(playerName);
                } else {
                    this.showError('Verbindung zum Server fehlgeschlagen. Bitte versuche es später erneut.');
                }
            }, 1000);
        } else {
            this.showError('Verbindung zum Server konnte nicht hergestellt werden.');
        }
    }

    joinRoom(playerName, roomCode) {
        if (!this.validatePlayerName(playerName) || !this.validateRoomCode(roomCode)) return;

        this.showStatus('Verbinde mit Server...');

        // NetworkManager-Verbindung herstellen
        if (this.gameManager.networkManager.connect()) {
            // Event-Listener für erfolgreichen Raumbeitritt registrieren
            this.gameManager.networkManager.onRoomJoined = (data) => {
                this.showStatus('Raum beigetreten! Warte auf Spielstart.');
                this.showRoomCode(data.roomCode);

                // Spielerliste aktualisieren
                this.updatePlayerList(data.players);

                // Start-Button anzeigen/verbergen je nach Host-Status
                if (this.gameManager.networkManager.isHost) {
                    this.startButton.classList.remove('hidden');
                } else {
                    this.startButton.classList.add('hidden');
                }
            };

            this.gameManager.networkManager.onPlayerJoined = (data) => {
                this.updatePlayerList(data.players);
            };

            this.gameManager.networkManager.onPlayerLeft = (data) => {
                this.updatePlayerList(data.players);

                // Prüfe, ob ich jetzt Host bin (zur Sicherheit)
                if (this.gameManager.networkManager.isHost) {
                    this.startButton.classList.remove('hidden');
                }
            };

            this.gameManager.networkManager.onGameStart = (data) => {
                this.startMultiplayerGame();
            };

            this.gameManager.networkManager.onError = (data) => {
                this.showError(data.message);
            };

            // Warte kurz, um sicherzustellen, dass die Verbindung hergestellt wird
            setTimeout(() => {
                if (this.gameManager.networkManager.connected) {
                    // Raum beitreten
                    this.gameManager.networkManager.joinRoom(roomCode, playerName);
                } else {
                    this.showError('Verbindung zum Server fehlgeschlagen. Bitte versuche es später erneut.');
                }
            }, 1000);
        } else {
            this.showError('Verbindung zum Server konnte nicht hergestellt werden.');
        }
    }

    validatePlayerName(name) {
        if (!name || name.trim() === '') {
            this.showError('Bitte gib einen Spielernamen ein.');
            return false;
        }

        // Name speichern für zukünftige Sitzungen
        localStorage.setItem('playerName', name.trim());
        return true;
    }

    validateRoomCode(code) {
        if (!code || code.trim() === '') {
            this.showError('Bitte gib einen Raum-Code ein.');
            return false;
        }

        // Einfache Validierung: 6 Ziffern
        if (!/^\d{6}$/.test(code)) {
            this.showError('Der Raum-Code muss aus 6 Ziffern bestehen.');
            return false;
        }

        return true;
    }

    showStatus(message) {
        this.statusContainer.classList.remove('hidden');
        this.statusText.textContent = message;
        this.statusText.classList.remove('error');
    }

    showError(message) {
        this.statusContainer.classList.remove('hidden');
        this.statusText.textContent = message;
        this.statusText.classList.add('error');
    }

    showRoomCode(code) {
        this.roomCode = code;
        this.roomCodeDisplay.classList.remove('hidden');
        this.roomCodeText.textContent = code;
    }

    copyRoomCode() {
        if (this.roomCode) {
            navigator.clipboard.writeText(this.roomCode)
                .then(() => {
                    this.copyButton.textContent = 'Kopiert!';
                    setTimeout(() => {
                        this.copyButton.textContent = 'Kopieren';
                    }, 2000);
                })
                .catch(err => {
                    console.error('Fehler beim Kopieren:', err);
                });
        }
    }

    updatePlayerList(players) {
        this.playerList.innerHTML = '';
        this.playerListContainer.classList.remove('hidden');

        players.forEach(player => {
            const item = document.createElement('li');
            item.textContent = player.username;

            if (player.isHost) {
                item.classList.add('host');
                item.textContent += ' (Host)';
            }

            this.playerList.appendChild(item);
        });
    }

    startMultiplayerGame() {
        // Wenn ich der Host bin, sende das Startsignal
        if (this.gameManager.networkManager.isHost) {
            this.gameManager.networkManager.startGame();
        }

        // Menü schließen
        this.hide();

        // Multiplayer-Spiel starten
        this.gameManager.startMultiplayerGame();
    }

    waitForServerConnection(callback) {
        const checkInterval = setInterval(() => {
            if (this.gameManager.networkManager && this.gameManager.networkManager.connected) {
                clearInterval(checkInterval);
                callback();
            }
        }, 100);

        // Timeout nach 10 Sekunden
        setTimeout(() => {
            clearInterval(checkInterval);
            this.showError('Verbindung zum Server fehlgeschlagen. Bitte versuche es später erneut.');
        }, 10000);
    }

    waitForRoomCreation() {
        // Diese Funktion würde in einer echten Implementierung auf Events vom NetworkManager reagieren
        // Für dieses Beispiel simulieren wir eine erfolgreiche Raumerstellung
        this.waitForServerConnection(() => {
            this.gameManager.networkManager.createRoom();

            // Simuliere Antwort vom Server (in einer echten Implementierung wäre dies ein Event)
            setTimeout(() => {
                // Raum wurde erstellt, zeige Raum-Code an
                const roomCode = Math.floor(100000 + Math.random() * 900000).toString();

                this.showStatus('Raum erstellt! Teile den Code mit deinen Freunden.');
                this.showRoomCode(roomCode);

                // Zeige Spielerliste an
                this.updatePlayerList([
                    {username: localStorage.getItem('playerName'), isHost: true}
                ]);

                // Start-Button anzeigen (nur für Host)
                this.startButton.classList.remove('hidden');

                // Event-Listener für neue Spieler hinzufügen
                this.listenForNewPlayers();
            }, 1500);
        });
    }

    waitForRoomJoin(roomCode) {
        this.waitForServerConnection(() => {
            this.showStatus('Verbinde mit Raum...');

            // Simuliere Raumantwort (in einer echten Implementierung wäre dies ein Event)
            setTimeout(() => {
                // Zufällige Anzahl von Spielern im Raum generieren
                const hostName = "Gastgeber_" + roomCode.substring(0, 3);
                const players = [
                    {username: hostName, isHost: true},
                    {username: localStorage.getItem('playerName'), isHost: false}
                ];

                // Erfolgreich beigetreten
                this.showStatus('Raum beigetreten! Warte auf Spielstart.');
                this.showRoomCode(roomCode);

                // Zeige Spielerliste an
                this.updatePlayerList(players);

                // Start-Button verbergen (nur Host kann starten)
                this.startButton.classList.add('hidden');

                // Event-Listener für neue Spieler hinzufügen
                this.listenForNewPlayers();

                // Event-Listener für Spielstart hinzufügen
                this.listenForGameStart();
            }, 1500);
        });
    }

    listenForNewPlayers() {
        // In einer echten Implementierung würde hier ein Event-Listener für neue Spieler registriert werden
        // Für das Beispiel simulieren wir gelegentlich neue Spieler

        if (this.newPlayerInterval) {
            clearInterval(this.newPlayerInterval);
        }

        // Nur simulieren, wenn man Host ist (also wenn Start-Button sichtbar ist)
        if (!this.startButton.classList.contains('hidden')) {
            // Alle 3-8 Sekunden einen neuen Spieler hinzufügen
            this.newPlayerInterval = setInterval(() => {
                // Aktuelle Spieler abrufen
                const currentPlayers = Array.from(this.playerList.children).map(item => {
                    return {
                        username: item.textContent.replace(' (Host)', ''),
                        isHost: item.classList.contains('host')
                    };
                });

                // Maximal 4 Spieler
                if (currentPlayers.length < 4) {
                    // Neuen zufälligen Spieler hinzufügen
                    const newPlayerName = "Spieler_" + Math.floor(Math.random() * 1000);

                    currentPlayers.push({
                        username: newPlayerName,
                        isHost: false
                    });

                    // Spielerliste aktualisieren
                    this.updatePlayerList(currentPlayers);
                } else {
                    // Bei 4 Spielern das Intervall beenden
                    clearInterval(this.newPlayerInterval);
                }
            }, Math.floor(Math.random() * 5000) + 3000);
        }
    }

    listenForGameStart() {
        // In einer echten Implementierung würde hier ein Event-Listener für den Spielstart registriert werden
        // Für das Beispiel simulieren wir einen Spielstart nach einer zufälligen Zeit

        // Nur für Nicht-Host simulieren (Start-Button versteckt)
        if (this.startButton.classList.contains('hidden')) {
            // Nach 5-15 Sekunden Spiel starten
            setTimeout(() => {
                this.startMultiplayerGame();
            }, Math.floor(Math.random() * 10000) + 5000);
        }
    }

    addStyles() {
        // CSS für das Multiplayer-Menü
        const style = document.createElement('style');
        style.textContent = `
            .multiplayer-menu {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.85);
                color: white;
                padding: 20px;
                border-radius: 10px;
                width: 400px;
                max-width: 90%;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
                z-index: 1000;
                font-family: Arial, sans-serif;
            }
            
            .multiplayer-menu h2 {
                text-align: center;
                margin-top: 0;
                color: #ff3333;
                font-size: 24px;
                margin-bottom: 20px;
            }
            
            .input-container {
                margin-bottom: 20px;
            }
            
            .input-container label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }
            
            .input-container input {
                width: 100%;
                padding: 8px;
                border: none;
                border-radius: 4px;
                background-color: #333;
                color: white;
                font-size: 16px;
                box-sizing: border-box;
            }
            
            .options-container {
                display: flex;
                flex-direction: column;
                gap: 15px;
                margin-bottom: 20px;
            }
            
            .join-container {
                display: flex;
                gap: 10px;
            }
            
            .join-container input {
                flex: 1;
                padding: 8px;
                border: none;
                border-radius: 4px;
                background-color: #333;
                color: white;
                font-size: 16px;
            }
            
            .mp-button {
                background-color: #ff3333;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 10px 15px;
                font-size: 16px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .mp-button:hover {
                background-color: #cc0000;
            }
            
            .mp-button.join-room {
                background-color: #3366cc;
            }
            
            .mp-button.join-room:hover {
                background-color: #254e9e;
            }
            
            .mp-button.back {
                background-color: #666;
                margin-top: 15px;
            }
            
            .mp-button.back:hover {
                background-color: #444;
            }
            
            .mp-button.start-game {
                background-color: #22cc22;
                margin-top: 15px;
            }
            
            .mp-button.start-game:hover {
                background-color: #1a9e1a;
            }
            
            .status-container {
                background-color: #222;
                padding: 10px;
                border-radius: 4px;
                margin-bottom: 15px;
            }
            
            .status-text {
                margin: 0;
                font-size: 14px;
            }
            
            .status-text.error {
                color: #ff6666;
            }
            
            .room-code-display {
                margin-top: 10px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .room-code {
                font-family: monospace;
                font-size: 24px;
                font-weight: bold;
                color: #ffcc00;
                letter-spacing: 2px;
            }
            
            .copy-button {
                background-color: #555;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 5px 10px;
                font-size: 12px;
                cursor: pointer;
            }
            
            .copy-button:hover {
                background-color: #777;
            }
            
            .player-list-container {
                margin-top: 20px;
            }
            
            .player-list-container h3 {
                margin-top: 0;
                margin-bottom: 10px;
                font-size: 18px;
            }
            
            .player-list {
                list-style: none;
                padding: 0;
                margin: 0;
                background-color: #222;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .player-list li {
                padding: 8px 10px;
                border-bottom: 1px solid #333;
            }
            
            .player-list li:last-child {
                border-bottom: none;
            }
            
            .player-list li.host {
                font-weight: bold;
                color: #ffcc00;
            }
            
            .hidden {
                display: none !important;
            }
            
            .fade-in {
                animation: fadeIn 0.3s ease-in-out;
            }
            
            .fade-out {
                animation: fadeOut 0.3s ease-in-out;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -48%); }
                to { opacity: 1; transform: translate(-50%, -50%); }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; transform: translate(-50%, -50%); }
                to { opacity: 0; transform: translate(-50%, -48%); }
            }
        `;

        document.head.appendChild(style);
    }
}