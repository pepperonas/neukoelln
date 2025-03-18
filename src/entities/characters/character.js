import * as THREE from 'three';
import { Entity } from '../entity.js';

export class Character extends Entity {
    constructor(options = {}) {
        super();

        // Basis-Eigenschaften
        this.health = options.health || 100;
        this.maxHealth = options.maxHealth || 100;
        this.walkSpeed = options.walkSpeed || 0.08;
        this.runSpeed = options.runSpeed || 0.15;
        this.direction = new THREE.Vector3(0, 0, 1);
        this.inVehicle = null; // Referenz auf Fahrzeug, wenn character in einem Fahrzeug sitzt
    }

    update(deltaTime, inputManager) {
        // Basis-Update für alle Charaktere
        super.update(deltaTime);

        // Wenn dieser Charakter in einem Fahrzeug ist, bewege Mesh zur Fahrzeugposition
        if (this.inVehicle && this.mesh) {
            this.position.copy(this.inVehicle.position);
            this.mesh.position.copy(this.position);
            this.rotation = this.inVehicle.rotation;
            this.mesh.rotation.y = this.rotation;
        }
    }

    enterVehicle(vehicle) {
        this.inVehicle = vehicle;
    }

    exitVehicle() {
        this.inVehicle = null;
    }

    damage(amount) {
        this.health -= amount;

        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }

    heal(amount) {
        this.health += amount;

        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }
    }

    die() {
        this.isActive = false;
        // In Unterklassen überschreiben für spezifisches Verhalten
    }
}