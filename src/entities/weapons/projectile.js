import * as THREE from 'three';
import {Entity} from '../entity.js';

export class Projectile extends Entity {
    constructor(options = {}) {
        super();

        // Projektil-Eigenschaften
        this.speed = options.speed || 0.5;
        this.damage = options.damage || 10;
        this.owner = options.owner || null; // Wer hat das Projektil abgefeuert
        this.lifeTime = options.lifeTime || 1.5; // Lebensdauer in Sekunden
        this.born = performance.now(); // Zeitpunkt der Erstellung

        // Setze Position und Richtung
        if (options.position) {
            this.position.copy(options.position);
        }

        this.direction = options.direction || new THREE.Vector3(0, 0, 1);

        // Erstelle Projektil-Mesh
        this.createProjectileMesh();
    }

    createProjectileMesh() {
        // Einfaches Kugel-Mesh für das Projektil
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({color: 0xffff00});
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);

        // Kleines Licht am Projektil, um es besser sichtbar zu machen
        const light = new THREE.PointLight(0xffff00, 1, 3);
        light.position.set(0, 0, 0);
        this.mesh.add(light);
    }

    update(deltaTime) {
        // Bewege das Projektil in Richtung seiner Flugbahn
        const movement = this.direction.clone().multiplyScalar(this.speed);
        this.position.add(movement);

        // Aktualisiere Mesh-Position
        this.mesh.position.copy(this.position);

        // Prüfe, ob die Lebensdauer abgelaufen ist
        const age = (performance.now() - this.born) / 1000; // Alter in Sekunden
        if (age >= this.lifeTime) {
            this.isActive = false;
        }
    }

    onCollision(otherEntity) {
        // Verursache Schaden, wenn das Projektil mit einer Entität kollidiert, die nicht der Besitzer ist
        if (otherEntity !== this.owner && typeof otherEntity.damage === 'function') {
            otherEntity.damage(this.damage);
        }

        // Deaktiviere Projektil nach Treffer
        this.isActive = false;
    }
}