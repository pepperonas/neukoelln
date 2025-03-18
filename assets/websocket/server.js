// server.js
// Ein einfacher WebSocket-Server für Multiplayer-Tests
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');

// Express-App erstellen
const app = express();
π
// Statische Dateien aus dem dist-Verzeichnis bereitstellen
app.use(express.static(path.join(__dirname, 'dist')));

// HTTP-Server erstellen
const server = http.createServer(app);

// WebSocket-Server erstellen
const wss = new WebSocket.Server({server});

// Spielräume speichern
const rooms = new Map();

// Spieler zu Räumen zuordnen
const playerRooms = new Map();

// Verbundene Clients verwalten
wss.on('connection', (ws) => {
    console.log('Neuer Client verbunden');

    let playerId = null;
    let roomCode = null;

    // Nachrichtenverarbeitung
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Empfangene Nachricht:', data);

            switch (data.type) {
                case 'create_room':
                    roomCode = createRoom(ws, data.playerName);
                    playerId = data.playerName; // Vereinfachung: Name als ID
                    playerRooms.set(playerId, roomCode);
                    break;

                case 'join_room':
                    const success = joinRoom(ws, data.roomCode, data.playerName);
                    if (success) {
                        roomCode = data.roomCode;
                        playerId = data.playerName; // Vereinfachung: Name als ID
                        playerRooms.set(playerId, roomCode);
                    }
                    break;

                case 'start_game':
                    startGame(roomCode);
                    break;

                case 'game_data':
                    broadcastGameData(roomCode, playerId, data.gameData);
                    break;

                default:
                    console.log('Unbekannter Nachrichtentyp:', data.type);
            }
        } catch (error) {
            console.error('Fehler bei der Nachrichtenverarbeitung:', error);
        }
    });

    // Verbindungsabbruch
    ws.on('close', () => {
        console.log('Client getrennt');

        // Spieler aus dem Raum entfernen
        if (playerId && roomCode) {
            leaveRoom(roomCode, playerId);
            playerRooms.delete(playerId);
        }
    });
});

// Funktion zum Erstellen eines neuen Raums
function createRoom(ws, playerName) {
    // Generiere zufälligen 6-stelligen Raum-Code
    let roomCode;
    do {
        roomCode = Math.floor(100000 + Math.random() * 900000).toString();
    } while (rooms.has(roomCode));

    // Raum erstellen
    rooms.set(roomCode, {
        host: playerName,
        players: [{
            id: playerName,
            name: playerName,
            isHost: true,
            ws: ws
        }],
        gameStarted: false
    });

    console.log(`Raum erstellt: ${roomCode}, Host: ${playerName}`);

    // Bestätigung an den Client senden
    ws.send(JSON.stringify({
        type: 'room_created',
        roomCode: roomCode,
        players: [{
            id: playerName,
            name: playerName,
            isHost: true
        }]
    }));

    return roomCode;
}

// Funktion zum Beitreten zu einem Raum
function joinRoom(ws, roomCode, playerName) {
    if (!rooms.has(roomCode)) {
        // Raum existiert nicht
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Der angegebene Raum existiert nicht.'
        }));
        return false;
    }

    const room = rooms.get(roomCode);

    if (room.gameStarted) {
        // Spiel bereits gestartet
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Das Spiel in diesem Raum wurde bereits gestartet.'
        }));
        return false;
    }

    // Prüfe, ob Spieler bereits im Raum ist
    const existingPlayer = room.players.find(p => p.id === playerName);
    if (existingPlayer) {
        // Spieler bereits im Raum
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Ein Spieler mit diesem Namen ist bereits im Raum.'
        }));
        return false;
    }

    // Spieler zum Raum hinzufügen
    room.players.push({
        id: playerName,
        name: playerName,
        isHost: false,
        ws: ws
    });

    console.log(`Spieler ${playerName} ist Raum ${roomCode} beigetreten`);

    // Liste der Spieler ohne WebSocket-Verbindungen
    const playerList = room.players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost
    }));

    // Bestätigung an den neuen Spieler senden
    ws.send(JSON.stringify({
        type: 'room_joined',
        roomCode: roomCode,
        players: playerList
    }));

    // Andere Spieler im Raum informieren
    room.players.forEach(player => {
        if (player.id !== playerName) {
            player.ws.send(JSON.stringify({
                type: 'player_joined',
                player: {
                    id: playerName,
                    name: playerName,
                    isHost: false
                },
                players: playerList
            }));
        }
    });

    return true;
}

// Funktion zum Verlassen eines Raums
function leaveRoom(roomCode, playerId) {
    if (!rooms.has(roomCode)) return;

    const room = rooms.get(roomCode);

    // Spieler aus der Liste entfernen
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;

    const leavingPlayer = room.players[playerIndex];
    room.players.splice(playerIndex, 1);

    console.log(`Spieler ${playerId} hat Raum ${roomCode} verlassen`);

    // Prüfen, ob der Raum jetzt leer ist
    if (room.players.length === 0) {
        // Raum löschen, wenn keine Spieler mehr da sind
        rooms.delete(roomCode);
        console.log(`Raum ${roomCode} wurde gelöscht (keine Spieler mehr)`);
        return;
    }

    // Wenn der Host den Raum verlassen hat, einen neuen Host bestimmen
    if (leavingPlayer.isHost) {
        room.players[0].isHost = true;
        room.host = room.players[0].id;
        console.log(`Neuer Host für Raum ${roomCode}: ${room.host}`);
    }

    // Liste der Spieler ohne WebSocket-Verbindungen
    const playerList = room.players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost
    }));

    // Andere Spieler im Raum informieren
    room.players.forEach(player => {
        player.ws.send(JSON.stringify({
            type: 'player_left',
            playerId: playerId,
            players: playerList
        }));
    });
}

// Funktion zum Starten eines Spiels
function startGame(roomCode) {
    if (!rooms.has(roomCode)) return;

    const room = rooms.get(roomCode);
    room.gameStarted = true;

    console.log(`Spiel in Raum ${roomCode} gestartet`);

    // Alle Spieler im Raum informieren
    room.players.forEach(player => {
        player.ws.send(JSON.stringify({
            type: 'game_started'
        }));
    });
}

// Funktion zum Weiterleiten von Spieldaten
function broadcastGameData(roomCode, senderId, gameData) {
    if (!rooms.has(roomCode)) return;

    const room = rooms.get(roomCode);

    // Daten an alle anderen Spieler senden
    room.players.forEach(player => {
        if (player.id !== senderId) {
            player.ws.send(JSON.stringify({
                type: 'game_data',
                senderId: senderId,
                gameData: gameData
            }));
        }
    });
}

// Server starten
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
    console.log(`Öffne http://localhost:${PORT} im Browser`);
});