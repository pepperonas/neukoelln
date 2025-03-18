import * as THREE from 'three';
import {Entity} from '../entity.js';

export class Vehicle extends Entity {
    constructor(options = {}) {
        super();

        // Vehicle properties
        this.speed = 0;
        this.maxSpeed = options.maxSpeed || 0.1;
        this.acceleration = options.acceleration || 0.005;
        this.deceleration = options.deceleration || 0.003;
        this.braking = options.braking || 0.015;
        this.turnSpeed = options.turnSpeed || 0.03;
        this.direction = new THREE.Vector3(0, 0, 1);

        // Create vehicle mesh group
        this.mesh = new THREE.Group();

        // Create wheels array
        this.wheels = [];

        // Fahrzeug-spezifische Eigenschaften
        this.driver = null; // Referenz zum Fahrer (Character-Objekt)
        this.durability = options.durability || 100; // Gesundheit des Fahrzeugs
        this.maxDurability = options.maxDurability || 100;
        this.enterExitDistance = options.enterExitDistance || 2.5; // Wie weit kann der Spieler vom Fahrzeug entfernt sein, um einzusteigen

        // Debug-Flag
        this.debug = true;

        // Status-Tracking für E-Taste
        this.eKeyPressed = false;
    }

    update(deltaTime, inputManager) {
        // Nur Steuerung erlauben, wenn ein Fahrer vorhanden ist
        if (this.driver) {
            const accelerating = inputManager.isPressed('ArrowUp') || inputManager.isPressed('KeyW');
            const braking = inputManager.isPressed('Space');
            const reversing = inputManager.isPressed('ArrowDown') || inputManager.isPressed('KeyS');

            // Falls ein Fahrer vorhanden ist, stelle sicher, dass er unsichtbar bleibt
            if (this.driver && this.driver.mesh) {
                // Fahrer immer unsichtbar machen, während er im Fahrzeug ist
                this.driver.mesh.visible = false;

                // Auch alle Kinder des Fahrer-Mesh unsichtbar machen
                if (this.driver.mesh.children && this.driver.mesh.children.length > 0) {
                    this.driver.mesh.children.forEach(child => {
                        child.visible = false;
                    });
                }
            }

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

        if (this.debug) {
            console.log(`Fahrzeug nimmt ${amount} Schaden, verbleibende Haltbarkeit: ${this.durability}`);
        }

        // Fahrzeug-Beschädigung hier implementieren (z.B. Rauch, Feuer, etc.)
        if (this.durability <= 0) {
            this.durability = 0;
            this.destroy();
        }
    }

    destroy() {
        // Wenn ein Fahrer im Fahrzeug ist, diesen aussteigen lassen
        this.ejectDriver();

        // Explosion oder sonstige Zerstörungseffekte hier
        if (this.debug) {
            console.log("Fahrzeug zerstört!");
        }

        // Deaktiviere Fahrzeug
        this.isActive = false;
    }

    // Fahrer ins Fahrzeug setzen
    setDriver(character) {
        if (this.debug) {
            console.log("Vehicle.setDriver aufgerufen, Character:", character);
        }

        if (!this.driver) {
            this.driver = character;
            character.enterVehicle(this);

            if (this.debug) {
                console.log("Fahrer eingestiegen:", character);
            }

            return true;
        }

        if (this.debug) {
            console.log("Fahrzeug hat bereits einen Fahrer:", this.driver);
        }

        return false;
    }

    // Alternative Implementierung für ein sanfteres Anhalten
    ejectDriver() {
        if (this.debug) {
            console.log("Vehicle.ejectDriver aufgerufen, aktueller Fahrer:", this.driver);
        }

        if (this.driver) {
            // Speichere Referenz zum Fahrer, dann setze this.driver auf null
            const driver = this.driver;
            this.driver = null;

            // Fahrzeug sofort anhalten wenn der Fahrer aussteigt
            this.speed = 0;

            // Optional: Alle Kräfte zurücksetzen
            if (this.physics && this.physics.velocity) {
                this.physics.velocity.set(0, 0, 0);
            }

            // Eine kleine Verzögerung vor dem Aussteigen, um sicherzustellen,
            // dass das Fahrzeug vollständig anhält
            setTimeout(() => {
                // Wenn der Fahrer immer noch in einem Fahrzeug ist (und dieses Fahrzeug ist)
                // lass ihn aussteigen
                if (driver.inVehicle === this) {
                    driver.exitVehicle();

                    if (this.debug) {
                        console.log("Fahrer ausgestiegen:", driver);
                    }
                }
            }, 100); // 100ms Verzögerung

            return true;
        }

        return false;
    }

    // Prüfen, ob ein Charakter nahe genug ist, um einzusteigen
    canEnter(character) {
        const distance = this.position.distanceTo(character.position);
        return distance <= this.enterExitDistance;
    }
}