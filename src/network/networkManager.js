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

        // Neuer Callback für Spielerlisten-Updates
        this.onPlayerListUpdate = null;
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

        // Stelle sicher, dass players ein Array ist
        if (data.players && Array.isArray(data.players)) {
            this.players = this.formatPlayerData(data.players);
        } else {
            console.warn("Erhaltene Spielerdaten sind kein Array:", data.players);
            this.players = [];
        }

        console.log(`Raum erstellt mit Code: ${this.roomCode}`);
        console.log("Spieler im Raum:", this.players);

        // Rufe den Callback auf
        if (this.onRoomCreated) {
            this.onRoomCreated({
                roomCode: this.roomCode,
                players: this.players
            });
        }

        // Informiere auch über die aktualisierte Spielerliste
        if (this.onPlayerListUpdate) {
            this.onPlayerListUpdate(this.players);
        }
    }

    handleRoomJoined(data) {
        this.roomCode = data.roomCode;

        // Finde heraus, ob ich Host bin
        if (data.players && Array.isArray(data.players)) {
            this.players = this.formatPlayerData(data.players);
            this.isHost = this.players.find(p => p.id === this.playerName)?.isHost || false;
        } else {
            console.warn("Erhaltene Spielerdaten sind kein Array:", data.players);
            this.players = [];
            this.isHost = false;
        }

        console.log(`Raum beigetreten: ${this.roomCode}`);
        console.log("Bin ich Host?", this.isHost);
        console.log("Spieler im Raum:", this.players);

        if (this.onRoomJoined) {
            this.onRoomJoined({
                roomCode: this.roomCode,
                players: this.players
            });
        }

        // Informiere auch über die aktualisierte Spielerliste
        if (this.onPlayerListUpdate) {
            this.onPlayerListUpdate(this.players);
        }
    }

    handlePlayerJoined(data) {
        // Stelle sicher, dass die Spielerdaten korrekt sind
        if (data.player) {
            // Füge den neuen Spieler der Spielerliste hinzu
            const formattedPlayer = this.formatSinglePlayerData(data.player);

            // Suche nach einem vorhandenen Spieler mit derselben ID
            const existingIndex = this.players.findIndex(p => p.id === formattedPlayer.id);

            if (existingIndex >= 0) {
                // Aktualisiere vorhandenen Spieler
                this.players[existingIndex] = formattedPlayer;
            } else {
                // Füge neuen Spieler hinzu
                this.players.push(formattedPlayer);
            }
        }

        // Verwende die komplette Spielerliste, falls vorhanden
        if (data.players && Array.isArray(data.players)) {
            this.players = this.formatPlayerData(data.players);
        }

        console.log(`Spieler ${data.player?.name || data.player?.id} ist beigetreten`);
        console.log("Aktualisierte Spielerliste:", this.players);

        if (this.onPlayerJoined) {
            this.onPlayerJoined({
                player: data.player,
                players: this.players
            });
        }

        // Informiere auch über die aktualisierte Spielerliste
        if (this.onPlayerListUpdate) {
            this.onPlayerListUpdate(this.players);
        }
    }

    handlePlayerLeft(data) {
        // Entferne den Spieler aus der Spielerliste
        const playerIndex = this.players.findIndex(p => p.id === data.playerId);
        if (playerIndex >= 0) {
            this.players.splice(playerIndex, 1);
        }

        // Verwende die komplette Spielerliste, falls vorhanden
        if (data.players && Array.isArray(data.players)) {
            this.players = this.formatPlayerData(data.players);
        }

        console.log(`Spieler ${data.playerId} hat den Raum verlassen`);
        console.log("Aktualisierte Spielerliste:", this.players);

        if (this.onPlayerLeft) {
            this.onPlayerLeft({
                playerId: data.playerId,
                players: this.players
            });
        }

        // Informiere auch über die aktualisierte Spielerliste
        if (this.onPlayerListUpdate) {
            this.onPlayerListUpdate(this.players);
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

    handleGameData(data) {
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

    // Hilfsmethode zum Formatieren der Spielerdaten
    formatPlayerData(players) {
        if (!Array.isArray(players)) {
            console.error("formatPlayerData: players ist kein Array:", players);
            return [];
        }

        return players.map(player => this.formatSinglePlayerData(player));
    }

    // Formatiert einzelne Spielerdaten
    formatSinglePlayerData(player) {
        if (!player) return null;

        return {
            id: player.id || player.playerId || player.playerName || player.name,
            name: player.name || player.playerName || player.id || "Unbekannter Spieler",
            isHost: !!player.isHost
        };
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