// src/network/multiplayer.js
import * as THREE from 'three';
import { Player } from '../entities/characters/player.js';

export class NetworkManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.socket = null;
        this.players = new Map(); // ID -> Player-Objekt
        this.localPlayerId = null;
        this.connected = false;
        this.roomCode = null;
        this.serverUrl = 'ws://localhost:3000'; // In der Produktion anpassen
    }

    connect() {
        // WebSocket-Verbindung herstellen
        this.socket = new WebSocket(this.serverUrl);

        // Event-Handler für WebSocket-Ereignisse
        this.socket.onopen = () => this.handleOpen();
        this.socket.onmessage = (event) => this.handleMessage(event);
        this.socket.onclose = () => this.handleClose();
        this.socket.onerror = (error) => this.handleError(error);
    }

    handleOpen() {
        console.log('Verbindung zum Multiplayer-Server hergestellt');
        this.connected = true;

        // Initialen Handshake senden
        this.sendMessage({
            type: 'join',
            username: localStorage.getItem('playerName') || 'Player_' + Math.floor(Math.random() * 1000)
        });
    }

    handleMessage(event) {
        const message = JSON.parse(event.data);

        switch (message.type) {
            case 'welcome':
                this.localPlayerId = message.playerId;
                this.roomCode = message.roomCode;
                console.log(`Verbunden als Spieler ${this.localPlayerId} in Raum ${this.roomCode}`);
                break;

            case 'playerJoined':
                this.addRemotePlayer(message.player);
                console.log(`Spieler ${message.player.id} ist dem Spiel beigetreten`);
                break;

            case 'playerLeft':
                this.removeRemotePlayer(message.playerId);
                console.log(`Spieler ${message.playerId} hat das Spiel verlassen`);
                break;

            case 'gameState':
                this.updateGameState(message.players);
                break;

            case 'playerShot':
                this.handlePlayerShot(message);
                break;

            case 'playerDamaged':
                this.handlePlayerDamaged(message);
                break;
        }
    }

    handleClose() {
        console.log('Verbindung zum Multiplayer-Server geschlossen');
        this.connected = false;

        // Alle Remote-Spieler entfernen
        this.players.forEach((player, id) => {
            if (id !== this.localPlayerId) {
                this.removeRemotePlayer(id);
            }
        });
    }

    handleError(error) {
        console.error('WebSocket-Fehler:', error);
    }

    sendMessage(message) {
        if (this.socket && this.connected) {
            this.socket.send(JSON.stringify(message));
        }
    }

    addRemotePlayer(playerData) {
        // Neuen Remote-Spieler erstellen
        const remotePlayer = new Player({
            id: playerData.id,
            isRemote: true,
            color: 0xff0000, // Andere Spieler rot markieren
            position: new THREE.Vector3(playerData.position.x, playerData.position.y, playerData.position.z)
        });

        // Zum EntityManager hinzufügen
        this.gameManager.entityManager.add(remotePlayer);

        // In der Spielerliste speichern
        this.players.set(playerData.id, remotePlayer);

        return remotePlayer;
    }

    removeRemotePlayer(playerId) {
        const player = this.players.get(playerId);

        if (player) {
            // Aus EntityManager entfernen
            this.gameManager.entityManager.remove(player);

            // Aus Spielerliste entfernen
            this.players.delete(playerId);
        }
    }

    updateGameState(playersData) {
        // Alle Spielerdaten aktualisieren
        Object.keys(playersData).forEach(playerId => {
            if (playerId === this.localPlayerId) return; // Lokalen Spieler ignorieren

            const playerData = playersData[playerId];
            let player = this.players.get(playerId);

            if (!player) {
                // Spieler existiert noch nicht, neu erstellen
                player = this.addRemotePlayer(playerData);
            }

            // Position und Rotation aktualisieren
            player.position.set(
                playerData.position.x,
                playerData.position.y,
                playerData.position.z
            );
            player.rotation = playerData.rotation;
            player.health = playerData.health;

            // Wenn der Spieler in einem Fahrzeug ist
            if (playerData.inVehicle) {
                // Hier könnten wir das Fahrzeug-Handling implementieren
                // Für jetzt einfach ignorieren
            }
        });
    }

    sendPlayerUpdate() {
        if (!this.gameManager.player) return;

        const player = this.gameManager.player;

        this.sendMessage({
            type: 'playerUpdate',
            position: {
                x: player.position.x,
                y: player.position.y,
                z: player.position.z
            },
            rotation: player.rotation,
            inVehicle: player.inVehicle ? true : false,
            health: player.health
        });
    }

    sendPlayerShot(direction) {
        this.sendMessage({
            type: 'playerShot',
            position: {
                x: this.gameManager.player.position.x,
                y: this.gameManager.player.position.y,
                z: this.gameManager.player.position.z
            },
            direction: {
                x: direction.x,
                y: direction.y,
                z: direction.z
            }
        });
    }

    handlePlayerShot(message) {
        const player = this.players.get(message.playerId);

        if (player) {
            // Remote-Spieler schießt - Effekte erstellen
            // Hier könnten wir einen Mündungsblitz oder ähnliches anzeigen
            console.log(`Spieler ${message.playerId} hat geschossen`);

            // Projektil erstellen
            const projectile = new Projectile({
                position: new THREE.Vector3(message.position.x, message.position.y, message.position.z),
                direction: new THREE.Vector3(message.direction.x, message.direction.y, message.direction.z),
                speed: 0.5,
                damage: this.calculateDamage(), // 15-35% Schaden
                lifeTime: 1.5,
                owner: player
            });

            // Zum EntityManager hinzufügen
            this.gameManager.entityManager.add(projectile);
            this.gameManager.projectiles.push(projectile);
        }
    }

    calculateDamage() {
        // Zufälliger Schaden zwischen 15 und 35
        return Math.floor(Math.random() * 21) + 15;
    }

    handlePlayerDamaged(message) {
        if (message.targetId === this.localPlayerId) {
            // Lokaler Spieler wurde getroffen
            this.gameManager.player.damage(message.damage);
            console.log(`Du wurdest von Spieler ${message.shooterId} getroffen! Schaden: ${message.damage}`);
        } else {
            // Ein anderer Spieler wurde getroffen
            const player = this.players.get(message.targetId);
            if (player) {
                player.damage(message.damage);
                console.log(`Spieler ${message.targetId} wurde getroffen! Schaden: ${message.damage}`);
            }
        }
    }

    sendPlayerDamaged(targetId, damage) {
        this.sendMessage({
            type: 'playerDamaged',
            targetId: targetId,
            damage: damage
        });
    }

    createRoom() {
        this.sendMessage({
            type: 'createRoom'
        });
    }

    joinRoom(roomCode) {
        this.sendMessage({
            type: 'joinRoom',
            roomCode: roomCode
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }
}