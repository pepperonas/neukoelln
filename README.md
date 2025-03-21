# GTA-Neukölln

Ein GTA-Clonπ entwickelt mit Three.js und modernem JavaScript.

## Installation

```bash
npm install
```

## Starten der Entwicklungsumgebung

```bash
npm start
```

## Build für Produktion

```bash
npm run build
```

## Projektstruktur

- `assets/`: Spielassets (Modelle, Texturen, Sounds)
- `src/`: Quellcode
    - `config/`: Spielkonfigurationen
    - `core/`: Kernsysteme
    - `entities/`: Spielobjekte
    - `managers/`: Manager-Klassen
    - `ui/`: Benutzeroberfläche
    - `utils/`: Hilfsfunktionen
- `styles/`: CSS-Dateien
- `dist/`: Kompilierte Dateien (nach Build)

## Features

- 3D-Umgebung mit einer Stadt
- Fahrzeuge mit realistischer Physik
- Waffen- und Kampfsystem
- Missionen und Quests
- Gegner mit KI

## Spiel starten

```sh
sudo systemctl restart nginx
```

```sh
ca /var/www/html/gta 
npm start -- --host 0.0.0.0 --port 8001
```

### Multiplayer Server starten

```sh
cd /var/www/gta-multiplayer-server/
node server.js
```