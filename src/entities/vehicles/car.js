import * as THREE from 'three';
import {Vehicle} from './vehicle.js';

export class Car extends Vehicle {
    constructor(options = {}) {
        super({
            maxSpeed: options.maxSpeed || 0.1,        // Reduziert von 0.25 auf 0.1
            acceleration: options.acceleration || 0.005, // Reduziert von 0.01 auf 0.005
            deceleration: options.deceleration || 0.003, // Reduziert von 0.005 auf 0.003
            braking: options.braking || 0.015,        // Reduziert von 0.03 auf 0.015
            turnSpeed: options.turnSpeed || 0.03      // Reduziert von 0.04 auf 0.03
        });

        // Create car body
        this.createBody(options.color || 0xff0000);
    }

    createBody(color) {
        // Car body
        const carBodyGeometry = new THREE.BoxGeometry(1.5, 0.5, 3);
        const carBodyMaterial = new THREE.MeshStandardMaterial({color: color, roughness: 0.5});
        const carBody = new THREE.Mesh(carBodyGeometry, carBodyMaterial);
        carBody.position.y = 0.5;
        carBody.castShadow = true;
        this.mesh.add(carBody);

        // Car roof
        const carRoofGeometry = new THREE.BoxGeometry(1.3, 0.4, 1.5);
        const carRoofMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color).multiplyScalar(0.9).getHex(),
            roughness: 0.5
        });
        const carRoof = new THREE.Mesh(carRoofGeometry, carRoofMaterial);
        carRoof.position.y = 0.95;
        carRoof.position.z = -0.2;
        carRoof.castShadow = true;
        this.mesh.add(carRoof);

        // Wheels
        this.createWheels();

        // Lights
        this.createLights();
    }

    createWheels() {
        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
        const wheelMaterial = new THREE.MeshStandardMaterial({color: 0x222222, roughness: 0.9});

        const wheelPositions = [
            {x: -0.7, z: 1},
            {x: 0.7, z: 1},
            {x: -0.7, z: -1},
            {x: 0.7, z: -1}
        ];

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(pos.x, 0.4, pos.z);
            wheel.castShadow = true;
            this.mesh.add(wheel);
            this.wheels.push(wheel);
        });
    }

    createLights() {
        // Headlights
        const headlightGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const headlightMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffcc,
            emissive: 0xffffcc,
            emissiveIntensity: 0.5
        });

        const headlightPositions = [
            {x: -0.5, z: 1.5},
            {x: 0.5, z: 1.5}
        ];

        this.headlights = [];
        this.headlightTargets = [];

        headlightPositions.forEach(pos => {
            const headlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
            headlight.position.set(pos.x, 0.5, pos.z);
            this.mesh.add(headlight);

            // Add headlight beam
            const headlightBeam = new THREE.SpotLight(0xffffcc, 0.8);
            headlightBeam.position.set(pos.x, 0.5, pos.z);
            headlightBeam.angle = Math.PI / 8;
            headlightBeam.penumbra = 0.2;
            headlightBeam.distance = 10;

            // Ziel für den Lichtstrahl erstellen
            const target = new THREE.Object3D();
            target.position.set(pos.x, 0, pos.z + 5);
            this.mesh.add(target);
            headlightBeam.target = target;

            headlightBeam.castShadow = true;
            this.mesh.add(headlightBeam);

            this.headlights.push(headlightBeam);
            this.headlightTargets.push({
                target,
                originalPosition: {...pos}
            });
        });

        // Taillights
        const taillightGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const taillightMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });

        const taillightPositions = [
            {x: -0.5, z: -1.5},
            {x: 0.5, z: -1.5}
        ];

        taillightPositions.forEach(pos => {
            const taillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
            taillight.position.set(pos.x, 0.5, pos.z);
            this.mesh.add(taillight);
        });
    }

    update(deltaTime, inputManager) {
        super.update(deltaTime, inputManager);

        // Aktualisiere die Scheinwerfer-Ziele
        if (this.headlightTargets) {
            this.headlightTargets.forEach(item => {
                const pos = item.originalPosition;
                // Berechne die Position relativ zur Fahrzeugrotation
                const targetX = pos.x * Math.cos(this.rotation) + pos.z * Math.sin(this.rotation);
                const targetZ = -pos.x * Math.sin(this.rotation) + pos.z * Math.cos(this.rotation);

                // Setze das Ziel voraus in Fahrtrichtung
                item.target.position.set(
                    this.position.x + targetX + this.direction.x * 5,
                    0,
                    this.position.z + targetZ + this.direction.z * 5
                );
            });
        }
    }
}