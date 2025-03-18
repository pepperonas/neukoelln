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
        this.hasCollided = false; // Flag um mehrfache Kollisionen zu verhindern

        // Tasten-Status-Tracking
        this.keyStatus = {
            E: false,
            SPACE: false
        };

        // Debug-Flag
        this.debug = true;

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
            console.log("Tasten-Anleitung:");
            console.log("E: Ein-/Aussteigen");
            console.log("WASD/Pfeiltasten: Bewegen");
            console.log("Leertaste: Schießen (zu Fuß) / Bremsen (im Auto)");
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
            if (Math.abs(x) < 3 || Math.abs(z) < 3) continue;

            const building = new Building(x, z, width, depth, height);
            this.buildings.push(this.entityManager.add(building));
        }
    }

    createPlayer() {
        // Erstelle einen neuen Spieler
        this.player = new Player();
        this.entityManager.add(this.player);

        // Setze die Position des Spielers
        this.player.setPosition(0, 0, 0);

        if (this.debug) {
            console.log("Spieler erstellt:", this.player);
        }
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

        if (this.debug) {
            console.log("Auto erstellt:", this.playerCar);
        }
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

        // Update all entities
        this.entityManager.update(deltaTime, this.inputManager);

        // Aktualisiere die zu verfolgende Entität für die Kamera
        let trackEntity = this.player;
        if (this.player && this.player.inVehicle) {
            trackEntity = this.player.inVehicle;
        }

        // Prüfe, ob der Spieler mit der E-Taste in ein Fahrzeug einsteigen will
        this.handleVehicleInteraction();

        // Prüfe Projektile vom Spieler
        this.handlePlayerProjectiles();

        // Check for collisions
        this.checkCollisions();

        // Check boundaries
        this.checkBoundaries(trackEntity);

        // Update camera to follow player or vehicle
        this.updateCamera(trackEntity);

        // Reset collision flag after a delay
        if (this.hasCollided) {
            setTimeout(() => {
                this.hasCollided = false;
            }, 500); // 500ms Verzögerung zur Vermeidung von Mehrfachkollisionen
        }

        // Projektile aktualisieren
        this.updateProjectiles();
    }

    handleVehicleInteraction() {
        // Prüfe, ob E-Taste gedrückt wurde - Einmalpresse erkennen
        const ePressed = this.inputManager.isPressed('KeyE');

        if (ePressed && !this.keyStatus.E) {
            this.keyStatus.E = true; // Markieren, dass die Taste gedrückt ist

            if (this.debug) {
                console.log("E-Taste gedrückt, Spieler inVehicle:", this.player.inVehicle);
            }

            if (this.player.inVehicle) {
                // Aussteigen
                if (this.debug) console.log("Versuche auszusteigen...");

                this.player.exitVehicle();

                if (this.debug) {
                    console.log("Spieler nach Aussteigen:", this.player);
                    console.log("Auto nach Aussteigen:", this.playerCar);
                }
            } else {
                // Einsteigen, wenn ein Auto in der Nähe ist
                const distance = this.player.position.distanceTo(this.playerCar.position);

                if (this.debug) {
                    console.log("Distanz zum Auto:", distance);
                }

                if (distance < 3) {
                    if (this.debug) console.log("Versuche einzusteigen...");

                    // Spieler ins Auto setzen
                    this.playerCar.setDriver(this.player);

                    if (this.debug) {
                        console.log("Spieler nach Einsteigen:", this.player);
                        console.log("Auto nach Einsteigen:", this.playerCar);
                    }
                } else {
                    if (this.debug) console.log("Auto zu weit entfernt!");
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
            if (this.debug) console.log("Leertaste gedrückt");

            // Wenn Spieler zu Fuß ist und schießt
            if (this.player && !this.player.inVehicle) {
                if (this.debug) console.log("Versuche zu schießen...");

                const projectile = this.player.shoot();

                if (projectile) {
                    // Füge Projektil zum EntityManager hinzu
                    this.projectiles.push(this.entityManager.add(projectile));

                    if (this.debug) {
                        console.log("Projektil erstellt:", projectile);
                    }
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
            // Wenn das Projektil nicht mehr aktiv ist, entferne es aus der Liste
            if (!p.isActive) {
                this.entityManager.remove(p);
                return false;
            }
            return true;
        });
    }

    checkCollisions() {
        if (this.hasCollided) return;

        let collisionDetected = false;

        // Kollisionen zwischen Projektilen und Gebäuden/Fahrzeugen
        this.projectiles.forEach(projectile => {
            if (!projectile.isActive) return;

            // Prüfe Kollision mit Gebäuden
            for (const building of this.buildings) {
                if (!building || !building.mesh || !projectile.mesh) continue;

                const buildingBoundary = new THREE.Box3().setFromObject(building.mesh);
                const projectileBoundary = new THREE.Box3().setFromObject(projectile.mesh);

                if (buildingBoundary.intersectsBox(projectileBoundary)) {
                    projectile.isActive = false;
                    collisionDetected = true;

                    if (this.debug) {
                        console.log("Projektil kollidiert mit Gebäude");
                    }

                    break;
                }
            }

            // Prüfe Kollision mit Fahrzeug
            if (projectile.isActive && this.playerCar && this.playerCar.mesh && projectile.owner !== this.playerCar) {
                const carBoundary = new THREE.Box3().setFromObject(this.playerCar.mesh);
                const projectileBoundary = new THREE.Box3().setFromObject(projectile.mesh);

                if (carBoundary.intersectsBox(projectileBoundary)) {
                    this.playerCar.damage(projectile.damage);
                    projectile.isActive = false;
                    collisionDetected = true;

                    if (this.debug) {
                        console.log("Projektil kollidiert mit Auto, Schaden:", projectile.damage);
                    }
                }
            }
        });

        // Fahrzeugkollisionen nur prüfen, wenn Spieler im Fahrzeug ist
        if (this.player && this.player.inVehicle && this.playerCar) {
            // Prüfe Kollision mit Gebäuden
            this.buildings.forEach(building => {
                if (!building || !building.mesh || !this.playerCar.mesh) return;

                const buildingBoundary = new THREE.Box3().setFromObject(building.mesh);
                const carBoundary = new THREE.Box3().setFromObject(this.playerCar.mesh);

                if (buildingBoundary.intersectsBox(carBoundary)) {
                    // Reverse the movement on collision
                    this.playerCar.speed = -this.playerCar.speed * 0.5;

                    // Update position after reversing
                    this.playerCar.position.x += this.playerCar.direction.x * this.playerCar.speed;
                    this.playerCar.position.z += this.playerCar.direction.z * this.playerCar.speed;

                    // Aktualisiere direkt die Mesh-Position
                    if (this.playerCar.mesh) {
                        this.playerCar.mesh.position.copy(this.playerCar.position);
                    }

                    collisionDetected = true;

                    if (this.debug) {
                        console.log("Auto kollidiert mit Gebäude");
                    }
                }
            });
        }

        // Setze das Kollisions-Flag wenn eine Kollision erkannt wurde
        if (collisionDetected) {
            this.hasCollided = true;
        }
    }

    checkBoundaries(entity) {
        if (!entity || !entity.mesh) return;

        const boundary = 45;
        let boundaryHit = false;

        if (Math.abs(entity.position.x) > boundary) {
            entity.position.x = Math.sign(entity.position.x) * boundary;
            if (entity === this.playerCar) {
                entity.speed *= -0.5;
            }
            boundaryHit = true;
        }

        if (Math.abs(entity.position.z) > boundary) {
            entity.position.z = Math.sign(entity.position.z) * boundary;
            if (entity === this.playerCar) {
                entity.speed *= -0.5;
            }
            boundaryHit = true;
        }

        // Aktualisiere die Mesh-Position nur, wenn nötig
        if (boundaryHit && entity.mesh) {
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

        updateDebugInfo();
    }

    updateDebugInfo() {
        // Prüfe, ob die Debug-Funktion im Fenster verfügbar ist
        if (window.gameDebug && typeof window.gameDebug.updateDebugInfo === 'function') {
            window.gameDebug.updateDebugInfo(this.player, this.playerCar);
        }
    }
}

