import * as THREE from 'three';
import {InputManager} from '../core/input.js';
import {EntityManager} from './entityManager.js';
import {Car} from '../entities/vehicles/car.js';
import {Building} from '../entities/environment/building.js';
import {Player} from '../entities/characters/player.js';

export class GameManager {
    constructor(engine) {
        this.engine = engine;
        this.inputManager = new InputManager();
        this.entityManager = new EntityManager(engine.scene);

        this.player = null;     // Spieler-Charakter
        this.playerCar = null;  // Auto des Spielers
        this.buildings = [];
        this.projectiles = [];  // Liste der aktiven Projektile
        this.isRunning = false;

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

        // Erstelle Spieler-Charakter
        this.createPlayer();

        // Create player car
        this.createPlayerCar();

        // Set up camera
        this.setupCamera();

        this.isRunning = true;

        // Start the engine
        this.engine.start();

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

        // Cleanup
        this.entityManager.clear();
        this.buildings = [];
        this.player = null;
        this.playerCar = null;
        this.projectiles = [];
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

    createPlayer() {
        // Erstelle einen neuen Spieler
        this.player = new Player();
        this.entityManager.add(this.player);

        // Setze die Position des Spielers
        this.player.setPosition(0, 0, 0);
    }

    createPlayerCar() {
        // Stelle sicher, dass nur ein Player-Auto existiert
        if (this.playerCar) {
            this.entityManager.remove(this.playerCar);
        }

        this.playerCar = new Car();
        this.entityManager.add(this.playerCar);

        // Setze Position und Rotation zurück
        this.playerCar.position.set(3, 0, 0);  // Auto neben Spieler platzieren
        this.playerCar.rotation = 0;
        this.playerCar.speed = 0;

        // Aktualisiere die Mesh-Position
        if (this.playerCar.mesh) {
            this.playerCar.mesh.position.copy(this.playerCar.position);
            this.playerCar.mesh.rotation.y = this.playerCar.rotation;
        }
    }

    setupCamera() {
        // Position the camera based on the player
        this.engine.camera.position.set(0, 15, 0);
        if (this.player) {
            this.engine.camera.lookAt(this.player.position);
        }
    }

    // Ersetzen Sie die update-Methode mit dieser Version:
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

        // Reduziere Kollisions-Delay
        if (this.collisionDelay > 0) {
            this.collisionDelay--;
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
                }
            }

            this.keyStatus.SPACE = true;
        } else if (!spacePressed) {
            // Leertaste wurde losgelassen
            this.keyStatus.SPACE = false;
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

    // NEUE METHODE: Kollisionserkennung und -auflösung
    handleCollisions(playerOldPos, carOldPos) {
        // Entfernen Sie diese Zeilen, um den Kollisions-Delay zu deaktivieren
        // if (this.collisionDelay > 0) return;

        // Kollisionsbehandlung für Projektile
        this.handleProjectileCollisions();

        // Kollisionsbehandlung für Spieler zu Fuß - IMMER ausführen, nicht nur außerhalb des Delays
        if (this.player && !this.player.inVehicle && playerOldPos) {
            const collided = this.handlePlayerCollisions(playerOldPos);
            if (collided) {
                // Debug-Ausgabe für Kollision
                console.log("Spieler kollidiert mit Gebäude - Position zurückgesetzt");
                // Entfernen oder reduzieren Sie den Delay auf 1
                this.collisionDelay = 1;
            }
        }

        // Kollisionsbehandlung für Auto
        if (this.playerCar && carOldPos) {
            const collided = this.handleCarCollisions(carOldPos);
            if (collided) {
                // Debug-Ausgabe für Kollision
                console.log("Auto kollidiert mit Gebäude - Position zurückgesetzt");
                this.collisionDelay = 3; // Reduzieren auf einen kleineren Wert
            }
        }
    }

    handleProjectileCollisions() {
        this.projectiles.forEach(projectile => {
            if (!projectile || !projectile.isActive || !projectile.mesh) return;

            // Projektil-Bounding Box
            const projectileBox = new THREE.Box3().setFromObject(projectile.mesh);

            // Prüfe Kollision mit Gebäuden
            for (const building of this.buildings) {
                if (!building || !building.mesh) continue;

                const buildingBox = new THREE.Box3().setFromObject(building.mesh);

                if (buildingBox.intersectsBox(projectileBox)) {
                    projectile.isActive = false;
                    if (this.debug) console.log("Projektil trifft Gebäude");
                    break;
                }
            }

            // Prüfe Kollision mit Fahrzeug, wenn Projektil nicht vom Fahrzeug kommt
            if (projectile.isActive && this.playerCar && this.playerCar.mesh &&
                projectile.owner !== this.playerCar) {

                const carBox = new THREE.Box3().setFromObject(this.playerCar.mesh);

                if (carBox.intersectsBox(projectileBox)) {
                    this.playerCar.damage(projectile.damage);
                    projectile.isActive = false;
                    if (this.debug) console.log("Projektil trifft Auto");
                }
            }
        });
    }

    handlePlayerCollisions(oldPos) {
        if (!this.player || !this.player.mesh || !oldPos) return false;

        // Erstelle eine BoundingBox für den Spieler
        const playerBox = new THREE.Box3().setFromObject(this.player.mesh);
        let hasCollision = false;

        // Prüfe Kollision mit Gebäuden
        for (const building of this.buildings) {
            if (!building || !building.mesh) continue;

            const buildingBox = new THREE.Box3().setFromObject(building.mesh);

            if (buildingBox.intersectsBox(playerBox)) {
                hasCollision = true;
                break;
            }
        }

        // Wenn eine Kollision erkannt wurde, setze Position zurück
        if (hasCollision) {
            this.player.position.copy(oldPos);
            this.player.mesh.position.copy(oldPos);
            return true;
        }

        return false;
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
}