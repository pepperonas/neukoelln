export class HUD {
    constructor() {
        // HTML-Elemente
        this.hudElement = document.getElementById('hud');
        this.healthBarElement = document.getElementById('health-bar');
        this.ammoCounterElement = document.getElementById('ammo-counter');
        this.minimapElement = document.getElementById('minimap');
        this.missionInfoElement = document.getElementById('mission-info');

        // Status-Werte
        this.health = 100;
        this.maxHealth = 100;
        this.ammo = 0;
        this.maxAmmo = 0;
        this.weaponName = '';
        this.currentMission = null;

        // Minimap
        this.minimapContext = null;
        this.minimapSize = 150;
        this.setupMinimap();
    }

    show() {
        this.hudElement.classList.remove('hidden');
    }

    hide() {
        this.hudElement.classList.add('hidden');
    }

    update(playerData) {
        this.updateHealth(playerData.health, playerData.maxHealth);
        this.updateAmmo(playerData.ammo, playerData.maxAmmo, playerData.weaponName);
        this.updateMinimap(playerData.position, playerData.rotation, playerData.entities);

        if (playerData.missionInfo && this.currentMission !== playerData.missionInfo.id) {
            this.updateMissionInfo(playerData.missionInfo);
        }
    }

    updateHealth(health, maxHealth = 100) {
        this.health = health;
        this.maxHealth = maxHealth;

        const percentage = Math.max(0, Math.min(100, (health / maxHealth) * 100));

        // CSS-Variable setzen oder direktes Styling
        this.healthBarElement.style.setProperty('--health-percent', `${percentage}%`);
        this.healthBarElement.querySelector('span').textContent = `${Math.floor(health)}/${maxHealth}`;

        // Farbe basierend auf Gesundheit ändern
        let color = '#2ecc71'; // Grün
        if (percentage < 60) {
            color = '#f39c12'; // Orange
        }
        if (percentage < 30) {
            color = '#e74c3c'; // Rot
        }

        this.healthBarElement.querySelector('span').style.color = color;
        this.healthBarElement.querySelector('div').style.backgroundColor = color;
        this.healthBarElement.querySelector('div').style.width = `${percentage}%`;
    }

    updateAmmo(ammo, maxAmmo, weaponName = '') {
        this.ammo = ammo;
        this.maxAmmo = maxAmmo;
        this.weaponName = weaponName;

        if (weaponName && maxAmmo > 0) {
            this.ammoCounterElement.textContent = `${weaponName}: ${ammo}/${maxAmmo}`;
            this.ammoCounterElement.classList.remove('hidden');
        } else {
            this.ammoCounterElement.classList.add('hidden');
        }
    }

    setupMinimap() {
        // Canvas für die Minimap erstellen
        const canvas = document.createElement('canvas');
        canvas.width = this.minimapSize;
        canvas.height = this.minimapSize;
        this.minimapElement.appendChild(canvas);
        this.minimapContext = canvas.getContext('2d');

        // Initialen leeren Minimap zeichnen
        this.clearMinimap();
    }

    clearMinimap() {
        if (!this.minimapContext) return;

        // Hintergrund
        this.minimapContext.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.minimapContext.fillRect(0, 0, this.minimapSize, this.minimapSize);

        // Kreis für den Rand
        this.minimapContext.strokeStyle = '#ff3333';
        this.minimapContext.lineWidth = 2;
        this.minimapContext.beginPath();
        this.minimapContext.arc(
            this.minimapSize / 2,
            this.minimapSize / 2,
            this.minimapSize / 2 - 2,
            0,
            Math.PI * 2
        );
        this.minimapContext.stroke();
    }

    updateMinimap(playerPosition, playerRotation, entities = []) {
        if (!this.minimapContext) return;

        this.clearMinimap();

        // Skalierungsfaktor für die Minimap
        const scale = this.minimapSize / 100; // 100 Einheiten der Spielwelt entsprechen der Minimapgröße
        const centerX = this.minimapSize / 2;
        const centerY = this.minimapSize / 2;

        // Zeichne Entitäten relativ zur Spielerposition
        entities.forEach(entity => {
            // Berechne relative Position zur Spielerposition
            const relX = (entity.position.x - playerPosition.x) * scale + centerX;
            const relZ = (entity.position.z - playerPosition.z) * scale + centerY;

            // Prüfe, ob die Entity innerhalb der Minimap liegt
            const distance = Math.sqrt(
                Math.pow(relX - centerX, 2) +
                Math.pow(relZ - centerY, 2)
            );

            if (distance <= this.minimapSize / 2) {
                // Farbe je nach Entitätstyp
                let color = '#ffffff'; // Standard: weiß
                let size = 2;

                if (entity.type === 'player') {
                    color = '#ff3333'; // Spieler: rot
                    size = 4;
                } else if (entity.type === 'enemy') {
                    color = '#e74c3c'; // Feind: dunkelrot
                    size = 3;
                } else if (entity.type === 'vehicle') {
                    color = '#3498db'; // Fahrzeug: blau
                    size = 3;
                } else if (entity.type === 'building') {
                    color = '#95a5a6'; // Gebäude: grau
                    size = 3;
                } else if (entity.type === 'pickup') {
                    color = '#2ecc71'; // Pickup: grün
                    size = 2;
                }

                // Zeichne die Entity als Punkt
                this.minimapContext.fillStyle = color;
                this.minimapContext.beginPath();
                this.minimapContext.arc(relX, relZ, size, 0, Math.PI * 2);
                this.minimapContext.fill();
            }
        });

        // Zeichne den Spieler in der Mitte
        this.minimapContext.fillStyle = '#ffffff';
        this.minimapContext.beginPath();
        this.minimapContext.arc(centerX, centerY, 4, 0, Math.PI * 2);
        this.minimapContext.fill();

        // Zeichne die Blickrichtung des Spielers
        this.minimapContext.strokeStyle = '#ffffff';
        this.minimapContext.lineWidth = 2;
        this.minimapContext.beginPath();
        this.minimapContext.moveTo(centerX, centerY);
        this.minimapContext.lineTo(
            centerX + Math.sin(playerRotation) * 10,
            centerY + Math.cos(playerRotation) * 10
        );
        this.minimapContext.stroke();
    }

    updateMissionInfo(missionInfo) {
        if (!missionInfo) {
            this.missionInfoElement.classList.add('hidden');
            this.currentMission = null;
            return;
        }

        this.currentMission = missionInfo.id;
        this.missionInfoElement.classList.remove('hidden');

        // Missionsdaten anzeigen
        let html = `
            <h3>${missionInfo.name}</h3>
            <p>${missionInfo.description}</p>
            <ul>
        `;

        // Ziele anzeigen
        missionInfo.objectives.forEach(objective => {
            const completed = objective.completed ? '✓' : '○';
            html += `<li>${completed} ${objective.text}</li>`;
        });

        html += '</ul>';

        this.missionInfoElement.innerHTML = html;

        // Animation für neue Mission
        this.missionInfoElement.classList.add('fade-in');
        setTimeout(() => {
            this.missionInfoElement.classList.remove('fade-in');
        }, 300);
    }

    showMessage(message, duration = 3000) {
        // Erstelle ein temporäres Nachrichtenelement
        const messageElement = document.createElement('div');
        messageElement.classList.add('game-message', 'fade-in');
        messageElement.textContent = message;

        // Füge es zum HUD hinzu
        this.hudElement.appendChild(messageElement);

        // Entferne es nach der angegebenen Zeit
        setTimeout(() => {
            messageElement.classList.remove('fade-in');
            messageElement.classList.add('fade-out');

            setTimeout(() => {
                this.hudElement.removeChild(messageElement);
            }, 300);
        }, duration);
    }
}