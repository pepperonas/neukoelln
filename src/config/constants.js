// Game settings
export const GAME_SETTINGS = {
    TITLE: 'GTA-Style Game',
    VERSION: '1.0.0',
    DEBUG: true
};

// Physics constants
export const PHYSICS = {
    GRAVITY: -9.8,
    FRICTION: 0.1,
    MAX_VELOCITY: 30
};

// Camera settings
export const CAMERA = {
    FOV: 75,
    NEAR: 0.1,
    FAR: 1000,
    DEFAULT_POSITION: [0, 15, 5],
    DEFAULT_TARGET: [0, 0, 0]
};

// Vehicle settings
export const VEHICLES = {
    CAR: {
        MAX_SPEED: 0.25,
        ACCELERATION: 0.01,
        DECELERATION: 0.005,
        BRAKING: 0.03,
        TURN_SPEED: 0.04
    },
    MOTORCYCLE: {
        MAX_SPEED: 0.35,
        ACCELERATION: 0.015,
        DECELERATION: 0.004,
        BRAKING: 0.04,
        TURN_SPEED: 0.05
    },
    TANK: {
        MAX_SPEED: 0.15,
        ACCELERATION: 0.005,
        DECELERATION: 0.003,
        BRAKING: 0.02,
        TURN_SPEED: 0.02
    }
};

// Weapons settings
export const WEAPONS = {
    PISTOL: {
        DAMAGE: 10,
        FIRE_RATE: 0.5, // shots per second
        RANGE: 20,
        AMMO_CAPACITY: 12,
        RELOAD_TIME: 1 // seconds
    },
    MACHINE_GUN: {
        DAMAGE: 5,
        FIRE_RATE: 10, // shots per second
        RANGE: 25,
        AMMO_CAPACITY: 30,
        RELOAD_TIME: 2 // seconds
    },
    SHOTGUN: {
        DAMAGE: 25,
        FIRE_RATE: 0.8, // shots per second
        RANGE: 10,
        AMMO_CAPACITY: 8,
        RELOAD_TIME: 2.5 // seconds
    }
};

// Enemy settings
export const ENEMIES = {
    GANGSTER: {
        HEALTH: 100,
        SPEED: 0.08,
        DAMAGE: 10,
        DETECTION_RANGE: 15,
        ATTACK_RANGE: 10
    },
    POLICE: {
        HEALTH: 120,
        SPEED: 0.1,
        DAMAGE: 15,
        DETECTION_RANGE: 20,
        ATTACK_RANGE: 12
    }
};

// Player settings
export const PLAYER = {
    INITIAL_HEALTH: 100,
    MAX_HEALTH: 100,
    INITIAL_ARMOR: 0,
    MAX_ARMOR: 100
};

// World settings
export const WORLD = {
    SIZE: 100,
    BUILDING_DENSITY: 15,
    MIN_BUILDING_SIZE: [3, 5, 3],
    MAX_BUILDING_SIZE: [8, 15, 8],
    ROAD_WIDTH: 5
};

// UI settings
export const UI = {
    HUD_OPACITY: 0.8,
    MINIMAP_SIZE: 150
};

// Audio settings
export const AUDIO = {
    MUSIC_VOLUME: 0.5,
    SFX_VOLUME: 0.8
};

// Game levels
export const LEVELS = [
    {
        id: 'downtown',
        name: 'Downtown',
        description: 'The busy downtown area with tall buildings',
        building_density: 20,
        traffic_density: 10,
        enemy_density: 5
    },
    {
        id: 'suburbs',
        name: 'Suburbs',
        description: 'Quiet suburban area with houses',
        building_density: 10,
        traffic_density: 5,
        enemy_density: 3
    },
    {
        id: 'industrial',
        name: 'Industrial Zone',
        description: 'Industrial area with warehouses and factories',
        building_density: 15,
        traffic_density: 7,
        enemy_density: 8
    }
];

// Item types
export const ITEM_TYPES = {
    HEALTH: 'health',
    ARMOR: 'armor',
    AMMO: 'ammo',
    WEAPON: 'weapon',
    MONEY: 'money'
};

// Debug constants
export const DEBUG = {
    SHOW_FPS: true,
    SHOW_COLLISION_BOXES: false,
    INVINCIBLE: false
};