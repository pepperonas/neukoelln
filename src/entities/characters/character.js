import * as THREE from 'three';
import {Entity} from '../entity.js';

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

        // Debug-Flag
        this.debug = options.debug || false;
    }

    update(deltaTime, inputManager) {
        // Basis-Update für alle Charaktere
        super.update(deltaTime);

        // Wenn dieser Charakter in einem Fahrzeug ist
        if (this.inVehicle) {
            // Position und Rotation aktualisieren
            this.position.copy(this.inVehicle.position);
            this.rotation = this.inVehicle.rotation;

            // Mesh-Position und -Rotation aktualisieren, falls vorhanden
            if (this.mesh) {
                this.mesh.position.copy(this.position);
                this.mesh.rotation.y = this.rotation;

                // WICHTIG: Charakter im Fahrzeug immer unsichtbar halten
                if (this.mesh.visible) {
                    this.mesh.visible = false;

                    // Alle Kinder ebenfalls unsichtbar machen
                    if (this.mesh.children && this.mesh.children.length > 0) {
                        this.mesh.children.forEach(child => {
                            child.visible = false;
                        });
                    }
                }
            }
        }
    }

    enterVehicle(vehicle) {
        if (this.debug) {
            console.log("Character.enterVehicle aufgerufen mit Fahrzeug:", vehicle);
        }

        this.inVehicle = vehicle;

        if (this.debug) {
            console.log("Character jetzt im Fahrzeug:", this.inVehicle);
        }
    }

    exitVehicle() {
        if (this.debug) {
            console.log("Character.exitVehicle aufgerufen, aktuelles Fahrzeug:", this.inVehicle);
        }

        // Implementierung in abgeleiteten Klassen
        this.inVehicle = null;

        if (this.debug) {
            console.log("Character jetzt nicht mehr im Fahrzeug");
        }
    }

    damage(amount) {
        this.health -= amount;

        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }

        if (this.debug) {
            console.log(`Character nimmt ${amount} Schaden, verbleibende Gesundheit: ${this.health}`);
        }
    }

    heal(amount) {
        this.health += amount;

        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }

        if (this.debug) {
            console.log(`Character heilt ${amount}, neue Gesundheit: ${this.health}`);
        }
    }

    die() {
        this.isActive = false;

        if (this.debug) {
            console.log("Character stirbt");
        }

        // In Unterklassen überschreiben für spezifisches Verhalten
    }
}