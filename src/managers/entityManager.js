import * as THREE from 'three';

export class EntityManager {
    constructor(scene) {
        this.scene = scene;
        this.entities = [];
        this.entityMap = new Map(); // Map zur Vermeidung von Duplikaten
    }

    add(entity) {
        // Prüfe, ob die Entity bereits existiert
        if (this.entityMap.has(entity.id)) {
            console.warn(`Entity mit ID ${entity.id} existiert bereits.`);
            return entity;
        }

        this.entities.push(entity);
        this.entityMap.set(entity.id, entity);
        entity.addToScene(this.scene);
        return entity;
    }

    remove(entity) {
        if (!entity) return;

        const index = this.entities.indexOf(entity);
        if (index !== -1) {
            entity.removeFromScene(this.scene);
            this.entities.splice(index, 1);
            this.entityMap.delete(entity.id);
        }
    }

    update(deltaTime, inputManager) {
        this.entities.forEach(entity => {
            if (entity && entity.isActive) {
                entity.update(deltaTime, inputManager);
            }
        });
    }

    getByType(constructor) {
        return this.entities.filter(entity => entity instanceof constructor);
    }

    getById(id) {
        return this.entityMap.get(id);
    }

    checkCollisions() {
        // Basic collision detection between entities
        const collisions = [];

        for (let i = 0; i < this.entities.length; i++) {
            const entityA = this.entities[i];

            // Skip if entity doesn't have a mesh or doesn't need collision
            if (!entityA || !entityA.mesh || !entityA.isActive) continue;

            // Create a bounding box for entity A
            const boxA = new THREE.Box3().setFromObject(entityA.mesh);

            for (let j = i + 1; j < this.entities.length; j++) {
                const entityB = this.entities[j];

                // Skip if entity doesn't have a mesh or doesn't need collision
                if (!entityB || !entityB.mesh || !entityB.isActive) continue;

                // Create a bounding box for entity B
                const boxB = new THREE.Box3().setFromObject(entityB.mesh);

                // Check for intersection
                if (boxA.intersectsBox(boxB)) {
                    collisions.push({entityA, entityB});
                }
            }
        }

        // Handle collisions
        collisions.forEach(collision => {
            const {entityA, entityB} = collision;

            if (entityA.onCollision) entityA.onCollision(entityB);
            if (entityB.onCollision) entityB.onCollision(entityA);
        });

        return collisions;
    }

    clear() {
        // Remove all entities from the scene
        this.entities.forEach(entity => {
            if (entity) {
                entity.removeFromScene(this.scene);
            }
        });
        this.entities = [];
        this.entityMap.clear();
    }
}