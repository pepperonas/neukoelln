import * as THREE from 'three';
import {InputManager} from '../core/input.js';
import {EntityManager} from './entityManager.js';
import {Car} from '../entities/vehicles/car.js';
import {Building} from '../entities/environment/building.js';
import {Player} from '../entities/characters/player.js';
import {NetworkManager} from '../network/networkManager.js';
import {Projectile} from '../entities/weapons/projectile.js';

export class GameManager {
    constructor(engine) {
        this.engine = engine;
        this.inputManager = new InputManager();
        this.entityManager = new EntityManager(engine.scene);
        this.networkManager = new NetworkManager(this);

        this.player = null;     // Spieler-Charakter
        this.playerCar = null;  // Auto des Spielers
        this.buildings = [];
        this.projectiles = [];  // Liste der aktiven Projektile
        this.isRunning = false;
        this.isMultiplayer = false;
        this.remotePlayers = new Map();
        this.remoteVehicles = new Map();

        this.playerScores = new Map(); // Speichert die Anzahl der gewonnenen Runden pro Spieler
        // Füge lokalen Spieler direkt zum Punktestand hinzu
        if (this.networkManager && this.networkManager.playerName) {
            this.playerScores.set(this.networkManager.playerName, 0);
        }
        this.lastKiller = null; // Speichert den letzten Spieler, der einen tödlichen Treffer erzielt hat
        this.roundActive = true; // Zeigt an, ob die aktuelle Runde aktiv ist
        this.roundRestartDelay = 5; // Verzögerung in Sekunden vor dem Neustart einer Runde
        this.restartCountdown = 0; // Countdown-Zähler für den Neustart

        // NEUE EIGENSCHAFTEN FÜR DIE DOPPELTREFFER-LÖSUNG
        this.hitProjectiles = new Set();       // Speichert IDs der Projektile, die bereits getroffen haben
        this.playerImmunityFrames = 0;         // Aktuelle Immunität in Frames
        this.playerImmunityDuration = 3;       // Dauer der Immunität nach Treffer
        this.frameCount = 0;                   // Frame-Zähler für periodisches Aufräumen

        // Tastenbindungen für Scoreboard einrichten
        this.setupScoreboardHotkey();

        window.gameManager = this;

        // Tasten-Status-Tracking
        this.keyStatus = {
            E: false,
            SPACE: false
        };

        // Debug-Flag
        this.debug = true;

        // Kollisionsdelay für einfachere Steuerung
        this.collisionDelay = 0;

        // Set up the update method
        this.engine.update = (deltaTime) => this.update(deltaTime);
    }

    safeRemoveProjectile(projectile) {
        if (!projectile) return;

        // Deaktiviere Projektil
        projectile.isActive = false;

        // Aus EntityManager entfernen
        this.entityManager.remove(projectile);

        // Aus Projektil-Array entfernen
        const index = this.projectiles.indexOf(projectile);
        if (index !== -1) {
            this.projectiles.splice(index, 1);
        }
    }

    startGame() {
        // Create the ground
        this.createGround();

        // Create road markings
        this.createRoadMarkings();

        // Create buildings
        this.createBuildings();

        // Erstelle Spieler-Charakter mit Position abhängig von Spielerrolle
        this.createPlayerAtPosition(this.getPlayerStartPosition());

        // Create player car with position abhängig von Spielerrolle
        this.createPlayerCarAtPosition(this.getCarStartPosition());

        // Set up camera
        this.setupCamera();

        this.isRunning = true;

        // Start the engine
        this.engine.start();

        // Health-UI anzeigen
        this.showHealthUI();

        // Punkteanzeige initialisieren
        this.showScoreUI();

        if (this.debug) {
            console.log("Spiel gestartet!");
            console.log("Spieler:", this.player);
            console.log("Auto:", this.playerCar);
            console.log("Gebäude:", this.buildings.length);
        }
    }

    pauseGame() {
        this.isRunning = false;
        this.engine.stop();
    }

    resumeGame() {
        this.isRunning = true;
        this.engine.start();
    }

    stopGame() {
        this.isRunning = false;
        this.engine.stop();

        // Netzwerk-Updates stoppen
        if (this.networkUpdateInterval) {
            clearInterval(this.networkUpdateInterval);
            this.networkUpdateInterval = null;
        }

        // Remote-Spieler entfernen
        if (this.remotePlayers) {
            this.remotePlayers.forEach(player => {
                this.entityManager.remove(player);
            });
            this.remotePlayers.clear();
        }

        // Remote-Fahrzeuge entfernen
        if (this.remoteVehicles) {
            this.remoteVehicles.forEach(vehicle => {
                this.entityManager.remove(vehicle);
            });
            this.remoteVehicles.clear();
        }

        // Cleanup
        this.entityManager.clear();
        this.buildings = [];
        this.player = null;
        this.playerCar = null;
        this.projectiles = [];
    }

    showHealthUI() {
        // Falls der Gesundheitsbalken schon existiert, aktualisiere ihn nur
        if (this.healthUI) {
            this.updateHealthUI();
            return;
        }

        // Container für UI erstellen
        this.healthUI = document.createElement('div');
        this.healthUI.style.position = 'fixed';
        this.healthUI.style.bottom = '20px';
        this.healthUI.style.left = '20px';
        this.healthUI.style.width = '200px';
        this.healthUI.style.height = '30px';
        this.healthUI.style.backgroundColor = '#333';
        this.healthUI.style.border = '2px solid #666';
        this.healthUI.style.borderRadius = '5px';
        this.healthUI.style.overflow = 'hidden';
        this.healthUI.style.zIndex = '1000';

        // Gesundheitsbalken erstellen
        this.healthBar = document.createElement('div');
        this.healthBar.style.height = '100%';
        this.healthBar.style.backgroundColor = '#4CAF50'; // Grün
        this.healthBar.style.width = '100%';
        this.healthBar.style.transition = 'width 0.3s, background-color 0.3s';

        // HP-Text erstellen
        this.healthText = document.createElement('div');
        this.healthText.style.position = 'absolute';
        this.healthText.style.top = '0';
        this.healthText.style.left = '0';
        this.healthText.style.width = '100%';
        this.healthText.style.height = '100%';
        this.healthText.style.display = 'flex';
        this.healthText.style.justifyContent = 'center';
        this.healthText.style.alignItems = 'center';
        this.healthText.style.color = 'white';
        this.healthText.style.fontFamily = 'Arial, sans-serif';
        this.healthText.style.fontWeight = 'bold';
        this.healthText.style.textShadow = '1px 1px 2px #000';

        // UI zusammenbauen und zum Dokument hinzufügen
        this.healthUI.appendChild(this.healthBar);
        this.healthUI.appendChild(this.healthText);
        document.body.appendChild(this.healthUI);

        // Initialen Zustand setzen
        this.updateHealthUI();
    }

    updateHealthUI() {
        if (!this.healthUI || !this.player) return;

        const healthPercent = Math.max(0, Math.min(100, (this.player.health / this.player.maxHealth) * 100));
        this.healthBar.style.width = `${healthPercent}%`;
        this.healthText.textContent = `HP: ${Math.floor(this.player.health)} / ${this.player.maxHealth}`;

        // Farbe je nach Gesundheitszustand ändern
        if (healthPercent > 60) {
            this.healthBar.style.backgroundColor = '#4CAF50'; // Grün
        } else if (healthPercent > 30) {
            this.healthBar.style.backgroundColor = '#FFC107'; // Gelb
        } else {
            this.healthBar.style.backgroundColor = '#F44336'; // Rot
        }
    }

    showDamageIndicator(damage) {
        // Erstelle ein fliegendes Schadenslabel
        const damageIndicator = document.createElement('div');
        damageIndicator.textContent = `-${damage}`;
        damageIndicator.style.position = 'fixed';
        damageIndicator.style.color = 'red';
        damageIndicator.style.fontWeight = 'bold';
        damageIndicator.style.fontSize = '24px';
        damageIndicator.style.textShadow = '2px 2px 4px #000';
        damageIndicator.style.zIndex = '1001';

        // Positioniere es zufällig über dem Spielbereich
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        damageIndicator.style.left = `${centerX + (Math.random() * 100 - 50)}px`;
        damageIndicator.style.top = `${centerY + (Math.random() * 100 - 50)}px`;

        // Füge es zum Dokument hinzu
        document.body.appendChild(damageIndicator);

        // Animation
        let opacity = 1;
        let posY = parseInt(damageIndicator.style.top);

        const animInterval = setInterval(() => {
            opacity -= 0.05;
            posY -= 2;

            damageIndicator.style.opacity = opacity;
            damageIndicator.style.top = `${posY}px`;

            if (opacity <= 0) {
                clearInterval(animInterval);
                if (damageIndicator.parentNode) {
                    damageIndicator.parentNode.removeChild(damageIndicator);
                }
            }
        }, 50);

        // Aktualisiere die Health-Anzeige
        this.updateHealthUI();
    }

    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.5;
        ground.receiveShadow = true;
        this.engine.scene.add(ground);
    }

    createRoadMarkings() {
        const roadMarkingGeometry = new THREE.PlaneGeometry(0.2, 5);
        const roadMarkingMaterial = new THREE.MeshStandardMaterial({color: 0xffffff});

        for (let i = -40; i <= 40; i += 10) {
            for (let j = -40; j <= 40; j += 10) {
                const roadMarking = new THREE.Mesh(roadMarkingGeometry, roadMarkingMaterial);
                roadMarking.rotation.x = -Math.PI / 2;
                roadMarking.position.set(i, -0.49, j);
                roadMarking.receiveShadow = true;
                this.engine.scene.add(roadMarking);
            }
        }
    }

    createBuildings() {
        const citySize = 40;
        const buildingDensity = 15;

        for (let i = 0; i < buildingDensity; i++) {
            const width = Math.random() * 5 + 3;
            const depth = Math.random() * 5 + 3;
            const height = Math.random() * 10 + 5;
            const x = Math.random() * citySize * 2 - citySize;
            const z = Math.random() * citySize * 2 - citySize;

            // Don't place buildings on the road
            if (Math.abs(x) < 5 || Math.abs(z) < 5) continue;

            const building = new Building(x, z, width, depth, height);
            this.buildings.push(this.entityManager.add(building));
        }

        if (this.debug) {
            console.log(`${this.buildings.length} Gebäude erstellt`);
        }
    }

    // Neue Methoden für Startpositionen:
    getPlayerStartPosition() {
        // Host startet links, Client startet rechts
        if (this.isMultiplayer) {
            if (this.networkManager.isHost) {
                return {x: -15, y: 0, z: 0};
            } else {
                return {x: 15, y: 0, z: 0};
            }
        }
        // Einzelspieler startet in der Mitte
        return {x: 0, y: 0, z: 0};
    }

    getCarStartPosition() {
        // Auto wird in der Nähe des Spielers platziert
        const playerPos = this.getPlayerStartPosition();
        // Host: Auto links vom Spieler
        if (this.isMultiplayer) {
            if (this.networkManager.isHost) {
                return {x: playerPos.x - 5, y: 0, z: playerPos.z};
            } else {
                // Client: Auto rechts vom Spieler
                return {x: playerPos.x + 5, y: 0, z: playerPos.z};
            }
        }
        // Einzelspieler: Auto rechts vom Spieler
        return {x: playerPos.x + 3, y: 0, z: playerPos.z};
    }

    // Neue Methoden für die Erstellung an bestimmten Positionen:
    createPlayerAtPosition(position) {
        // Nur erstellen, wenn noch kein Spieler existiert
        if (this.player) {
            console.warn("Versuch, einen Spieler zu erstellen, obwohl bereits einer existiert!");
            return this.player;
        }

        // Erstelle einen neuen Spieler
        this.player = new Player();
        this.entityManager.add(this.player);

        // Setze die Position des Spielers
        this.player.setPosition(position.x, position.y, position.z);

        // Stelle sicher, dass der Spieler sichtbar ist
        if (this.player.mesh) {
            this.player.mesh.visible = true;
        }

        return this.player;
    }

    createPlayerCarAtPosition(position) {
        // Stelle sicher, dass nur ein Player-Auto existiert
        if (this.playerCar) {
            this.entityManager.remove(this.playerCar);
        }

        this.playerCar = new Car();
        this.entityManager.add(this.playerCar);

        // Setze Position und Rotation
        this.playerCar.position.set(position.x, position.y, position.z);
        this.playerCar.rotation = 0;
        this.playerCar.speed = 0;

        // Aktualisiere die Mesh-Position
        if (this.playerCar.mesh) {
            this.playerCar.mesh.position.copy(this.playerCar.position);
            this.playerCar.mesh.rotation.y = this.playerCar.rotation;
        }

        return this.playerCar;
    }

    setupCamera() {
        // Position the camera based on the player
        this.engine.camera.position.set(0, 15, 0);
        if (this.player) {
            this.engine.camera.lookAt(this.player.position);
        }
    }

    update(deltaTime) {
        if (!this.isRunning) return;

        // Alle 60 Frames das hitProjectiles-Set leeren
        if (this.frameCount % 60 === 0) {
            this.hitProjectiles.clear();
        }

        // Speichere alte Positionen für Kollisionsrücksetzen
        let playerOldPos = null;
        let carOldPos = null;

        if (this.player && this.player.isActive) {
            playerOldPos = this.player.position.clone();
        }

        if (this.playerCar && this.playerCar.isActive) {
            carOldPos = this.playerCar.position.clone();
        }

        // Update all entities (OHNE Kollisionserkennung)
        this.entityManager.update(deltaTime, this.inputManager);

        // Wichtig: Für den Spieler IMMER Kollisionen prüfen (ohne Delay)
        if (this.player && !this.player.inVehicle && playerOldPos) {
            this.handlePlayerCollisions(playerOldPos);
        }

        // Für das Auto mit Delay prüfen
        if (this.playerCar && carOldPos) {
            if (this.collisionDelay <= 0) {
                this.handleCarCollisions(carOldPos);
            }
        }

        // Aktualisiere die zu verfolgende Entität für die Kamera
        let trackEntity = this.player;
        if (this.player && this.player.inVehicle) {
            trackEntity = this.player.inVehicle;
        }

        // Prüfe, ob der Spieler mit der E-Taste in ein Fahrzeug einsteigen will
        this.handleVehicleInteraction();

        // Prüfe Projektile vom Spieler
        this.handlePlayerProjectiles();

        // Check boundaries
        this.checkBoundaries(trackEntity);

        // Update camera to follow player or vehicle
        this.updateCamera(trackEntity);

        // Update debug info
        if (typeof window.gameDebug !== 'undefined') {
            window.gameDebug.updateDebugInfo(this.player, this.playerCar);
        }

        // Projektile aktualisieren und aufräumen
        this.updateProjectiles();

        // Hier ist ein direkter Aufruf von handleProjectileCollisions
        this.handleProjectileCollisions();

        if (this.player) {
            this.updateHealthUI();
        }

        // Aktualisiere die Score-UI (alle 2 Sekunden)
        if (!this.lastScoreUpdate || (Date.now() - this.lastScoreUpdate) > 2000) {
            this.updateScoreUI();
            this.lastScoreUpdate = Date.now();
        }

        // Reduziere Kollisions-Delay
        if (this.collisionDelay > 0) {
            this.collisionDelay--;
        }

        if (this.isMultiplayer) {
            // Sende regelmäßige Aktualisierungen an andere Spieler
            this.sendPlayerUpdate();
        }
    }

    handleVehicleInteraction() {
        // Prüfe, ob E-Taste gedrückt wurde - Einmalpresse erkennen
        const ePressed = this.inputManager.isPressed('KeyE');

        if (ePressed && !this.keyStatus.E) {
            this.keyStatus.E = true; // Markieren, dass die Taste gedrückt ist

            if (this.player.inVehicle) {
                // Aussteigen
                if (this.debug) console.log("Versuche auszusteigen...");

                this.player.exitVehicle();
            } else {
                // Einsteigen, wenn ein Auto in der Nähe ist
                const distance = this.player.position.distanceTo(this.playerCar.position);

                if (distance < 3) {
                    if (this.debug) console.log("Versuche einzusteigen...");

                    // Spieler ins Auto setzen
                    this.playerCar.setDriver(this.player);
                }
            }
        } else if (!ePressed) {
            // E-Taste wurde losgelassen
            this.keyStatus.E = false;
        }
    }

    handlePlayerProjectiles() {
        // Prüfe, ob Leertaste gedrückt wurde für Schießen
        const spacePressed = this.inputManager.isPressed('Space');

        if (spacePressed && !this.keyStatus.SPACE) {
            // Nur einmal pro Tastendruck auslösen

            // Wenn Spieler zu Fuß ist und schießt
            if (this.player && !this.player.inVehicle) {
                if (this.debug) console.log("Versuche zu schießen...");

                const projectile = this.player.shoot();

                if (projectile) {
                    // Füge Projektil zum EntityManager hinzu
                    this.projectiles.push(this.entityManager.add(projectile));

                    // Im Multiplayer-Modus: Teile anderen Spielern mit, dass du geschossen hast
                    if (this.isMultiplayer) {
                        const projectileData = {
                            type: 'player_shoot',
                            position: {
                                x: projectile.position.x,
                                y: projectile.position.y,
                                z: projectile.position.z
                            },
                            direction: {
                                x: projectile.direction.x,
                                y: projectile.direction.y,
                                z: projectile.direction.z
                            },
                            speed: projectile.speed,
                            damage: projectile.damage
                        };

                        console.log("Sende Schussdaten:", projectileData);
                        this.networkManager.sendGameData(projectileData);
                    }
                }
            }

            this.keyStatus.SPACE = true;
        } else if (!spacePressed) {
            // Leertaste wurde losgelassen
            this.keyStatus.SPACE = false;
        }
    }

    createRemoteProjectile(playerId, projectileData) {
        console.log(`Erstelle Remote-Projektil für Spieler ${playerId}:`, projectileData);

        // Finde den Remote-Spieler
        if (!this.remotePlayers.has(playerId)) {
            console.warn(`Kann Projektil nicht erstellen: Remote-Spieler ${playerId} nicht gefunden`);
            return;
        }

        const remotePlayer = this.remotePlayers.get(playerId);

        try {
            // Erstelle ein neues Projektil
            const position = new THREE.Vector3(
                projectileData.position.x,
                projectileData.position.y,
                projectileData.position.z
            );

            const direction = new THREE.Vector3(
                projectileData.direction.x,
                projectileData.direction.y,
                projectileData.direction.z
            );

            const projectile = new Projectile({
                position: position,
                direction: direction,
                speed: projectileData.speed || 0.5,
                damage: projectileData.damage || 10,
                lifeTime: 1.5,
                owner: remotePlayer
            });

            // Füge Projektil zum EntityManager hinzu
            const addedProjectile = this.entityManager.add(projectile);
            this.projectiles.push(addedProjectile);

            console.log(`Remote-Projektil erfolgreich erstellt und hinzugefügt`);
        } catch (error) {
            console.error("Fehler beim Erstellen des Remote-Projektils:", error);
        }
    }

    updateProjectiles() {
        // Entferne inaktive Projektile aus der Liste
        this.projectiles = this.projectiles.filter(p => {
            if (!p || !p.isActive) {
                this.entityManager.remove(p);
                return false;
            }
            return true;
        });
    }

    handleProjectileCollisions() {
        // Verarbeite Spieler-Immunität
        if (this.playerImmunityFrames > 0) {
            this.playerImmunityFrames--;
        }

        // Tracking für Projektile, die bereits in diesem Frame verarbeitet wurden
        const processedProjectiles = new Set();

        this.projectiles.forEach(projectile => {
            if (!projectile || !projectile.isActive || !projectile.mesh) return;

            // SICHERHEIT 1: Überprüfe, ob dieses Projektil bereits einen Treffer verursacht hat
            if (this.hitProjectiles.has(projectile.id)) {
                // Dieses Projektil hat bereits getroffen, entferne es sofort
                this.safeRemoveProjectile(projectile);
                return;
            }

            // SICHERHEIT 2: Überprüfe, ob dieses Projektil bereits in diesem Frame verarbeitet wurde
            if (processedProjectiles.has(projectile.id)) return;

            // Projektil-Bounding Box
            const projectileBox = new THREE.Box3().setFromObject(projectile.mesh);

            // Prüfe Kollision mit Gebäuden
            for (const building of this.buildings) {
                if (!building || !building.mesh || !building.isActive) continue;

                const buildingBox = new THREE.Box3().setFromObject(building.mesh);

                if (buildingBox.intersectsBox(projectileBox)) {
                    // Markiere Projektil als getroffen
                    this.hitProjectiles.add(projectile.id);
                    processedProjectiles.add(projectile.id);

                    // Entferne Projektil sicher
                    this.safeRemoveProjectile(projectile);

                    if (this.debug) console.log("Projektil trifft Gebäude");
                    return; // Früher Rücksprung nach Kollision
                }
            }

            // Wenn das Projektil nicht mehr aktiv ist, überspringe den Rest
            if (!projectile.isActive) return;

            // Berechne zufälligen Schaden zwischen 15 und 35 HP
            const randomDamage = Math.floor(Math.random() * 21) + 15;

            // Prüfe Kollision mit Remote-Spielern
            this.remotePlayers.forEach((remotePlayer, playerId) => {
                if (!remotePlayer.mesh || !remotePlayer.isActive || projectile.owner === remotePlayer) return;

                // Erstelle eine vergrößerte BoundingBox für bessere Treffergenauigkeit
                const remotePlayerBox = new THREE.Box3().setFromObject(remotePlayer.mesh);
                // Erweitere die Box um 0.5 Einheiten in jede Richtung
                remotePlayerBox.min.x -= 0.5;
                remotePlayerBox.min.y -= 0.5;
                remotePlayerBox.min.z -= 0.5;
                remotePlayerBox.max.x += 0.5;
                remotePlayerBox.max.y += 0.5;
                remotePlayerBox.max.z += 0.5;

                if (remotePlayerBox.intersectsBox(projectileBox)) {
                    // Markiere Projektil als getroffen
                    this.hitProjectiles.add(projectile.id);
                    processedProjectiles.add(projectile.id);

                    // Entferne Projektil sicher
                    this.safeRemoveProjectile(projectile);

                    // Schaden an den getroffenen Spieler senden
                    this.sendDamageEvent(playerId, randomDamage);

                    console.log(`Remote-Spieler ${playerId} wurde getroffen! Schaden: ${randomDamage}`);
                    return; // Früher Rücksprung nach Kollision
                }
            });

            // Wenn das Projektil nicht mehr aktiv ist, überspringe den Rest
            if (!projectile.isActive) return;

            // Prüfe Kollision mit lokalem Spieler
            if (this.player && this.player.mesh && projectile.owner !== this.player && this.player.isActive) {
                // SICHERHEIT 3: Überprüfe, ob der Spieler gerade immun ist
                if (this.playerImmunityFrames > 0) {
                    return; // Spieler ist immun, keine Kollisionsprüfung
                }

                // Erstelle eine vergrößerte BoundingBox für bessere Treffergenauigkeit
                const playerBox = new THREE.Box3().setFromObject(this.player.mesh);
                // Erweitere die Box um 0.5 Einheiten in jede Richtung
                playerBox.min.x -= 0.5;
                playerBox.min.y -= 0.5;
                playerBox.min.z -= 0.5;
                playerBox.max.x += 0.5;
                playerBox.max.y += 0.5;
                playerBox.max.z += 0.5;

                if (playerBox.intersectsBox(projectileBox)) {
                    // Markiere Projektil als getroffen
                    this.hitProjectiles.add(projectile.id);
                    processedProjectiles.add(projectile.id);

                    // Setze Immunität für einige Frames
                    this.playerImmunityFrames = this.playerImmunityDuration;

                    // Treffer! Schaden am Spieler verursachen mit Angabe des Schützen als Quelle
                    this.player.damage(randomDamage, projectile.owner);

                    // Entferne Projektil sicher
                    this.safeRemoveProjectile(projectile);

                    // Beim getroffenen Spieler nur die Schadensanzeige zeigen, nicht das Treffer-Label
                    this.showDamageIndicator(randomDamage);
                    this.updateHealthUI();

                    // Nur die Bestätigung an den Schützen senden, KEINE lokale Trefferanzeige
                    if (projectile.owner && this.isMultiplayer) {
                        this.sendHitConfirmation(projectile.owner);
                        // ENTFERNT: this.showHitIndicator(this.player);
                    }

                    console.log(`Lokaler Spieler wurde getroffen! Schaden: ${randomDamage}, verbleibende Gesundheit: ${this.player.health}`);
                    return; // Früher Rücksprung nach Kollision
                }
            }

            // Wenn das Projektil nicht mehr aktiv ist, überspringe den Rest
            if (!projectile.isActive) return;

            // Prüfe Kollision mit lokalem Fahrzeug
            if (this.playerCar && this.playerCar.mesh && projectile.owner !== this.playerCar && this.playerCar.isActive) {
                const carBox = new THREE.Box3().setFromObject(this.playerCar.mesh);

                if (carBox.intersectsBox(projectileBox)) {
                    // Markiere Projektil als getroffen
                    this.hitProjectiles.add(projectile.id);
                    processedProjectiles.add(projectile.id);

                    // Entferne Projektil sicher
                    this.safeRemoveProjectile(projectile);

                    this.playerCar.damage(randomDamage);
                    console.log("Projektil trifft lokales Auto, Schaden:", randomDamage);
                    return; // Früher Rücksprung nach Kollision
                }
            }

            // Wenn das Projektil nicht mehr aktiv ist, überspringe den Rest
            if (!projectile.isActive) return;

            // Prüfe Kollision mit Remote-Fahrzeugen
            this.remoteVehicles.forEach((remoteCar, playerId) => {
                if (!remoteCar.mesh || !remoteCar.isActive || projectile.owner === remoteCar) return;

                const remoteCarBox = new THREE.Box3().setFromObject(remoteCar.mesh);

                if (remoteCarBox.intersectsBox(projectileBox)) {
                    // Markiere Projektil als getroffen
                    this.hitProjectiles.add(projectile.id);
                    processedProjectiles.add(projectile.id);

                    // Entferne Projektil sicher
                    this.safeRemoveProjectile(projectile);

                    // Schaden am Fahrzeug senden
                    this.sendVehicleDamageEvent(playerId, randomDamage);

                    console.log(`Remote-Fahrzeug ${playerId} wurde getroffen! Schaden: ${randomDamage}`);
                    return; // Früher Rücksprung nach Kollision
                }
            });
        });
    }

    showHitIndicator(hitPlayer) {
        // Erstelle ein fliegendes Trefferlabel
        const hitIndicator = document.createElement('div');
        hitIndicator.textContent = `✓ Treffer!`;
        hitIndicator.style.position = 'fixed';
        hitIndicator.style.color = '#00ff00'; // Grün für Treffer
        hitIndicator.style.fontWeight = 'bold';
        hitIndicator.style.fontSize = '24px';
        hitIndicator.style.textShadow = '2px 2px 4px #000';
        hitIndicator.style.zIndex = '1001';

        // Positioniere es in der Mitte des Bildschirms
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        hitIndicator.style.left = `${centerX - 50 + (Math.random() * 100 - 50)}px`;
        hitIndicator.style.top = `${centerY - 50 + (Math.random() * 100 - 50)}px`;

        // Füge es zum Dokument hinzu
        document.body.appendChild(hitIndicator);

        // Animation
        let opacity = 1;
        let posY = parseInt(hitIndicator.style.top);

        const animInterval = setInterval(() => {
            opacity -= 0.05;
            posY -= 2;

            hitIndicator.style.opacity = opacity;
            hitIndicator.style.top = `${posY}px`;

            if (opacity <= 0) {
                clearInterval(animInterval);
                if (hitIndicator.parentNode) {
                    hitIndicator.parentNode.removeChild(hitIndicator);
                }
            }
        }, 50);
    }

    sendScoreUpdate(playerId, score) {
        if (!this.isMultiplayer) return;

        const scoreData = {
            type: 'score_update',
            playerId: playerId,
            score: score
        };

        console.log(`Sende Punktestand-Update für ${playerId}: ${score}`);
        this.networkManager.sendGameData(scoreData);
    }

    sendHitConfirmation(shooter) {
        if (!this.isMultiplayer) return;

        // Ermittle die ID des Schützen
        let shooterId = null;
        if (shooter.id) {
            shooterId = shooter.id.startsWith('remote_') ? shooter.id.substring(7) : shooter.id;
        }

        if (!shooterId) return;

        const hitData = {
            type: 'hit_confirmation',
            targetId: this.networkManager.playerName, // Ich wurde getroffen
            // Keine Schadensinformation in der Bestätigung
        };

        console.log(`Sende Trefferbestätigung an Schützen ${shooterId}`);
        this.networkManager.sendGameData(hitData);
    }

    sendVehicleDamageEvent(targetId, damage) {
        if (!this.isMultiplayer) return;

        const damageData = {
            type: 'vehicle_damage',
            targetId: targetId,
            damage: damage
        };

        console.log(`Sende Fahrzeugschadensdaten an Spieler ${targetId}:`, damageData);
        this.networkManager.sendGameData(damageData);
    }

    handlePlayerCollisions(oldPos) {
        if (!this.player || !this.player.mesh || !oldPos) return false;

        // Falls der Spieler nicht aktiv ist, keine Kollisionsprüfung durchführen
        if (!this.player.isActive) return false;

        // Erstelle eine BoundingBox für den Spieler
        const playerBox = new THREE.Box3().setFromObject(this.player.mesh);
        let hasCollision = false;

        // Prüfe Kollision mit Gebäuden
        for (const building of this.buildings) {
            if (!building || !building.mesh || !building.isActive) continue;

            const buildingBox = new THREE.Box3().setFromObject(building.mesh);

            if (buildingBox.intersectsBox(playerBox)) {
                hasCollision = true;
                break;
            }
        }

        // Wenn eine Kollision erkannt wurde, setze Position zurück
        if (hasCollision) {
            // Position direkt über die setPosition-Methode zurücksetzen, nicht über position.copy
            this.player.setPosition(oldPos.x, oldPos.y, oldPos.z);

            // Explizit prüfen, ob mesh vorhanden ist, bevor Position gesetzt wird
            if (this.player.mesh) {
                this.player.mesh.position.copy(oldPos);
            }

            return true;
        }

        return false;
    }

    sendDamageEvent(targetId, damage) {
        if (!this.isMultiplayer) return;

        const damageData = {
            type: 'player_damage',
            targetId: targetId,
            damage: damage
        };

        console.log(`Sende Schadensdaten an Spieler ${targetId}:`, damageData);
        this.networkManager.sendGameData(damageData);
    }

    handleCarCollisions(oldPos) {
        if (!this.playerCar || !this.playerCar.mesh || !oldPos) return false;

        // Erstelle eine BoundingBox für das Auto
        const carBox = new THREE.Box3().setFromObject(this.playerCar.mesh);
        let hasCollision = false;

        // Prüfe Kollision mit Gebäuden
        for (const building of this.buildings) {
            if (!building || !building.mesh) continue;

            const buildingBox = new THREE.Box3().setFromObject(building.mesh);

            if (buildingBox.intersectsBox(carBox)) {
                hasCollision = true;
                break;
            }
        }

        // Wenn eine Kollision erkannt wurde, setze Position zurück und "pralle ab"
        if (hasCollision) {
            this.playerCar.position.copy(oldPos);
            this.playerCar.mesh.position.copy(oldPos);

            // Setze Geschwindigkeit zurück und füge ein deutliches "Abprallen" hinzu
            this.playerCar.speed = -this.playerCar.speed * 0.75;

            // Wenn ein Fahrer im Auto ist, aktualisiere auch dessen Position
            if (this.playerCar.driver) {
                this.playerCar.driver.position.copy(oldPos);
                if (this.playerCar.driver.mesh) {
                    this.playerCar.driver.mesh.position.copy(oldPos);
                }
            }

            return true;
        }

        return false;
    }

    checkBoundaries(entity) {
        if (!entity || !entity.mesh) return;

        const boundary = 45;
        let boundaryHit = false;

        // X-Grenze
        if (entity.position.x > boundary) {
            entity.position.x = boundary;
            boundaryHit = true;
        } else if (entity.position.x < -boundary) {
            entity.position.x = -boundary;
            boundaryHit = true;
        }

        // Z-Grenze
        if (entity.position.z > boundary) {
            entity.position.z = boundary;
            boundaryHit = true;
        } else if (entity.position.z < -boundary) {
            entity.position.z = -boundary;
            boundaryHit = true;
        }

        // Bei Grenzüberschreitung Geschwindigkeit reduzieren (nur für Fahrzeug)
        if (boundaryHit) {
            if (entity === this.playerCar) {
                entity.speed *= -0.3;
            }

            // Aktualisiere Mesh-Position
            entity.mesh.position.copy(entity.position);
        }
    }

    updateCamera(target) {
        if (!target) return;

        // GTA-Stil-Kamera: Folgt dem Spieler oder Fahrzeug
        const isInVehicle = this.player && this.player.inVehicle;
        const height = isInVehicle ? 15 : 8; // Höhere Kamera für Fahrzeug, niedrigere für Spieler zu Fuß
        const distance = isInVehicle ? 5 : 3; // Größerer Abstand für Fahrzeug

        this.engine.camera.position.set(
            target.position.x,
            height,
            target.position.z + distance
        );
        this.engine.camera.lookAt(target.position);
    }

    // Debug-Info-Aktualisierung
    updateDebugInfo() {
        if (window.gameDebug && typeof window.gameDebug.updateDebugInfo === 'function') {
            window.gameDebug.updateDebugInfo(this.player, this.playerCar);
        }
    }

    startNetworkUpdates() {
        if (!this.isMultiplayer) return;

        // Alle 100ms Position und Zustand senden
        this.networkUpdateInterval = setInterval(() => {
            this.sendPlayerUpdate();
        }, 100);
    }

    setupMultiplayerEvents() {
        // Generischer Handler für alle Spielerdaten
        this.networkManager.onGameData = (data) => {
            if (!data || !data.senderId) return;

            // Ignoriere deine eigenen Updates
            if (data.senderId === this.networkManager.playerName) {
                return;
            }

            const gameData = data.data;

            // Je nach Datentyp verschiedene Handler aufrufen
            if (gameData.type === 'world_data') {
                console.log("Weltdaten empfangen:", gameData);
                this.createWorldFromData(gameData);
            } else if (gameData.type === 'player_update') {
                this.updateRemotePlayer(data.senderId, gameData);
            } else if (gameData.type === 'player_shoot') {
                this.createRemoteProjectile(data.senderId, gameData);
            } else if (gameData.type === 'player_damage') {
                // Prüfe, ob ich das Ziel bin
                if (gameData.targetId === this.networkManager.playerName) {
                    console.log(`Ich (${this.networkManager.playerName}) wurde getroffen! Schaden: ${gameData.damage}`);
                    this.player.damage(gameData.damage);
                    if (typeof this.showDamageIndicator === 'function') {
                        this.showDamageIndicator(gameData.damage);
                    }
                    if (typeof this.updateHealthUI === 'function') {
                        this.updateHealthUI();
                    }
                }
            } else if (gameData.type === 'vehicle_damage') {
                // Prüfe, ob mein Fahrzeug das Ziel ist
                if (gameData.targetId === this.networkManager.playerName && this.playerCar) {
                    console.log(`Mein Fahrzeug wurde getroffen! Schaden: ${gameData.damage}`);
                    this.playerCar.damage(gameData.damage);
                }
            } else if (gameData.type === 'game_restart') {
                // NEUER HANDLER: Spielneustart
                console.log("Neustart-Event empfangen von Spieler:", data.senderId);
                this.handleRemoteRestart();
            } else if (gameData.type === 'hit_confirmation') {
                // Zeige Treffermeldung ohne Schaden an
                console.log("Trefferbestätigung erhalten von:", data.senderId);

                // Finde den getroffenen Spieler in unseren Remote-Spielern
                const targetId = gameData.targetId;
                const remotePlayerId = `remote_${targetId}`;

                if (this.remotePlayers.has(remotePlayerId)) {
                    const remotePlayer = this.remotePlayers.get(remotePlayerId);
                    this.showHitIndicator(remotePlayer);
                } else {
                    // Fallback, wenn wir den Spieler nicht finden können
                    this.showHitIndicator({id: targetId});
                }
            } else if (gameData.type === 'score_update') {
                const playerId = gameData.playerId;
                const score = gameData.score;

                console.log(`Punktestand-Update empfangen für ${playerId}: ${score}`);

                // Punktestand aktualisieren
                this.playerScores.set(playerId, score);

                // UI aktualisieren
                this.updateScoreUI();
            }
        };
    }

    handleRemoteRestart() {
        console.log("Starte lokales Spiel neu aufgrund eines Remote-Neustarts");

        // Entferne bestehenden Todesbildschirm, falls vorhanden
        const deathScreen = document.getElementById('death-screen');
        if (deathScreen) {
            document.body.removeChild(deathScreen);
        }

        // Breche laufenden Countdown ab
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }

        // Setze Spieler zurück
        this.resetPlayer();

        // Setze Fahrzeuge zurück
        this.resetVehicles();

        // Stelle sicher, dass alle Remote-Spieler sichtbar sind
        this.remotePlayers.forEach((remotePlayer, playerId) => {
            if (remotePlayer.mesh) {
                remotePlayer.mesh.visible = true;

                // Auch alle Kind-Meshes sichtbar machen
                if (remotePlayer.mesh.children) {
                    remotePlayer.mesh.children.forEach(child => {
                        child.visible = true;
                    });
                }

                console.log(`Remote-Spieler ${playerId} nach Neustart wieder sichtbar gemacht`);
            }

            // Aktiviere den Spieler wieder
            remotePlayer.isActive = true;
        });

        // Entferne alle Projektile
        this.projectiles.forEach(projectile => {
            this.entityManager.remove(projectile);
        });
        this.projectiles = [];

        // Aktiviere die Runde
        this.roundActive = true;

        // Starte das Spiel wieder, falls es pausiert war
        if (!this.isRunning) {
            this.resumeGame();
        }

        console.log("Lokales Spiel wurde nach Remote-Neustart neu gestartet");
    }

    updateRemotePlayer(playerId, playerData) {
        console.log(`Aktualisiere Remote-Spieler ${playerId} (bin ${this.networkManager.playerName}):`, playerData);

        // Erstelle oder aktualisiere Remote-Spieler
        if (!this.remotePlayers.has(playerId)) {
            console.log(`Erstelle neuen Remote-Spieler: ${playerId}`);
            // Erstelle neuen Remote-Spieler
            const remotePlayer = new Player({
                color: 0x00ff00  // Grüne Farbe für Remote-Spieler
            });

            // Setze eindeutige ID
            remotePlayer.id = `remote_${playerId}`;

            // Füge zum EntityManager hinzu
            this.entityManager.add(remotePlayer);

            // Speichere Referenz
            this.remotePlayers.set(playerId, remotePlayer);

            console.log(`Neuer Remote-Spieler erstellt: ${playerId}`);
        }

        // Spieler-Referenz abrufen
        const remotePlayer = this.remotePlayers.get(playerId);

        // Position und Rotation aktualisieren
        if (playerData.position) {
            remotePlayer.setPosition(
                playerData.position.x,
                playerData.position.y,
                playerData.position.z
            );
        }

        if (playerData.rotation !== undefined) {
            remotePlayer.setRotation(playerData.rotation);
        }

        // Fahrzeugstatus explizit setzen
        const wasInVehicle = remotePlayer.inVehicle;
        if (playerData.inVehicle && this.remoteVehicles.has(playerId)) {
            remotePlayer.inVehicle = this.remoteVehicles.get(playerId);
        } else {
            remotePlayer.inVehicle = null;
        }

        // Sichtbarkeit explizit setzen basierend auf Fahrzeugstatus
        if (remotePlayer.mesh) {
            if (playerData.inVehicle) {
                console.log(`Remote-Spieler ${playerId} im Fahrzeug - unsichtbar setzen`);
                remotePlayer.mesh.visible = false;

                // Auch alle Kind-Meshes unsichtbar setzen
                if (remotePlayer.mesh.children) {
                    remotePlayer.mesh.children.forEach(child => {
                        child.visible = false;
                    });
                }
            } else {
                console.log(`Remote-Spieler ${playerId} zu Fuß - sichtbar setzen`);
                remotePlayer.mesh.visible = true;

                // Auch alle Kind-Meshes sichtbar setzen
                if (remotePlayer.mesh.children) {
                    remotePlayer.mesh.children.forEach(child => {
                        child.visible = true;
                    });
                }
            }
        }

        // Fahrzeugdaten aktualisieren
        if (playerData.vehicle) {
            // Prüfen, ob wir bereits ein Fahrzeug für diesen Spieler haben
            if (!this.remoteVehicles.has(playerId)) {
                // Erstelle ein neues Fahrzeug für den Remote-Spieler
                const remoteCar = new Car({
                    color: 0xff0000 // Rote Farbe für Remote-Fahrzeuge
                });

                // Setze eindeutige ID
                remoteCar.id = `remote_vehicle_${playerId}`;

                // Füge zum EntityManager hinzu
                this.entityManager.add(remoteCar);

                // Speichere Referenz
                this.remoteVehicles.set(playerId, remoteCar);

                console.log(`Neues Remote-Fahrzeug erstellt: ${playerId}`);
            }

            // Fahrzeug-Referenz abrufen
            const remoteCar = this.remoteVehicles.get(playerId);

            // Position und Rotation aktualisieren
            if (playerData.vehicle.position) {
                remoteCar.position.set(
                    playerData.vehicle.position.x,
                    playerData.vehicle.position.y,
                    playerData.vehicle.position.z
                );

                if (remoteCar.mesh) {
                    remoteCar.mesh.position.copy(remoteCar.position);
                }
            }

            if (playerData.vehicle.rotation !== undefined) {
                remoteCar.rotation = playerData.vehicle.rotation;

                if (remoteCar.mesh) {
                    remoteCar.mesh.rotation.y = remoteCar.rotation;
                }
            }

            // Geschwindigkeit aktualisieren
            if (playerData.vehicle.speed !== undefined) {
                remoteCar.speed = playerData.vehicle.speed;
            }

            // Fahrerstatus aktualisieren
            const hasDriver = playerData.vehicle.hasDriver;
            if (hasDriver && playerData.inVehicle) {
                // Der Remote-Spieler sitzt im Auto
                if (remotePlayer) {
                    // Remote-Spieler ins Auto setzen (ohne die normale Logik auszuführen)
                    remotePlayer.inVehicle = remoteCar;
                    if (remotePlayer.mesh) {
                        remotePlayer.mesh.visible = false;

                        // Auch Kind-Meshes unsichtbar setzen
                        if (remotePlayer.mesh.children) {
                            remotePlayer.mesh.children.forEach(child => {
                                child.visible = false;
                            });
                        }
                    }

                    // Fahrzeug aktualisieren (ohne die normale Logik auszuführen)
                    remoteCar.driver = remotePlayer;
                }
            } else if (!hasDriver && remoteCar.driver) {
                // Der Remote-Spieler ist ausgestiegen
                if (remotePlayer) {
                    remotePlayer.inVehicle = null;
                    if (remotePlayer.mesh) {
                        remotePlayer.mesh.visible = true;

                        // Auch Kind-Meshes sichtbar setzen
                        if (remotePlayer.mesh.children) {
                            remotePlayer.mesh.children.forEach(child => {
                                child.visible = true;
                            });
                        }
                    }
                }

                remoteCar.driver = null;
            }
        }
    }

    sendPlayerUpdate() {
        if (!this.isMultiplayer || !this.player) return;

        // Debug-Status des lokalen Spielers
        console.log("Lokaler Spieler Status:", {
            inVehicle: this.player.inVehicle ? true : false,
            meshVisible: this.player.mesh ? this.player.mesh.visible : 'kein Mesh'
        });

        // Grunddaten des Spielers
        const playerData = {
            type: 'player_update',
            position: {
                x: this.player.position.x,
                y: this.player.position.y,
                z: this.player.position.z
            },
            rotation: this.player.rotation,
            inVehicle: this.player.inVehicle ? true : false,
            health: this.player.health
        };

        // Fahrzeugdaten hinzufügen, wenn wir ein Fahrzeug haben
        if (this.playerCar) {
            playerData.vehicle = {
                id: this.playerCar.id,
                position: {
                    x: this.playerCar.position.x,
                    y: this.playerCar.position.y,
                    z: this.playerCar.position.z
                },
                rotation: this.playerCar.rotation,
                speed: this.playerCar.speed,
                hasDriver: this.playerCar.driver ? true : false
            };
        }

        this.networkManager.sendGameData(playerData);
    }

    startMultiplayerGame() {
        this.isMultiplayer = true;

        // Bereite Struktur für Remote-Spieler vor
        this.remotePlayers = new Map();
        this.remoteVehicles = new Map();

        // Registriere Netzwerk-Event-Listener ZUERST, damit wir Weltdaten empfangen können
        this.setupMultiplayerEvents();

        // Host generiert die Welt und sendet die Daten
        if (this.networkManager.isHost) {
            // Starte das Spiel und generiere die Welt
            this.startGame();

            // Sende Gebäudedaten an alle Clients
            setTimeout(() => {
                this.sendWorldData();
            }, 1000); // Kurze Verzögerung, um sicherzustellen, dass die Welt vollständig generiert ist
        } else {
            // Clients warten auf Weltdaten vom Host
            this.showLoadingMessage("Warte auf Weltdaten vom Host...");
            // Hier nicht startGame() aufrufen - das wird in createWorldFromData gemacht
        }

        // Starte regelmäßige Positionsaktualisierungen
        this.startNetworkUpdates();

        this.debugScores();
    }

    // Neue Methode: Weltdaten senden (nur Host)
    sendWorldData() {
        if (!this.isMultiplayer || !this.networkManager.isHost) return;

        // Sammle Daten über alle Gebäude
        const buildingData = this.buildings.map(building => ({
            position: {
                x: building.position.x,
                y: building.position.y,
                z: building.position.z
            },
            dimensions: {
                width: building.width,
                height: building.height,
                depth: building.depth
            }
        }));

        // Sende Weltdaten an alle Clients
        const worldData = {
            type: 'world_data',
            buildings: buildingData
        };

        console.log("Sende Weltdaten:", worldData);
        this.networkManager.sendGameData(worldData);
    }

    // Neue Methode: Welt aus empfangenen Daten erstellen (nur Clients)
    createWorldFromData(worldData) {
        // Boden und Straßenmarkierungen erstellen
        this.createGround();
        this.createRoadMarkings();

        // Gebäude aus den empfangenen Daten erstellen
        if (worldData.buildings && worldData.buildings.length > 0) {
            worldData.buildings.forEach(buildingData => {
                const building = new Building(
                    buildingData.position.x,
                    buildingData.position.z,
                    buildingData.dimensions.width,
                    buildingData.dimensions.depth,
                    buildingData.dimensions.height
                );
                this.buildings.push(this.entityManager.add(building));
            });

            console.log(`${this.buildings.length} Gebäude aus Weltdaten erstellt`);
        }

        // Spieler und Auto erstellen - mit unterschiedlichen Startpositionen je nach Rolle
        this.createPlayerAtPosition(this.getPlayerStartPosition());
        this.createPlayerCarAtPosition(this.getCarStartPosition());

        // Kamera einrichten
        this.setupCamera();

        // Spiel starten
        this.isRunning = true;
        this.engine.start();

        // Health-UI anzeigen (WICHTIG: Auch für Clients!)
        this.showHealthUI();

        // Loading-Message entfernen
        this.hideLoadingMessage();
    }

    // Hilfsmethoden für Loading-Message
    showLoadingMessage(message) {
        // Erstelle oder aktualisiere eine Loading-Message im UI
        if (!this.loadingMessage) {
            this.loadingMessage = document.createElement('div');
            this.loadingMessage.style.position = 'fixed';
            this.loadingMessage.style.top = '50%';
            this.loadingMessage.style.left = '50%';
            this.loadingMessage.style.transform = 'translate(-50%, -50%)';
            this.loadingMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            this.loadingMessage.style.color = 'white';
            this.loadingMessage.style.padding = '20px';
            this.loadingMessage.style.borderRadius = '10px';
            this.loadingMessage.style.zIndex = '1000';
            document.body.appendChild(this.loadingMessage);
        }

        this.loadingMessage.textContent = message;
    }

    hideLoadingMessage() {
        if (this.loadingMessage && this.loadingMessage.parentNode) {
            this.loadingMessage.parentNode.removeChild(this.loadingMessage);
            this.loadingMessage = null;
        }
    }

    // Kollisionsbehandlung
    handleCollisions(playerOldPos, carOldPos) {
        // Kollisionsbehandlung für Projektile
        this.handleProjectileCollisions();

        // Kollisionsbehandlung für Spieler zu Fuß
        if (this.player && !this.player.inVehicle && playerOldPos) {
            const collided = this.handlePlayerCollisions(playerOldPos);
            if (collided) {
                console.log("Spieler kollidiert mit Gebäude - Position zurückgesetzt");
                this.collisionDelay = 1;
            }
        }

        // Kollisionsbehandlung für Auto
        if (this.playerCar && carOldPos) {
            const collided = this.handleCarCollisions(carOldPos);
            if (collided) {
                console.log("Auto kollidiert mit Gebäude - Position zurückgesetzt");
                this.collisionDelay = 3;
            }
        }
    }

    handlePlayerDeath(player, killer) {
        console.log("handlePlayerDeath wurde aufgerufen!", player, killer);

        if (!this.roundActive) {
            console.log("Runde ist bereits inaktiv, ignoriere...");
            return; // Verhindert doppelte Verarbeitung
        }

        this.roundActive = false;
        this.lastKiller = killer;

        // Punkte für den Killer erhöhen, falls vorhanden
        if (killer) {
            console.log("Killer gefunden:", killer);

            // Killer-ID extrahieren und bereinigen
            let killerId = killer.id;
            console.log("Original Killer-ID:", killerId);

            // Wenn es eine Remote-ID ist (beginnt mit 'remote_'), entferne das Präfix
            if (killerId && killerId.startsWith('remote_')) {
                killerId = killerId.substring(7);
                console.log("Bereinigte Killer-ID:", killerId);
            }

            // Speichere Punkte mit der bereinigten ID
            if (killerId) {
                const currentScore = this.playerScores.get(killerId) || 0;
                const newScore = currentScore + 1;
                this.playerScores.set(killerId, newScore);

                console.log(`Punkte erhöht für Spieler ${killerId}: ${currentScore} -> ${newScore}`);

                // Beim Multiplayer: Sende Punktestand an alle
                if (this.isMultiplayer) {
                    this.sendScoreUpdate(killerId, newScore);
                }
            }
        }

        // Fortsetzen wie bisher...
        this.showDeathScreen(killer);
        this.restartCountdown = this.roundRestartDelay;
        this.startRestartCountdown();
    }

    showDeathScreen(killer) {
        console.log("Zeige Todesbildschirm, Killer:", killer);
        console.log("Aktueller Punktestand (Map):", Array.from(this.playerScores.entries()));

        // Prüfe ob bereits ein Todesbildschirm existiert
        const existingScreen = document.getElementById('death-screen');
        if (existingScreen) {
            document.body.removeChild(existingScreen);
        }

        // Erstelle UI-Element für den Todesbildschirm
        const deathScreen = document.createElement('div');
        deathScreen.id = 'death-screen';
        deathScreen.style.position = 'fixed';
        deathScreen.style.top = '0';
        deathScreen.style.left = '0';
        deathScreen.style.width = '100%';
        deathScreen.style.height = '100%';
        deathScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        deathScreen.style.color = 'white';
        deathScreen.style.display = 'flex';
        deathScreen.style.flexDirection = 'column';
        deathScreen.style.justifyContent = 'center';
        deathScreen.style.alignItems = 'center';
        deathScreen.style.zIndex = '1000';

        // Füge Nachricht hinzu
        const message = document.createElement('h2');

        // Killer-Nachricht anzeigen
        if (killer) {
            let killerName = killer.id || "Unbekannter Spieler";

            // Entferne 'remote_' Präfix für die Anzeige
            if (killerName.startsWith('remote_')) {
                killerName = killerName.substring(7);
            }

            message.textContent = `Du wurdest von ${killerName} eliminiert!`;
        } else {
            message.textContent = 'Du wurdest eliminiert!';
        }

        message.style.marginBottom = '20px';
        deathScreen.appendChild(message);

        // Füge Countdown hinzu
        const countdown = document.createElement('div');
        countdown.id = 'restart-countdown';
        countdown.textContent = `Neustart in ${this.roundRestartDelay} Sekunden`;
        countdown.style.fontSize = '24px';
        deathScreen.appendChild(countdown);

        // Füge Tabelle mit Punkteständen hinzu
        const scoreTable = document.createElement('div');
        scoreTable.style.marginTop = '40px';
        scoreTable.style.padding = '10px';
        scoreTable.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        scoreTable.style.borderRadius = '5px';
        scoreTable.style.minWidth = '200px'; // Mindestbreite für bessere Lesbarkeit

        const scoreTitle = document.createElement('h3');
        scoreTitle.textContent = 'Punktestand';
        scoreTitle.style.textAlign = 'center';
        scoreTitle.style.marginBottom = '10px';
        scoreTable.appendChild(scoreTitle);

        // Erstelle die Tabelle mit den Punkten
        const table = document.createElement('table');
        table.style.borderCollapse = 'collapse';
        table.style.width = '100%';

        // Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        const playerHeader = document.createElement('th');
        playerHeader.textContent = 'Spieler';
        playerHeader.style.padding = '8px';
        playerHeader.style.borderBottom = '1px solid white';
        playerHeader.style.textAlign = 'left';
        headerRow.appendChild(playerHeader);

        const scoreHeader = document.createElement('th');
        scoreHeader.textContent = 'Punkte';
        scoreHeader.style.padding = '8px';
        scoreHeader.style.borderBottom = '1px solid white';
        scoreHeader.style.textAlign = 'center';
        headerRow.appendChild(scoreHeader);

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Tabellenkörper
        const tbody = document.createElement('tbody');

        // Alle möglichen IDs für den lokalen Spieler
        const localPlayerIds = [
            this.networkManager?.playerName,
            this.player?.id,
            `player_${this.networkManager?.playerName}`
        ].filter(id => id); // Entferne undefined/null Werte

        console.log("Mögliche lokale Spieler-IDs:", localPlayerIds);

        // Suche nach dem höchsten Punktestand für den lokalen Spieler
        let localPlayerScore = 0;
        for (const id of localPlayerIds) {
            const score = this.playerScores.get(id) || 0;
            if (score > localPlayerScore) {
                localPlayerScore = score;
            }
        }

        // Füge lokalen Spieler hinzu
        const localPlayerRow = document.createElement('tr');

        const localPlayerCell = document.createElement('td');
        localPlayerCell.textContent = 'Du';
        localPlayerCell.style.padding = '8px';
        localPlayerCell.style.borderBottom = '1px solid rgba(255,255,255,0.2)';
        localPlayerRow.appendChild(localPlayerCell);

        const localScoreCell = document.createElement('td');
        localScoreCell.textContent = localPlayerScore;
        localScoreCell.style.padding = '8px';
        localScoreCell.style.borderBottom = '1px solid rgba(255,255,255,0.2)';
        localScoreCell.style.textAlign = 'center';
        localPlayerRow.appendChild(localScoreCell);

        tbody.appendChild(localPlayerRow);

        // Füge alle anderen Spieler hinzu
        const processedRemotePlayers = new Set(); // Um Duplikate zu vermeiden

        this.remotePlayers.forEach((player, playerId) => {
            // Entferne 'remote_' Präfix
            const normalizedId = playerId.startsWith('remote_') ? playerId.substring(7) : playerId;

            // Überspringen, wenn wir diesen Spieler bereits verarbeitet haben
            if (processedRemotePlayers.has(normalizedId)) return;
            processedRemotePlayers.add(normalizedId);

            console.log(`Füge Remote-Spieler hinzu: ${playerId} (normalisiert: ${normalizedId})`);

            const playerRow = document.createElement('tr');

            const playerCell = document.createElement('td');
            playerCell.textContent = normalizedId;
            playerCell.style.padding = '8px';
            playerCell.style.borderBottom = '1px solid rgba(255,255,255,0.2)';
            playerRow.appendChild(playerCell);

            // Alle möglichen ID-Versionen überprüfen
            const remoteIdVariants = [
                normalizedId,
                `remote_${normalizedId}`,
                playerId
            ];

            let remoteScore = 0;
            for (const id of remoteIdVariants) {
                const score = this.playerScores.get(id) || 0;
                if (score > remoteScore) {
                    remoteScore = score;
                }
            }

            const scoreCell = document.createElement('td');
            scoreCell.textContent = remoteScore;
            scoreCell.style.padding = '8px';
            scoreCell.style.borderBottom = '1px solid rgba(255,255,255,0.2)';
            scoreCell.style.textAlign = 'center';
            playerRow.appendChild(scoreCell);

            tbody.appendChild(playerRow);
        });

        table.appendChild(tbody);
        scoreTable.appendChild(table);
        deathScreen.appendChild(scoreTable);

        // Zum Dokument hinzufügen
        document.body.appendChild(deathScreen);
        console.log("Todesbildschirm wurde zum DOM hinzugefügt");
    }

    startRestartCountdown() {
        console.log("startRestartCountdown wird ausgeführt, Verzögerung:", this.roundRestartDelay);

        // Wenn es bereits einen Timer gibt, beende diesen zuerst
        if (this.countdownTimer) {
            console.log("Beende existierenden Countdown-Timer");
            clearInterval(this.countdownTimer);
        }

        // Pausiere das Spiel während des Countdowns
        console.log("Pausiere das Spiel für den Countdown");
        this.pauseGame();

        console.log("Starte neuen Countdown-Timer");
        this.countdownTimer = setInterval(() => {
            this.restartCountdown--;
            console.log("Countdown:", this.restartCountdown);

            // Aktualisiere die Countdown-Anzeige
            const countdownElement = document.getElementById('restart-countdown');
            if (countdownElement) {
                countdownElement.textContent = `Neustart in ${this.restartCountdown} Sekunden`;
            } else {
                console.warn("Countdown-Element nicht gefunden!");
            }

            // Wenn der Countdown abgelaufen ist, starte eine neue Runde
            if (this.restartCountdown <= 0) {
                console.log("Countdown abgelaufen, starte Runde neu");
                clearInterval(this.countdownTimer);
                this.countdownTimer = null;
                this.restartRound();
            }
        }, 1000);

        console.log("Countdown-Timer wurde gestartet");
    }

    restartRound() {
        console.log("Runde wird neu gestartet...");

        // Entferne den Todesbildschirm
        const deathScreen = document.getElementById('death-screen');
        if (deathScreen) {
            document.body.removeChild(deathScreen);
        }

        // Setze Spieler zurück
        this.resetPlayer();

        // Setze Fahrzeuge zurück
        this.resetVehicles();

        // Entferne alle Projektile
        this.projectiles.forEach(projectile => {
            this.entityManager.remove(projectile);
        });
        this.projectiles = [];

        // Aktiviere die Runde
        this.roundActive = true;

        // Im Multiplayer-Modus: Informiere andere Spieler über den Neustart
        if (this.isMultiplayer) {
            this.sendRestartEvent();
        }

        // Starte das Spiel wieder
        this.resumeGame();

        console.log("Runde wurde neu gestartet!");
    }

// 8. Methode zum Zurücksetzen des Spielers
    resetPlayer() {
        if (!this.player) return;

        // Setze Spieler-Position zurück
        const startPosition = this.getPlayerStartPosition();
        this.player.setPosition(startPosition.x, startPosition.y, startPosition.z);

        // Setze Gesundheit zurück
        this.player.health = this.player.maxHealth;

        // Stelle sicher, dass der Spieler nicht mehr im Fahrzeug ist
        if (this.player.inVehicle) {
            this.player.exitVehicle();
        }

        // Aktiviere den Spieler wieder
        this.player.isActive = true;

        // Aktualisiere die Health-UI
        this.updateHealthUI();
    }

// 9. Methode zum Zurücksetzen der Fahrzeuge
    resetVehicles() {
        if (this.playerCar) {
            // Setze Auto-Position zurück
            const carPosition = this.getCarStartPosition();
            this.playerCar.setPosition(carPosition.x, carPosition.y, carPosition.z);

            // Setze Rotation zurück
            this.playerCar.rotation = 0;
            this.playerCar.speed = 0;

            // Setze Haltbarkeit zurück
            this.playerCar.durability = this.playerCar.maxDurability;
        }

        // Zurücksetzen von Remote-Fahrzeugen im Multiplayer-Modus
        if (this.isMultiplayer) {
            this.remoteVehicles.forEach(vehicle => {
                vehicle.isActive = true;
                // Weitere Zurücksetzungen für Remote-Fahrzeuge
            });
        }
    }

    sendRestartEvent() {
        if (!this.isMultiplayer) return;

        console.log("Sende Neustart-Event an alle Spieler");

        const restartData = {
            type: 'game_restart',
            timestamp: Date.now()
        };

        this.networkManager.sendGameData(restartData);
    }

    showScoreUI() {
        // Falls die Scoreboard-Anzeige schon existiert, aktualisiere sie nur
        if (this.scoreUI) {
            this.updateScoreUI();
            return;
        }

        // Container für UI erstellen
        this.scoreUI = document.createElement('div');
        this.scoreUI.id = 'score-ui';
        this.scoreUI.style.position = 'fixed';
        this.scoreUI.style.top = '20px';
        this.scoreUI.style.right = '20px';
        this.scoreUI.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.scoreUI.style.color = 'white';
        this.scoreUI.style.padding = '10px';
        this.scoreUI.style.borderRadius = '5px';
        this.scoreUI.style.minWidth = '150px';
        this.scoreUI.style.zIndex = '1000';
        this.scoreUI.style.fontFamily = 'Arial, sans-serif';
        this.scoreUI.style.fontSize = '14px';
        this.scoreUI.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';

        // Titel
        const title = document.createElement('div');
        title.textContent = 'Punktestand';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '5px';
        title.style.textAlign = 'center';
        title.style.borderBottom = '1px solid rgba(255,255,255,0.3)';
        title.style.paddingBottom = '5px';
        this.scoreUI.appendChild(title);

        // Spielerliste erstellen
        this.scoreList = document.createElement('div');
        this.scoreUI.appendChild(this.scoreList);

        // Zum Dokument hinzufügen
        document.body.appendChild(this.scoreUI);

        // Initialen Zustand setzen
        this.updateScoreUI();

        console.log("Score UI erstellt und angezeigt");
    }

// 1. Verbesserte showScoreUI Methode - kein Ausblenden mehr bei Tab-Taste
    showScoreUI() {
        // Falls die Scoreboard-Anzeige schon existiert, aktualisiere sie nur
        if (this.scoreUI) {
            this.updateScoreUI();
            return;
        }

        // Container für UI erstellen
        this.scoreUI = document.createElement('div');
        this.scoreUI.id = 'score-ui';
        this.scoreUI.style.position = 'fixed';
        this.scoreUI.style.top = '20px';
        this.scoreUI.style.right = '20px';
        this.scoreUI.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.scoreUI.style.color = 'white';
        this.scoreUI.style.padding = '10px';
        this.scoreUI.style.borderRadius = '5px';
        this.scoreUI.style.minWidth = '150px';
        this.scoreUI.style.zIndex = '1000';
        this.scoreUI.style.fontFamily = 'Arial, sans-serif';
        this.scoreUI.style.fontSize = '14px';
        this.scoreUI.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';

        // Titel
        const title = document.createElement('div');
        title.textContent = 'Punktestand';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '5px';
        title.style.textAlign = 'center';
        title.style.borderBottom = '1px solid rgba(255,255,255,0.3)';
        title.style.paddingBottom = '5px';
        this.scoreUI.appendChild(title);

        // Spielerliste erstellen
        this.scoreList = document.createElement('div');
        this.scoreUI.appendChild(this.scoreList);

        // Zum Dokument hinzufügen
        document.body.appendChild(this.scoreUI);

        // Initialen Zustand setzen
        this.updateScoreUI();

        console.log("Score UI erstellt und angezeigt");
    }

// 2. Verbesserte updateScoreUI Methode mit robusterer ID-Behandlung
    updateScoreUI() {
        if (!this.scoreUI || !this.scoreList) {
            console.log("Score UI nicht gefunden, erstelle neu");
            this.showScoreUI();
            return;
        }

        console.log("Aktualisiere Score UI");

        // Aktueller Punktestand zur Debug-Ausgabe
        console.log("Aktueller Punktestand:", Array.from(this.playerScores.entries()));

        // Leere die aktuelle Liste
        this.scoreList.innerHTML = '';

        // Scoreboard-Daten sammeln
        const scoreData = [];

        // Lokalen Spieler hinzufügen
        const localIds = [
            this.networkManager?.playerName,
            this.player?.id,
            `player_${this.networkManager?.playerName || ''}`
        ].filter(id => id); // Entferne undefined/null Werte

        console.log("Mögliche lokale IDs:", localIds);

        let localScore = 0;
        for (const id of localIds) {
            const score = this.playerScores.get(id) || 0;
            if (score > localScore) {
                localScore = score;
            }
        }

        scoreData.push({
            id: localIds[0] || 'local',
            name: 'Du',
            score: localScore,
            isLocal: true
        });

        // Remote-Spieler hinzufügen (mit mehreren ID-Überprüfungen)
        const processedPlayerIds = new Set();

        this.remotePlayers.forEach((player, playerId) => {
            const baseId = playerId.startsWith('remote_') ? playerId.substring(7) : playerId;

            // Überspringen, wenn dieser Spieler bereits verarbeitet wurde
            if (processedPlayerIds.has(baseId)) return;
            processedPlayerIds.add(baseId);

            // Alle möglichen ID-Varianten für diesen Spieler
            const idVariants = [
                baseId,
                `remote_${baseId}`,
                playerId,
                `player_${baseId}`
            ];

            console.log(`Remote-Spieler ${playerId}, Varianten:`, idVariants);

            // Höchste Punktzahl für diesen Spieler finden
            let highestScore = 0;
            for (const id of idVariants) {
                const score = this.playerScores.get(id) || 0;
                if (score > highestScore) {
                    highestScore = score;
                }
            }

            scoreData.push({
                id: baseId,
                name: baseId,
                score: highestScore,
                isLocal: false
            });
        });

        // Sortiere nach Punktzahl (höchste zuerst)
        scoreData.sort((a, b) => b.score - a.score);

        console.log("Sortierte Scoredata:", scoreData);

        // Erstelle Einträge
        scoreData.forEach((player, index) => {
            const entry = document.createElement('div');
            entry.style.display = 'flex';
            entry.style.justifyContent = 'space-between';
            entry.style.padding = '3px 0';

            // Abwechselnde Hintergrundfarben für bessere Lesbarkeit
            if (index % 2 === 1) {
                entry.style.backgroundColor = 'rgba(255,255,255,0.05)';
            }

            // Hervorhebung für lokalen Spieler
            if (player.isLocal) {
                entry.style.fontWeight = 'bold';
                entry.style.color = '#ffcc00'; // Gold-Farbe für lokalen Spieler
            }

            const nameSpan = document.createElement('span');
            nameSpan.textContent = player.name;

            const scoreSpan = document.createElement('span');
            scoreSpan.textContent = player.score;
            scoreSpan.style.marginLeft = '15px';

            entry.appendChild(nameSpan);
            entry.appendChild(scoreSpan);

            this.scoreList.appendChild(entry);
        });
    }

    toggleScoreUI() {
        if (this.scoreUI) {
            if (this.scoreUI.style.display === 'none') {
                this.scoreUI.style.display = 'block';
                this.updateScoreUI(); // Aktualisieren beim Wiedereinblenden
            } else {
                this.scoreUI.style.display = 'none';
            }
        } else {
            this.showScoreUI();
        }
    }

    setupScoreboardHotkey() {
        // Listener für die Taste "Tab" zum Ein-/Ausblenden der Punkteanzeige
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Tab') {
                e.preventDefault(); // Verhindere Standard-Tab-Verhalten
                this.toggleScoreUI();
            }
        });

        // Beim Loslassen der Tab-Taste das Scoreboard ausblenden
        window.addEventListener('keyup', (e) => {
            if (e.code === 'Tab' && this.scoreUI && this.scoreUI.style.display !== 'none') {
                this.scoreUI.style.display = 'none';
            }
        });
    }

    debugScores() {
        console.log("========== PUNKTESTAND DEBUGGING ==========");
        console.log("playerScores Map:", this.playerScores);
        console.log("Einträge:");

        this.playerScores.forEach((score, id) => {
            console.log(`- ${id}: ${score}`);
        });

        console.log("Lokaler Spieler:", this.networkManager?.playerName);
        console.log("Remote Spieler:");
        this.remotePlayers.forEach((player, id) => {
            console.log(`- ${id} (bereinigte ID: ${id.startsWith('remote_') ? id.substring(7) : id})`);
        });
        console.log("==========================================");
    }
}