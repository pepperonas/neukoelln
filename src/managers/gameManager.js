import * as THREE from 'three';
import { InputManager } from '../core/input.js';
import { EntityManager } from './entityManager.js';
import { Car } from '../entities/vehicles/car.js';
import { Building } from '../entities/environment/building.js';

export class GameManager {
    constructor(engine) {
        this.engine = engine;
        this.inputManager = new InputManager();
        this.entityManager = new EntityManager(engine.scene);

        this.player = null;
        this.buildings = [];
        this.isRunning = false;

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

        // Create player car
        this.createPlayerCar();

        // Set up camera
        this.setupCamera();

        this.isRunning = true;

        // Start the engine
        this.engine.start();
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
        const roadMarkingMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

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

    createPlayerCar() {
        this.player = new Car();
        this.entityManager.add(this.player);
    }

    setupCamera() {
        // Position the camera based on the car
        this.engine.camera.position.set(0, 15, 0);
        this.engine.camera.lookAt(this.player.position);
    }

    update(deltaTime) {
        if (!this.isRunning || !this.player) return;

        // Update all entities
        this.entityManager.update(deltaTime, this.inputManager);

        // Check for collisions
        this.checkCollisions();

        // Check boundaries
        this.checkBoundaries();

        // Update camera to follow player
        this.updateCamera();
    }

    checkCollisions() {
        if (!this.player) return;

        this.buildings.forEach(building => {
            // Simple boundary box collision
            const buildingBoundary = building.getBoundingBox();
            const carBoundary = new THREE.Box3().setFromObject(this.player.mesh);

            if (buildingBoundary.intersectsBox(carBoundary)) {
                // Reverse the movement on collision
                this.player.speed = -this.player.speed * 0.5;

                // Update position after reversing
                this.player.position.x += this.player.direction.x * this.player.speed;
                this.player.position.z += this.player.direction.z * this.player.speed;
                this.player.mesh.position.copy(this.player.position);
            }
        });
    }

    checkBoundaries() {
        if (!this.player) return;

        const boundary = 45;
        if (Math.abs(this.player.position.x) > boundary) {
            this.player.position.x = Math.sign(this.player.position.x) * boundary;
            this.player.speed *= -0.5;
            this.player.mesh.position.copy(this.player.position);
        }
        if (Math.abs(this.player.position.z) > boundary) {
            this.player.position.z = Math.sign(this.player.position.z) * boundary;
            this.player.speed *= -0.5;
            this.player.mesh.position.copy(this.player.position);
        }
    }

    updateCamera() {
        if (!this.player) return;

        // GTA 2 style top-down view with slight angle
        this.engine.camera.position.set(
            this.player.position.x,
            15,
            this.player.position.z + 5
        );
        this.engine.camera.lookAt(this.player.position);
    }
}