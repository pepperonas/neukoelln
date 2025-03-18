import * as THREE from 'three';

export class EntityManager {
    constructor(scene) {
        this.scene = scene;
        this.entities = [];
    }

    add(entity) {
        this.entities.push(entity);
        entity.addToScene(this.scene);
        return entity;
    }

    remove(entity) {
        const index = this.entities.indexOf(entity);
        if (index !== -1) {
            entity.removeFromScene(this.scene);
            this.entities.splice(index, 1);
        }
    }

    update(deltaTime, inputManager) {
        this.entities.forEach(entity => {
            if (entity.isActive) {
                entity.update(deltaTime, inputManager);
            }
        });
    }

    getByType(constructor) {
        return this.entities.filter(entity => entity instanceof constructor);
    }

    checkCollisions() {
        // Basic collision detection between entities
        for (let i = 0; i < this.entities.length; i++) {
            const entityA = this.entities[i];

            // Skip if entity doesn't have a mesh or doesn't need collision
            if (!entityA.mesh || !entityA.isActive) continue;

            // Create a bounding box for entity A
            const boxA = new THREE.Box3().setFromObject(entityA.mesh);

            for (let j = i + 1; j < this.entities.length; j++) {
                const entityB = this.entities[j];

                // Skip if entity doesn't have a mesh or doesn't need collision
                if (!entityB.mesh || !entityB.isActive) continue;

                // Create a bounding box for entity B
                const boxB = new THREE.Box3().setFromObject(entityB.mesh);

                // Check for intersection
                if (boxA.intersectsBox(boxB)) {
                    // Handle collision
                    if (entityA.onCollision) entityA.onCollision(entityB);
                    if (entityB.onCollision) entityB.onCollision(entityA);
                }
            }
        }
    }

    clear() {
        // Remove all entities from the scene
        this.entities.forEach(entity => {
            entity.removeFromScene(this.scene);
        });
        this.entities = [];
    }
}