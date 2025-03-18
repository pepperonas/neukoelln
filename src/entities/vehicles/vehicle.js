import * as THREE from 'three';
import { Entity } from '../entity.js';

export class Vehicle extends Entity {
    constructor(options = {}) {
        super();

        // Vehicle properties
        this.speed = 0;
        this.maxSpeed = options.maxSpeed || 0.1;        // Reduziert von 0.25 auf 0.1
        this.acceleration = options.acceleration || 0.005; // Reduziert von 0.01 auf 0.005
        this.deceleration = options.deceleration || 0.003; // Reduziert von 0.005 auf 0.003
        this.braking = options.braking || 0.015;        // Reduziert von 0.03 auf 0.015
        this.turnSpeed = options.turnSpeed || 0.03;     // Reduziert von 0.04 auf 0.03
        this.direction = new THREE.Vector3(0, 0, 1);

        // Create vehicle mesh group
        this.mesh = new THREE.Group();

        // Create wheels array
        this.wheels = [];
    }

    update(deltaTime, inputManager) {
        const accelerating = inputManager.isPressed('ArrowUp') || inputManager.isPressed('KeyW');
        const braking = inputManager.isPressed('Space');
        const reversing = inputManager.isPressed('ArrowDown') || inputManager.isPressed('KeyS');

        // Handle acceleration
        if (accelerating && !reversing) {
            this.speed += this.acceleration;
            if (this.speed > this.maxSpeed) {
                this.speed = this.maxSpeed;
            }
        } else if (reversing && !accelerating) {
            this.speed -= this.acceleration;
            if (this.speed < -this.maxSpeed / 2) {
                this.speed = -this.maxSpeed / 2;
            }
        } else {
            // Natural deceleration
            if (this.speed > 0) {
                this.speed -= this.deceleration;
                if (this.speed < 0) this.speed = 0;
            } else if (this.speed < 0) {
                this.speed += this.deceleration;
                if (this.speed > 0) this.speed = 0;
            }
        }

        // Apply brakes
        if (braking) {
            if (this.speed > 0) {
                this.speed -= this.braking;
                if (this.speed < 0) this.speed = 0;
            } else if (this.speed < 0) {
                this.speed += this.braking;
                if (this.speed > 0) this.speed = 0;
            }
        }

        // Handle turning
        const turningLeft = inputManager.isPressed('ArrowLeft') || inputManager.isPressed('KeyA');
        const turningRight = inputManager.isPressed('ArrowRight') || inputManager.isPressed('KeyD');

        if (this.speed !== 0) {
            if (turningLeft && !turningRight) {
                this.rotation += this.turnSpeed * Math.sign(this.speed);
            } else if (turningRight && !turningLeft) {
                this.rotation -= this.turnSpeed * Math.sign(this.speed);
            }

            // Update direction vector
            this.direction.set(
                Math.sin(this.rotation),
                0,
                Math.cos(this.rotation)
            );
        }

        // Update position based on direction and speed
        this.position.x += this.direction.x * this.speed;
        this.position.z += this.direction.z * this.speed;

        // Update mesh position and rotation
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;

        // Rotate wheels based on speed
        this.wheels.forEach(wheel => {
            wheel.rotation.x += this.speed * 0.5;
        });
    }

    damage(amount) {
        this.durability -= amount;
        if (this.durability <= 0) {
            this.destroy();
        }
    }

    destroy() {
        this.isActive = false;
    }
}