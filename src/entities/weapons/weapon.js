export class Weapon {
    constructor(options = {}) {
        this.name = options.name || 'Standard-Waffe';
        this.damage = options.damage || 10;
        this.fireRate = options.fireRate || 2; // Schüsse pro Sekunde
        this.ammo = options.ammo !== undefined ? options.ammo : 100;
        this.maxAmmo = options.maxAmmo || 100;
        this.reloadTime = options.reloadTime || 2; // Sekunden
        this.isReloading = false;
        this.range = options.range || 50; // Maximale Reichweite
        this.projectileSpeed = options.projectileSpeed || 0.5;
    }

    fire(position, direction, owner) {
        if (this.ammo <= 0 || this.isReloading) {
            return null;
        }

        this.ammo--;

        // Gibt ein Projektil-Konfigurationsobjekt zurück, das vom Rufer verwendet werden kann
        return {
            position: position,
            direction: direction,
            speed: this.projectileSpeed,
            damage: this.damage,
            owner: owner,
            range: this.range
        };
    }

    reload() {
        if (this.ammo < this.maxAmmo && !this.isReloading) {
            this.isReloading = true;

            // Timer für Nachladen setzen
            setTimeout(() => {
                this.ammo = this.maxAmmo;
                this.isReloading = false;
                console.log(`${this.name} nachgeladen!`);
            }, this.reloadTime * 1000);

            return true;
        }

        return false;
    }
}