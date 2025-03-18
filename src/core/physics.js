import * as THREE from 'three';

export class PhysicsEngine {
    constructor() {
        this.gravity = -9.8;
        this.objects = [];
    }

    addObject(object) {
        if (!object.physics) {
            object.physics = {
                velocity: new THREE.Vector3(0, 0, 0),
                acceleration: new THREE.Vector3(0, 0, 0),
                mass: 1,
                isStatic: false,
                isKinematic: false,
                useGravity: true,
                friction: 0.1,
                restitution: 0.3, // Bounciness
                collider: null
            };
        }

        this.objects.push(object);
    }

    removeObject(object) {
        const index = this.objects.indexOf(object);
        if (index !== -1) {
            this.objects.splice(index, 1);
        }
    }

    update(deltaTime) {
        // Apply physics to all objects
        this.objects.forEach(object => {
            if (object.isActive && !object.physics.isStatic) {
                // Apply gravity if enabled
                if (object.physics.useGravity) {
                    object.physics.acceleration.y = this.gravity;
                }

                // Update velocity based on acceleration
                object.physics.velocity.x += object.physics.acceleration.x * deltaTime;
                object.physics.velocity.y += object.physics.acceleration.y * deltaTime;
                object.physics.velocity.z += object.physics.acceleration.z * deltaTime;

                // Apply friction (simple implementation)
                if (object.physics.velocity.length() > 0) {
                    const friction = new THREE.Vector3()
                        .copy(object.physics.velocity)
                        .normalize()
                        .multiplyScalar(-object.physics.friction);

                    object.physics.velocity.add(friction);

                    // Stop if velocity is very small
                    if (object.physics.velocity.length() < 0.01) {
                        object.physics.velocity.set(0, 0, 0);
                    }
                }

                // Update position based on velocity
                object.position.x += object.physics.velocity.x * deltaTime;
                object.position.y += object.physics.velocity.y * deltaTime;
                object.position.z += object.physics.velocity.z * deltaTime;

                // Update mesh position
                if (object.mesh) {
                    object.mesh.position.copy(object.position);
                }
            }
        });

        // Handle collisions (simplified)
        // This would normally use a more sophisticated collision detection system
    }

    applyForce(object, force) {
        if (!object.physics.isStatic) {
            const acceleration = new THREE.Vector3()
                .copy(force)
                .divideScalar(object.physics.mass);

            object.physics.acceleration.add(acceleration);
        }
    }

    applyImpulse(object, impulse) {
        if (!object.physics.isStatic) {
            const velocityChange = new THREE.Vector3()
                .copy(impulse)
                .divideScalar(object.physics.mass);

            object.physics.velocity.add(velocityChange);
        }
    }
}