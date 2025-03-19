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

        this.handleProjectileCollisions();

        if (this.player) {
            this.updateHealthUI();
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
        this.projectiles.forEach(projectile => {
            if (!projectile || !projectile.isActive || !projectile.mesh) return;

            // Projektil-Bounding Box
            const projectileBox = new THREE.Box3().setFromObject(projectile.mesh);

            // Prüfe Kollision mit Gebäuden
            for (const building of this.buildings) {
                if (!building || !building.mesh || !building.isActive) continue;

                const buildingBox = new THREE.Box3().setFromObject(building.mesh);

                if (buildingBox.intersectsBox(projectileBox)) {
                    projectile.isActive = false;
                    if (this.debug) console.log("Projektil trifft Gebäude");
                    break;
                }
            }

            // Wenn das Projektil nicht mehr aktiv ist, überspringe den Rest
            if (!projectile.isActive) return;

            // Berechne zufälligen Schaden zwischen 15 und 35 HP
            const randomDamage = Math.floor(Math.random() * 21) + 15; // 21 = (35-15+1)

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
                    projectile.isActive = false;

                    // Schaden an den getroffenen Spieler senden
                    this.sendDamageEvent(playerId, randomDamage);

                    console.log(`Remote-Spieler ${playerId} wurde getroffen! Schaden: ${randomDamage}`);
                    return;
                }
            });

            // Prüfe Kollision mit lokalem Spieler
            if (this.player && this.player.mesh && projectile.owner !== this.player && this.player.isActive) {
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
                    // Treffer! Schaden am Spieler verursachen
                    this.player.damage(randomDamage);
                    projectile.isActive = false;
                    this.showDamageIndicator(randomDamage);
                    this.updateHealthUI();
                    console.log(`Lokaler Spieler wurde getroffen! Schaden: ${randomDamage}, verbleibende Gesundheit: ${this.player.health}`);
                    return;
                }
            }

            // Prüfe Kollision mit lokalem Fahrzeug, wenn Projektil nicht vom Fahrzeug kommt
            if (this.playerCar && this.playerCar.mesh && projectile.owner !== this.playerCar && this.playerCar.isActive) {
                const carBox = new THREE.Box3().setFromObject(this.playerCar.mesh);

                if (carBox.intersectsBox(projectileBox)) {
                    this.playerCar.damage(randomDamage);
                    projectile.isActive = false;
                    console.log("Projektil trifft lokales Auto, Schaden:", randomDamage);
                    return;
                }
            }

            // Prüfe Kollision mit Remote-Fahrzeugen
            this.remoteVehicles.forEach((remoteCar, playerId) => {
                if (!remoteCar.mesh || !remoteCar.isActive || projectile.owner === remoteCar) return;

                const remoteCarBox = new THREE.Box3().setFromObject(remoteCar.mesh);

                if (remoteCarBox.intersectsBox(projectileBox)) {
                    projectile.isActive = false;

                    // Schaden am Fahrzeug senden
                    this.sendVehicleDamageEvent(playerId, randomDamage);

                    console.log(`Remote-Fahrzeug ${playerId} wurde getroffen! Schaden: ${randomDamage}`);
                    return;
                }
            });
        });
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
            }
        };
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
}