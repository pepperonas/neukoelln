import * as THREE from 'three';
import { Character } from './character.js';

export class Enemy extends Character {
    constructor(options = {}) {
        super(options);

        // Gegner-Eigenschaften
        this.type = options.type || 'civilian';
        this.detectionRadius = options.detectionRadius || 15;
        this.attackRange = options.attackRange || 8;
        this.damage = options.damage || 5;
        this.attackCooldown = options.attackCooldown || 2; // Sekunden zwischen Angriffen
        this.lastAttack = 0;
        this.target = null; // Ziel des Gegners
        this.patrolPoints = options.patrolPoints || [];
        this.currentPatrolPoint = 0;
        this.state = 'patrol'; // patrol, chase, attack

        // Erstelle Gegner-Modell
        this.createEnemyModel(options.color || 0xff0000);
    }

    createEnemyModel(color) {
        // Einfaches Gegner-Mesh (ähnlich dem Spieler, aber andere Farbe)
        this.mesh = new THREE.Group();

        // Körper (Zylinder)
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        this.mesh.add(body);

        // Kopf (Kugel)
        const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.35;
        head.castShadow = true;
        this.mesh.add(head);

        // Optional: Waffe, je nach Gegnertyp
        if (this.type !== 'civilian') {
            const weaponGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.4);
            const weaponMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
            const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
            weapon.position.set(0.3, 0.9, 0.3);
            this.mesh.add(weapon);
        }
    }

    update(deltaTime) {
        super.update(deltaTime);

        // KI-Verhalten basierend auf dem aktuellen Zustand
        switch (this.state) {
            case 'patrol':
                this.patrol(deltaTime);
                break;
            case 'chase':
                this.chase(deltaTime);
                break;
            case 'attack':
                this.attack(deltaTime);
                break;
        }

        // Aktualisiere Mesh-Position und -Rotation
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;
    }

    patrol(deltaTime) {
        // Wenn keine Patrouillen-Punkte definiert sind, einfach stehen bleiben
        if (this.patrolPoints.length === 0) return;

        // Aktuellen Patrouillen-Punkt als Ziel festlegen
        const target = this.patrolPoints[this.currentPatrolPoint];

        // Zum Ziel bewegen
        this.moveTowards(target, this.walkSpeed * deltaTime);

        // Wenn nahe genug am Ziel, zum nächsten Patrouillen-Punkt wechseln
        if (this.position.distanceTo(target) < 1) {
            this.currentPatrolPoint = (this.currentPatrolPoint + 1) % this.patrolPoints.length;
        }

        // Spieler erkennen und in den "chase"-Zustand wechseln
        if (this.target && this.position.distanceTo(this.target.position) < this.detectionRadius) {
            this.state = 'chase';
        }
    }

    chase(deltaTime) {
        // Wenn kein Ziel vorhanden oder Ziel zu weit entfernt, zurück zu Patrouille
        if (!this.target || this.position.distanceTo(this.target.position) > this.detectionRadius * 1.5) {
            this.state = 'patrol';
            return;
        }

        // In Richtung Ziel bewegen
        this.moveTowards(this.target.position, this.runSpeed * deltaTime);

        // Wenn in Angriffsreichweite, in den "attack"-Zustand wechseln
        if (this.position.distanceTo(this.target.position) < this.attackRange) {
            this.state = 'attack';
        }
    }

    attack(deltaTime) {
        // Wenn kein Ziel vorhanden oder Ziel außerhalb der Angriffsreichweite, zurück zu chase
        if (!this.target || this.position.distanceTo(this.target.position) > this.attackRange) {
            this.state = 'chase';
            return;
        }

        // Gegner auf das Ziel ausrichten
        this.lookAt(this.target.position);

        // Verzögerung zwischen Angriffen
        const now = performance.now();
        if (now - this.lastAttack > this.attackCooldown * 1000) {
            this.lastAttack = now;

            // Schaden verursachen (wenn in Reichweite)
            if (this.target.damage) {
                this.target.damage(this.damage);
                console.log(`Gegner greift an! Schaden: ${this.damage}`);
            }
        }
    }

    moveTowards(targetPosition, speed) {
        // Richtungsvektor zum Ziel berechnen
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, this.position)
            .normalize();

        // In Richtung Ziel drehen
        this.lookAt(targetPosition);

        // Position aktualisieren
        this.position.x += direction.x * speed;
        this.position.z += direction.z * speed;
    }

    lookAt(targetPosition) {
        // Berechne den Winkel zum Ziel (nur Rotation um Y-Achse)
        const dx = targetPosition.x - this.position.x;
        const dz = targetPosition.z - this.position.z;
        this.rotation = Math.atan2(dx, dz);
        this.direction.set(Math.sin(this.rotation), 0, Math.cos(this.rotation));
    }

    setTarget(target) {
        this.target = target;
    }

    die() {
        super.die();
        console.log(`Gegner ${this.id} ist tot!`);
        // Hier könnten Items oder Belohnungen generiert werden
    }
}