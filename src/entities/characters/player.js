import * as THREE from 'three';
import {Character} from './character.js';
import {Weapon} from '../weapons/weapon.js';
import {Projectile} from '../weapons/projectile.js';

export class Player extends Character {
    constructor(options = {}) {
        super(options);

        // Waffen-Setup
        this.weapon = new Weapon({
            damage: 10,
            fireRate: 2, // Schüsse pro Sekunde
            ammo: 100,
            maxAmmo: 100
        });
        this.lastShot = 0;

        // Spieler-Eigenschaften
        this.walkSpeed = 0.08;
        this.runSpeed = 0.15;
        this.health = 100;
        this.maxHealth = 100;

        // Erstelle Spieler-Modell
        this.createPlayerModel(options.color || 0x3366ff);
    }

    createPlayerModel(color) {
        // Einfaches Spieler-Mesh (Zylinder + Kugel für Kopf)
        this.mesh = new THREE.Group();

        // Körper (Zylinder)
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({color: color});
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        this.mesh.add(body);

        // Kopf (Kugel)
        const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({color: 0xffcc99});
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.35;
        head.castShadow = true;
        this.mesh.add(head);

        // Waffe (einfacher Quader)
        const weaponGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.4);
        const weaponMaterial = new THREE.MeshStandardMaterial({color: 0x333333});
        this.weaponMesh = new THREE.Mesh(weaponGeometry, weaponMaterial);
        this.weaponMesh.position.set(0.3, 0.9, 0.3);
        this.mesh.add(this.weaponMesh);
    }

    update(deltaTime, inputManager) {
        // Bewegung nur wenn nicht in einem Fahrzeug
        if (!this.inVehicle) {
            const moveSpeed = inputManager.isPressed('ShiftLeft') ? this.runSpeed : this.walkSpeed;

            // Bewegung vorwärts/rückwärts
            if (inputManager.isPressed('KeyW') || inputManager.isPressed('ArrowUp')) {
                this.position.x += Math.sin(this.rotation) * moveSpeed;
                this.position.z += Math.cos(this.rotation) * moveSpeed;
            }
            if (inputManager.isPressed('KeyS') || inputManager.isPressed('ArrowDown')) {
                this.position.x -= Math.sin(this.rotation) * moveSpeed * 0.7;
                this.position.z -= Math.cos(this.rotation) * moveSpeed * 0.7;
            }

            // Drehung links/rechts
            if (inputManager.isPressed('KeyA') || inputManager.isPressed('ArrowLeft')) {
                this.rotation += 0.05;
            }
            if (inputManager.isPressed('KeyD') || inputManager.isPressed('ArrowRight')) {
                this.rotation -= 0.05;
            }

            // Aktualisiere die Richtungsvektoren basierend auf der aktuellen Rotation
            this.direction.set(Math.sin(this.rotation), 0, Math.cos(this.rotation));

            // Schießen
            if (inputManager.isPressed('Space')) {
                this.shoot();
            }
        }

        // Aktualisiere Position und Rotation des Mesh
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;
    }

    shoot() {
        const now = performance.now();
        // Prüfe, ob seit dem letzten Schuss genug Zeit vergangen ist (Feuerrate)
        if (now - this.lastShot < 1000 / this.weapon.fireRate) return;

        // Prüfe, ob noch Munition vorhanden ist
        if (this.weapon.ammo <= 0) {
            console.log("Keine Munition!");
            return;
        }

        this.weapon.ammo--;
        this.lastShot = now;

        console.log("Schuss abgefeuert! Verbleibende Munition:", this.weapon.ammo);

        // Erstelle Projektil an der Position der Waffe
        const projectilePosition = new THREE.Vector3();
        this.weaponMesh.getWorldPosition(projectilePosition);

        // Erstelle ein neues Projektil (wird später an EntityManager übergeben)
        const projectile = new Projectile({
            position: projectilePosition,
            direction: this.direction.clone(),
            speed: 0.5,
            damage: this.weapon.damage,
            lifeTime: 1.5, // Sekunden bis das Projektil verschwindet
            owner: this
        });

        // Gibt das Projektil zurück, damit der GameManager es zum EntityManager hinzufügen kann
        return projectile;
    }

    enterVehicle(vehicle) {
        this.inVehicle = vehicle;
        // Verstecke Spieler-Mesh, wenn im Fahrzeug
        this.mesh.visible = false;
    }

    exitVehicle() {
        if (this.inVehicle) {
            // Setze Spieler-Position auf Position neben dem Fahrzeug
            const offset = new THREE.Vector3(
                Math.sin(this.inVehicle.rotation + Math.PI / 2) * 2,
                0,
                Math.cos(this.inVehicle.rotation + Math.PI / 2) * 2
            );
            this.position.copy(this.inVehicle.position).add(offset);

            // Übernimm Rotation des Fahrzeugs
            this.rotation = this.inVehicle.rotation;

            // Aktualisiere Mesh-Position und -Rotation
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.rotation;

            // Zeige Spieler-Mesh wieder an
            this.mesh.visible = true;

            // Referenz zum Fahrzeug löschen
            this.inVehicle = null;
        }
    }

    damage(amount) {
        this.health -= amount;

        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }

    die() {
        console.log("Spieler gestorben!");
        // Hier kann später Respawn-Logik hinzugefügt werden
    }
}