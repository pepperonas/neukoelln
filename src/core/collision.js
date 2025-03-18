import * as THREE from 'three';

export class CollisionManager {
    constructor() {
        this.boundingBoxes = new Map();
    }

    addEntity(entity) {
        if (entity.mesh) {
            this.boundingBoxes.set(entity.id, new THREE.Box3().setFromObject(entity.mesh));
        }
    }

    removeEntity(entity) {
        this.boundingBoxes.delete(entity.id);
    }

    update(entities) {
        // Update all bounding boxes for entities
        entities.forEach(entity => {
            if (entity.mesh && entity.isActive) {
                const box = this.boundingBoxes.get(entity.id);
                if (box) {
                    box.setFromObject(entity.mesh);
                } else {
                    this.addEntity(entity);
                }
            }
        });
    }

    checkCollision(entityA, entityB) {
        const boxA = this.boundingBoxes.get(entityA.id);
        const boxB = this.boundingBoxes.get(entityB.id);

        if (boxA && boxB) {
            return boxA.intersectsBox(boxB);
        }

        return false;
    }

    checkAllCollisions(entities) {
        const collisions = [];

        for (let i = 0; i < entities.length; i++) {
            const entityA = entities[i];

            if (!entityA.isActive || !this.boundingBoxes.has(entityA.id)) continue;

            for (let j = i + 1; j < entities.length; j++) {
                const entityB = entities[j];

                if (!entityB.isActive || !this.boundingBoxes.has(entityB.id)) continue;

                if (this.checkCollision(entityA, entityB)) {
                    collisions.push({ a: entityA, b: entityB });
                }
            }
        }

        return collisions;
    }
}