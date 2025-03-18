import '../styles/main.css';
import * as THREE from 'three';

// Einfache Implementierung für Debugging
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM geladen, starte Spiel...');

    // Grundlegende THREE.js-Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Himmelblau

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // Renderer zum DOM hinzufügen
    const container = document.getElementById('game-container');
    if (container) {
        container.appendChild(renderer.domElement);
        console.log('Renderer zum Container hinzugefügt');
    } else {
        console.error('Game-Container nicht gefunden!');
        document.body.appendChild(renderer.domElement);
    }

    // Licht hinzufügen
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Boden erstellen
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    // Straßenmarkierungen hinzufügen
    function createRoadMarkings() {
        const roadMarkingGeometry = new THREE.PlaneGeometry(0.2, 5);
        const roadMarkingMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

        for (let i = -40; i <= 40; i += 10) {
            for (let j = -40; j <= 40; j += 10) {
                const roadMarking = new THREE.Mesh(roadMarkingGeometry, roadMarkingMaterial);
                roadMarking.rotation.x = -Math.PI / 2;
                roadMarking.position.set(i, -0.49, j);
                roadMarking.receiveShadow = true;
                scene.add(roadMarking);
            }
        }
    }

    createRoadMarkings();

    // Gebäude erstellen
    const buildings = [];

    function createBuilding(x, z, width, depth, height) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({
            color: Math.random() * 0x808080 + 0x808080,
            roughness: 0.7
        });
        const building = new THREE.Mesh(geometry, material);
        building.position.set(x, height/2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);
        return building;
    }

    function createBuildings() {
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

            buildings.push(createBuilding(x, z, width, depth, height));
        }
    }

    createBuildings();

    // Auto erstellen
    const carGroup = new THREE.Group();

    // Auto-Körper
    const carBodyGeometry = new THREE.BoxGeometry(1.5, 0.5, 3);
    const carBodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5 });
    const carBody = new THREE.Mesh(carBodyGeometry, carBodyMaterial);
    carBody.position.y = 0.5;
    carBody.castShadow = true;
    carGroup.add(carBody);

    // Auto-Dach
    const carRoofGeometry = new THREE.BoxGeometry(1.3, 0.4, 1.5);
    const carRoofMaterial = new THREE.MeshStandardMaterial({ color: 0xdd0000, roughness: 0.5 });
    const carRoof = new THREE.Mesh(carRoofGeometry, carRoofMaterial);
    carRoof.position.y = 0.95;
    carRoof.position.z = -0.2;
    carRoof.castShadow = true;
    carGroup.add(carRoof);

    // Räder
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });

    const wheels = [];
    const wheelPositions = [
        { x: -0.7, z: 1 },
        { x: 0.7, z: 1 },
        { x: -0.7, z: -1 },
        { x: 0.7, z: -1 }
    ];

    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos.x, 0.4, pos.z);
        wheel.castShadow = true;
        carGroup.add(wheel);
        wheels.push(wheel);
    });

    // Scheinwerfer hinzufügen
    const headlightGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const headlightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffcc,
        emissive: 0xffffcc,
        emissiveIntensity: 0.5
    });

    const headlightPositions = [
        { x: -0.5, z: 1.5 },
        { x: 0.5, z: 1.5 }
    ];

    // Speichere Scheinwerferlichter und -Ziele für spätere Aktualisierung
    const headlights = [];
    const headlightTargets = [];

    headlightPositions.forEach(pos => {
        const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        headlight.position.set(pos.x, 0.5, pos.z);
        carGroup.add(headlight);

        // Scheinwerferlicht hinzufügen
        const headlightBeam = new THREE.SpotLight(0xffffcc, 0.8);
        headlightBeam.position.set(pos.x, 0.5, pos.z);
        headlightBeam.angle = Math.PI / 8;
        headlightBeam.penumbra = 0.2;
        headlightBeam.distance = 10;

        // Ziel für den Lichtstrahl erstellen
        const target = new THREE.Object3D();
        target.position.set(pos.x, 0, pos.z + 5);
        carGroup.add(target);
        headlightBeam.target = target;

        headlightBeam.castShadow = true;
        carGroup.add(headlightBeam);

        // Für spätere Aktualisierung speichern
        headlights.push(headlightBeam);
        headlightTargets.push(target);
    });

    // Rücklichter hinzufügen
    const taillightGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const taillightMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });

    const taillightPositions = [
        { x: -0.5, z: -1.5 },
        { x: 0.5, z: -1.5 }
    ];

    taillightPositions.forEach(pos => {
        const taillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
        taillight.position.set(pos.x, 0.5, pos.z);
        carGroup.add(taillight);
    });

    scene.add(carGroup);

    // Steuerungsvariablen
    const car = {
        speed: 0,
        maxSpeed: 0.25,
        acceleration: 0.01,
        deceleration: 0.005,
        braking: 0.03,
        turnSpeed: 0.04,
        direction: new THREE.Vector3(0, 0, 1),
        position: new THREE.Vector3(0, 0, 0),
        rotation: 0
    };

    // Tastatureingaben
    const keys = {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
        KeyW: false,
        KeyA: false,
        KeyS: false,
        KeyD: false,
        Space: false
    };

    window.addEventListener('keydown', (e) => {
        if (keys.hasOwnProperty(e.code)) {
            keys[e.code] = true;
        }
    });

    window.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.code)) {
            keys[e.code] = false;
        }
    });

    // Fenstergröße anpassen
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Kollisionserkennung
    function checkCollision() {
        for (const building of buildings) {
            // Simple boundary box collision
            const buildingBoundary = new THREE.Box3().setFromObject(building);
            const carBoundary = new THREE.Box3().setFromObject(carGroup);

            if (buildingBoundary.intersectsBox(carBoundary)) {
                // Reverse the movement on collision
                car.speed = -car.speed * 0.5;
                return true;
            }
        }
        return false;
    }

    // UI-Setup
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('menu').classList.remove('hidden');
    document.getElementById('info').classList.remove('hidden');

    document.getElementById('start-game').addEventListener('click', () => {
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
        animate(); // Starte die Animation nach Klick auf Start
    });

    // Animation und Spiellogik
    function updateCarPosition() {
        // Update position based on direction and speed
        car.position.x += car.direction.x * car.speed;
        car.position.z += car.direction.z * car.speed;

        // Keep car within bounds
        const boundary = 45;
        if (Math.abs(car.position.x) > boundary) {
            car.position.x = Math.sign(car.position.x) * boundary;
            car.speed *= -0.5;
        }
        if (Math.abs(car.position.z) > boundary) {
            car.position.z = Math.sign(car.position.z) * boundary;
            car.speed *= -0.5;
        }

        // Update car group position
        carGroup.position.set(car.position.x, car.position.y, car.position.z);
        carGroup.rotation.y = car.rotation;

        // Rotate wheels based on speed
        wheels.forEach(wheel => {
            wheel.rotation.x += car.speed * 0.5;
        });

        // Update headlight targets
        headlightTargets.forEach((target, index) => {
            const pos = headlightPositions[index];
            // Berechne die Position relativ zur Autorotation
            const targetX = pos.x * Math.cos(car.rotation) + pos.z * Math.sin(car.rotation);
            const targetZ = -pos.x * Math.sin(car.rotation) + pos.z * Math.cos(car.rotation);

            // Setze das Ziel voraus in Fahrtrichtung
            target.position.set(
                car.position.x + targetX + car.direction.x * 5,
                0,
                car.position.z + targetZ + car.direction.z * 5
            );
        });
    }

    function animate() {
        requestAnimationFrame(animate);

        // Handle acceleration
        const accelerating = keys.ArrowUp || keys.KeyW;
        const braking = keys.Space;
        const reversing = keys.ArrowDown || keys.KeyS;

        if (accelerating && !reversing) {
            car.speed += car.acceleration;
            if (car.speed > car.maxSpeed) {
                car.speed = car.maxSpeed;
            }
        } else if (reversing && !accelerating) {
            car.speed -= car.acceleration;
            if (car.speed < -car.maxSpeed / 2) {
                car.speed = -car.maxSpeed / 2;
            }
        } else {
            // Natural deceleration
            if (car.speed > 0) {
                car.speed -= car.deceleration;
                if (car.speed < 0) car.speed = 0;
            } else if (car.speed < 0) {
                car.speed += car.deceleration;
                if (car.speed > 0) car.speed = 0;
            }
        }

        // Apply brakes
        if (braking) {
            if (car.speed > 0) {
                car.speed -= car.braking;
                if (car.speed < 0) car.speed = 0;
            } else if (car.speed < 0) {
                car.speed += car.braking;
                if (car.speed > 0) car.speed = 0;
            }
        }

        // Handle turning
        const turningLeft = keys.ArrowLeft || keys.KeyA;
        const turningRight = keys.ArrowRight || keys.KeyD;

        if (car.speed !== 0) {
            if (turningLeft && !turningRight) {
                car.rotation += car.turnSpeed * Math.sign(car.speed);
            } else if (turningRight && !turningLeft) {
                car.rotation -= car.turnSpeed * Math.sign(car.speed);
            }

            // Update direction vector
            car.direction.set(
                Math.sin(car.rotation),
                0,
                Math.cos(car.rotation)
            );
        }

        // Update car position
        updateCarPosition();

        // Check for collisions
        checkCollision();

        // Update camera to follow car
        camera.position.set(
            carGroup.position.x,
            15,
            carGroup.position.z + 5
        );
        camera.lookAt(carGroup.position);

        renderer.render(scene, camera);
    }

    // Kein automatischer Start, warte auf Button-Klick
});