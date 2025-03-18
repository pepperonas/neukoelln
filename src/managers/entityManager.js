import * as THREE from 'three';
import {Player} from '../entities/characters/player.js';

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

        // Spezielle Prüfung für Player-Objekte
        if (entity instanceof Player) {
            // Prüfe, ob es sich um einen Remote-Spieler handelt
            const isRemote = entity.id.startsWith('remote_');

            if (!isRemote) {
                // Nur für lokale Spieler: Überprüfe, ob bereits ein lokaler Spieler existiert
                const existingLocalPlayers = this.entities.filter(e =>
                    e instanceof Player && !e.id.startsWith('remote_')
                );

                if (existingLocalPlayers.length > 0) {
                    console.warn("Versuch, einen zweiten lokalen Player hinzuzufügen! Dies ist nicht erlaubt.");
                    return existingLocalPlayers[0]; // Gib den existierenden Player zurück
                }
            }
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
        // Stelle sicher, dass kein doppelter Player aktualisiert wird
        let playerUpdated = false;

        this.entities.forEach(entity => {
            if (entity && entity.isActive) {
                // Spezielle Behandlung für Player-Objekte
                if (entity instanceof Player) {
                    if (playerUpdated) {
                        console.warn("Mehrere Player-Instanzen gefunden!");
                        return; // Aktualisiere nur den ersten Player
                    }
                    playerUpdated = true;
                }

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