import * as THREE from 'three';

export class Entity {
    constructor() {
        this.position = new THREE.Vector3();
        this.rotation = 0;
        this.mesh = null;
        this.id = Math.random().toString(36).substr(2, 9);
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
}