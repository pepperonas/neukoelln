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
        // Basic update method, to be overridden by subclasses
        // This just keeps the mesh in sync with the entity position
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.rotation;
        }
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

    // Get bounding box (Kollisionsbox)
    getBoundingBox() {
        if (!this.mesh) return null;
        return new THREE.Box3().setFromObject(this.mesh);
    }

    // Check collision with another entity
    collidesWith(otherEntity) {
        if (!this.mesh || !otherEntity || !otherEntity.mesh) return false;

        const thisBox = this.getBoundingBox();
        const otherBox = otherEntity.getBoundingBox();

        if (!thisBox || !otherBox) return false;

        return thisBox.intersectsBox(otherBox);
    }

    // Optional: Method to add debugging visuals (bounding box visualization)
    addDebugVisuals(scene) {
        if (!this.mesh || !scene) return;

        // Create wireframe box helper
        const boxHelper = new THREE.BoxHelper(this.mesh, 0xff0000);
        this.debugVisuals = boxHelper;
        scene.add(boxHelper);
    }

    // Update debug visuals
    updateDebugVisuals() {
        if (this.debugVisuals) {
            this.debugVisuals.update();
        }
    }

    // Remove debug visuals
    removeDebugVisuals(scene) {
        if (this.debugVisuals && scene) {
            scene.remove(this.debugVisuals);
            this.debugVisuals = null;
        }
    }

    // Dispose of resources
    dispose() {
        this.removeDebugVisuals();

        if (this.mesh) {
            // Dispose of geometries and materials
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