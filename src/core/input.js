export class InputManager {
    constructor() {
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            KeyW: false,
            KeyA: false,
            KeyS: false,
            KeyD: false,
            Space: false,
            KeyE: false,  // Hinzugefügt für Ein-/Aussteigen
            ShiftLeft: false  // Hinzugefügt für Sprinten
        };

        // Einmaltasten-Status, um wiederholtes Auslösen zu verhindern
        this.oneTimeKeys = {
            KeyE: false,
            Space: false
        };

        // Bind event handlers
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);

        // Register event listeners
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    handleKeyDown(e) {
        if (this.keys.hasOwnProperty(e.code)) {
            this.keys[e.code] = true;
        }
    }

    handleKeyUp(e) {
        if (this.keys.hasOwnProperty(e.code)) {
            this.keys[e.code] = false;

            // Zurücksetzen der Einmaltasten
            if (this.oneTimeKeys.hasOwnProperty(e.code)) {
                this.oneTimeKeys[e.code] = false;
            }
        }
    }

    isPressed(key) {
        return this.keys[key] === true;
    }

    // Für Tasten, die nur einmal pro Druck ausgelöst werden sollen
    isPressedOnce(key) {
        if (this.keys[key] && !this.oneTimeKeys[key]) {
            this.oneTimeKeys[key] = true;
            return true;
        }
        return false;
    }

    destroy() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
    }
}