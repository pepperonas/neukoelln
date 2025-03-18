// Level-Definitionen für das Spiel
export const LEVELS = [
    {
        id: 'downtown',
        name: 'Innenstadt',
        description: 'Dichte Stadtumgebung mit hohen Gebäuden und engen Straßen.',
        unlocked: true,
        config: {
            buildingDensity: 20,
            buildingHeightRange: [5, 20],
            buildingWidthRange: [3, 8],
            roadWidth: 5,
            civilians: 15,
            enemies: 10,
            items: {
                weapons: 3,
                health: 5,
                money: 8
            },
            vehicles: {
                cars: 5,
                motorcycles: 2,
                tanks: 0
            },
            ambientLight: 0x404040,
            directionalLight: {
                color: 0xffffff,
                intensity: 0.8,
                position: [1, 1, 1]
            },
            skyColor: 0x87CEEB,
            fogEnabled: true,
            fogColor: 0xcccccc,
            fogDensity: 0.01
        },
        missions: [
            {
                id: 'downtown_mission_1',
                name: 'Erste Schritte',
                description: 'Erkunde die Stadt und finde das versteckte Paket.',
                objectives: [
                    {
                        type: 'collect',
                        target: 'package',
                        position: [10, 0, 15],
                        completed: false
                    }
                ],
                reward: {
                    money: 500,
                    items: ['pistol']
                }
            },
            {
                id: 'downtown_mission_2',
                name: 'Feindliche Übernahme',
                description: 'Eliminiere die feindliche Gang in der Nähe des Hafens.',
                objectives: [
                    {
                        type: 'kill',
                        target: 'enemy',
                        count: 5,
                        completed: false
                    }
                ],
                reward: {
                    money: 1000,
                    items: ['machinegun', 'health']
                }
            }
        ]
    },
    {
        id: 'industrial',
        name: 'Industriegebiet',
        description: 'Lagergebäude und Fabriken mit offenen Bereichen.',
        unlocked: false,
        unlockRequirement: {
            level: 'downtown',
            missions: ['downtown_mission_1', 'downtown_mission_2']
        },
        config: {
            buildingDensity: 15,
            buildingHeightRange: [3, 12],
            buildingWidthRange: [5, 12],
            roadWidth: 6,
            civilians: 8,
            enemies: 15,
            items: {
                weapons: 5,
                health: 4,
                money: 10
            },
            vehicles: {
                cars: 3,
                motorcycles: 1,
                tanks: 1
            },
            ambientLight: 0x404040,
            directionalLight: {
                color: 0xffffff,
                intensity: 0.7,
                position: [1, 1, 1]
            },
            skyColor: 0x888888,
            fogEnabled: true,
            fogColor: 0x888888,
            fogDensity: 0.015
        },
        missions: [
            {
                id: 'industrial_mission_1',
                name: 'Materiallieferung',
                description: 'Sammle die markierten Materialien und bringe sie zum Hauptquartier.',
                objectives: [
                    {
                        type: 'collect',
                        target: 'material',
                        count: 3,
                        positions: [
                            [-15, 0, 20],
                            [25, 0, -10],
                            [5, 0, -25]
                        ],
                        completed: false
                    },
                    {
                        type: 'goto',
                        target: 'headquarters',
                        position: [0, 0, 0],
                        completed: false
                    }
                ],
                reward: {
                    money: 1500,
                    items: ['shotgun']
                }
            }
        ]
    },
    {
        id: 'suburbs',
        name: 'Vorstadt',
        description: 'Ruhige Wohngegend mit Häusern und Parks.',
        unlocked: false,
        unlockRequirement: {
            level: 'industrial',
            missions: ['industrial_mission_1']
        },
        config: {
            buildingDensity: 10,
            buildingHeightRange: [2, 5],
            buildingWidthRange: [4, 7],
            roadWidth: 4,
            civilians: 20,
            enemies: 5,
            items: {
                weapons: 2,
                health: 8,
                money: 15
            },
            vehicles: {
                cars: 8,
                motorcycles: 3,
                tanks: 0
            },
            ambientLight: 0x606060,
            directionalLight: {
                color: 0xffffcc,
                intensity: 0.9,
                position: [1, 1, 1]
            },
            skyColor: 0x87CEEB,
            fogEnabled: false
        },
        missions: [
            {
                id: 'suburbs_mission_1',
                name: 'Hauseinbruch',
                description: 'Breche in das markierte Haus ein und finde den Tresor.',
                objectives: [
                    {
                        type: 'goto',
                        target: 'house',
                        position: [30, 0, 30],
                        completed: false
                    },
                    {
                        type: 'collect',
                        target: 'safe',
                        position: [32, 0, 32],
                        completed: false
                    }
                ],
                reward: {
                    money: 3000,
                    items: ['sniper', 'armor']
                }
            }
        ]
    }
];

// Hilfsfunktionen für Level-Management
export function getLevelById(id) {
    return LEVELS.find(level => level.id === id);
}

export function getUnlockedLevels() {
    return LEVELS.filter(level => level.unlocked);
}

export function checkLevelUnlockRequirements(levelId, completedMissions) {
    const level = getLevelById(levelId);

    if (!level || level.unlocked) return true;

    if (!level.unlockRequirement) return false;

    const requiredLevel = level.unlockRequirement.level;
    const requiredMissions = level.unlockRequirement.missions || [];

    // Prüfe, ob alle erforderlichen Missionen abgeschlossen sind
    return requiredMissions.every(missionId => completedMissions.includes(missionId));
}

export function unlockLevel(levelId) {
    const level = getLevelById(levelId);
    if (level) {
        level.unlocked = true;
        return true;
    }
    return false;
}

export function getMissionsByLevelId(levelId) {
    const level = getLevelById(levelId);
    return level ? level.missions : [];
}

export function getMissionById(levelId, missionId) {
    const level = getLevelById(levelId);
    if (!level) return null;

    return level.missions.find(mission => mission.id === missionId);
}