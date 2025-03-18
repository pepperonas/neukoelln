// src/network/networkManager.js
export class NetworkManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.connected = false;
        this.roomCode = null;
        this.isHost = false;
        this.players = [];
        this.socket = null;
        const randomId = Math.floor(Math.random() * 10000);
        this.playerName = `${randomId}`;

        // Server-Adresse
        this.serverUrl = 'ws://69.62.121.168:3000';

        // Event-Callbacks
        this.onRoomCreated = null;
        this.onRoomJoined = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onGameStart = null;
        this.onGameData = null;
        this.onError = null;
    }

    // Verbindung zum Server herstellen
    connect() {
        console.log('Verbinde mit dem Server...');

        try {
            // WebSocket-Verbindung herstellen
            this.socket = new WebSocket(this.serverUrl);

            // Verbindungsevents registrieren
            this.socket.addEventListener('open', this.handleOpen.bind(this));
            this.socket.addEventListener('message', this.handleMessage.bind(this));
            this.socket.addEventListener('close', this.handleClose.bind(this));
            this.socket.addEventListener('error', this.handleError.bind(this));

            return true;
        } catch (error) {
            console.error('Fehler beim Verbinden:', error);
            return false;
        }
    }

    // Trennt die Verbindung zum Server
    disconnect() {
        console.log('Trenne Verbindung zum Server...');

        if (this.socket) {
            this.socket.close();
        }
    }

    // WebSocket-Event-Handler
    handleOpen(event) {
        console.log('Verbindung zum Server hergestellt');
        this.connected = true;
    }

    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('Nachricht vom Server empfangen:', data);

            switch (data.type) {
                case 'room_created':
                    this.handleRoomCreated(data);
                    break;

                case 'room_joined':
                    this.handleRoomJoined(data);
                    break;

                case 'player_joined':
                    this.handlePlayerJoined(data);
                    break;

                case 'player_left':
                    this.handlePlayerLeft(data);
                    break;

                case 'game_started':
                    this.handleGameStarted(data);
                    break;

                case 'game_data':
                    this.handleGameData(data);
                    break;

                case 'error':
                    this.handleServerError(data);
                    break;

                default:
                    console.log('Unbekannter Nachrichtentyp:', data.type);
            }
        } catch (error) {
            console.error('Fehler beim Verarbeiten der Nachricht:', error);
        }
    }

    handleClose(event) {
        console.log('Verbindung zum Server getrennt:', event.code, event.reason);
        this.connected = false;
        this.roomCode = null;
        this.isHost = false;
        this.players = [];
    }

    handleError(event) {
        console.error('WebSocket-Fehler:', event);

        if (this.onError) {
            this.onError({message: 'Verbindungsfehler zum Server'});
        }
    }

    // Server-Nachrichtenverarbeitung
    handleRoomCreated(data) {
        this.roomCode = data.roomCode;
        this.isHost = true;
        this.players = data.players;

        console.log(`Raum erstellt mit Code: ${this.roomCode}`);

        if (this.onRoomCreated) {
            this.onRoomCreated({
                roomCode: this.roomCode,
                players: this.players
            });
        }
    }

    handleRoomJoined(data) {
        this.roomCode = data.roomCode;
        this.isHost = data.players.find(p => p.id === this.playerName)?.isHost || false;
        this.players = data.players;

        console.log(`Raum beigetreten: ${this.roomCode}`);

        if (this.onRoomJoined) {
            this.onRoomJoined({
                roomCode: this.roomCode,
                players: this.players
            });
        }
    }

    handlePlayerJoined(data) {
        this.players = data.players;

        console.log(`Spieler ${data.player.name} ist beigetreten`);

        if (this.onPlayerJoined) {
            this.onPlayerJoined({
                player: data.player,
                players: this.players
            });
        }
    }

    handlePlayerLeft(data) {
        this.players = data.players;

        console.log(`Spieler ${data.playerId} hat den Raum verlassen`);

        if (this.onPlayerLeft) {
            this.onPlayerLeft({
                playerId: data.playerId,
                players: this.players
            });
        }

        // Prüfe, ob ich jetzt Host bin (erster in der Liste)
        if (this.players.length > 0 && this.players[0].id === this.playerName) {
            this.isHost = true;
            console.log('Du bist jetzt der Host des Raums');
        }
    }

    handleGameStarted(data) {
        console.log('Spiel wurde gestartet');

        if (this.onGameStart) {
            this.onGameStart({
                players: this.players
            });
        }
    }

    // Im NetworkManager
    handleGameData(data) {
        console.log(`Daten von ${data.senderId} empfangen:`, JSON.stringify(data.gameData));

        // Wichtig: Spieler-ID-Check, aber nicht blockieren
        if (data.senderId === this.playerName) {
            console.log("Eigene Nachricht empfangen - wird ignoriert");
        }

        if (this.onGameData) {
            this.onGameData({
                senderId: data.senderId,
                data: data.gameData
            });
        }
    }


    handleServerError(data) {
        console.error('Server-Fehler:', data.message);

        if (this.onError) {
            this.onError({message: data.message});
        }
    }

    // Sendet eine Nachricht an den Server
    sendMessage(message) {
        if (!this.connected || !this.socket) {
            console.error('Nicht mit dem Server verbunden');
            return false;
        }

        try {
            this.socket.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('Fehler beim Senden der Nachricht:', error);
            return false;
        }
    }

    // Erstellt einen neuen Spielraum
    createRoom(playerName = '') {
        if (!this.connected) {
            console.error('Nicht mit dem Server verbunden');
            return false;
        }

        this.playerName = playerName || localStorage.getItem('playerName') || 'Spieler';

        return this.sendMessage({
            type: 'create_room',
            playerName: this.playerName
        });
    }

    // Tritt einem existierenden Spielraum bei
    joinRoom(roomCode, playerName = '') {
        if (!this.connected) {
            console.error('Nicht mit dem Server verbunden');
            return false;
        }

        this.playerName = playerName || localStorage.getItem('playerName') || 'Spieler';

        return this.sendMessage({
            type: 'join_room',
            roomCode: roomCode,
            playerName: this.playerName
        });
    }

    // Startet das Multiplayer-Spiel (nur für Host)
    startGame() {
        if (!this.connected || !this.roomCode || !this.isHost) {
            console.error('Kann Spiel nicht starten: Nicht Host oder nicht in einem Raum');
            return false;
        }

        return this.sendMessage({
            type: 'start_game'
        });
    }

    // Sendet Spieldaten an alle Spieler
    sendGameData(data) {
        if (!this.connected || !this.roomCode) {
            console.error('Kann keine Daten senden: Nicht in einem Raum');
            return false;
        }

        return this.sendMessage({
            type: 'game_data',
            gameData: data
        });
    }
}