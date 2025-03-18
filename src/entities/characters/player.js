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

        // Debug-Flag
        this.debug = true;

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
        }

        // Aktualisiere Position und Rotation des Mesh
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;
    }

    updateWithoutInput(deltaTime) {
        // Basis-Update ohne Bewegungslogik
        super.update(deltaTime);

        // Aktualisiere Position und Rotation des Mesh
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.y = this.rotation;
        }
    }

    shoot() {
        if (this.debug) console.log("Schussfunktion aufgerufen");

        const now = performance.now();
        // Prüfe, ob seit dem letzten Schuss genug Zeit vergangen ist (Feuerrate)
        if (now - this.lastShot < 1000 / this.weapon.fireRate) {
            if (this.debug) console.log("Feuerrate-Verzögerung, noch nicht bereit zum Schießen");
            return null;
        }

        // Prüfe, ob noch Munition vorhanden ist
        if (this.weapon.ammo <= 0) {
            if (this.debug) console.log("Keine Munition mehr!");
            return null;
        }

        this.weapon.ammo--;
        this.lastShot = now;

        if (this.debug) console.log("Schuss abgefeuert! Verbleibende Munition:", this.weapon.ammo);

        // Erstelle Projektil an der Position der Waffe
        const projectilePosition = new THREE.Vector3();
        this.weaponMesh.getWorldPosition(projectilePosition);

        // Erstelle ein neues Projektil
        const projectile = new Projectile({
            position: projectilePosition.clone(),
            direction: this.direction.clone(),
            speed: 0.5,
            damage: this.weapon.damage,
            lifeTime: 1.5, // Sekunden bis das Projektil verschwindet
            owner: this
        });

        if (this.debug) console.log("Projektil erstellt:", projectile);

        // Gib das Projektil zurück, damit der GameManager es zum EntityManager hinzufügen kann
        return projectile;
    }

    enterVehicle(vehicle) {
        if (this.debug) console.log("Player.enterVehicle aufgerufen, Fahrzeug:", vehicle);

        this.inVehicle = vehicle;

        // Verstecke Spieler-Mesh, wenn im Fahrzeug
        if (this.mesh) {
            // Wichtig: Setze das gesamte Mesh komplett unsichtbar
            this.mesh.visible = false;

            // Zusätzlich alle Kinder im Mesh durchgehen und ebenfalls unsichtbar machen
            if (this.mesh.children && this.mesh.children.length > 0) {
                this.mesh.children.forEach(child => {
                    child.visible = false;
                });
            }

            if (this.debug) console.log("Spieler-Mesh wurde vollständig versteckt");
        }
    }

    exitVehicle() {
        if (this.debug) console.log("Player.exitVehicle aufgerufen, aktuelles Fahrzeug:", this.inVehicle);

        if (this.inVehicle) {
            // Setze Spieler-Position auf Position neben dem Fahrzeug
            const offset = new THREE.Vector3(
                Math.sin(this.inVehicle.rotation + Math.PI / 2) * 2,
                0,
                Math.cos(this.inVehicle.rotation + Math.PI / 2) * 2
            );

            // Kopiere Position des Fahrzeugs und addiere Offset
            this.position.copy(this.inVehicle.position).add(offset);

            // Übernimm Rotation des Fahrzeugs
            this.rotation = this.inVehicle.rotation;

            // Referenz zum Fahrzeug zwischenspeichern
            const vehicle = this.inVehicle;

            // Referenz zum Fahrzeug löschen (wichtig: vor dem Aufruf von ejectDriver!)
            this.inVehicle = null;

            // Aktualisiere Mesh-Position und -Rotation
            if (this.mesh) {
                this.mesh.position.copy(this.position);
                this.mesh.rotation.y = this.rotation;

                // Mache Spieler-Mesh wieder sichtbar
                this.mesh.visible = true;

                // Mache auch alle Kinder im Mesh wieder sichtbar
                if (this.mesh.children && this.mesh.children.length > 0) {
                    this.mesh.children.forEach(child => {
                        child.visible = true;
                    });
                }

                if (this.debug) console.log("Spieler-Mesh wurde vollständig sichtbar gemacht, Position:", this.position);
            }

            // Informiere das Fahrzeug, dass der Fahrer ausgestiegen ist
            if (vehicle.driver === this) {
                vehicle.ejectDriver();
                if (this.debug) console.log("Fahrzeug informiert, dass Fahrer ausgestiegen ist");
            }
        }
    }

    damage(amount) {
        this.health -= amount;

        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }

        if (this.debug) console.log("Spieler nimmt Schaden:", amount, "Verbleibende Gesundheit:", this.health);
    }

    die() {
        if (this.debug) console.log("Spieler ist gestorben!");

        // Hier kann später Respawn-Logik hinzugefügt werden
        this.isActive = false;
    }
}