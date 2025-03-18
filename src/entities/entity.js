import * as THREE from 'three';

export class Entity {
    constructor() {
        this.position = new THREE.Vector3();
        this.rotation = 0;
        this.mesh = null;
        // Eindeutige ID für jede Entity
        this.id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        this.isActive = true;
    }

    update(deltaTime) {
        // To be overridden by child classes
    }

    setPosition(x, y, z) {
        this.position.set(x, y, z);
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
    }

    setRotation(rotation) {
        this.rotation = rotation;
        if (this.mesh) {
            this.mesh.rotation.y = rotation;
        }
    }

    addToScene(scene) {
        if (this.mesh) {
            scene.add(this.mesh);
        }
    }

    removeFromScene(scene) {
        if (this.mesh) {
            scene.remove(this.mesh);
        }
    }

    // Kann von Unterklassen überschrieben werden, um Kollisionsverhalten zu definieren
    onCollision(otherEntity) {
        // Standard: Keine Aktion
    }

    // Hilfsmethode, um Objekte aus dem Speicher zu entfernen
    dispose() {
        if (this.mesh) {
            // Entferne alle Geometrien und Materialien
            if (this.mesh instanceof THREE.Group) {
                this.mesh.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            } else {
                if (this.mesh.geometry) this.mesh.geometry.dispose();
                if (this.mesh.material) {
                    if (Array.isArray(this.mesh.material)) {
                        this.mesh.material.forEach(material => material.dispose());
                    } else {
                        this.mesh.material.dispose();
                    }
                }
            }
        }
    }
}