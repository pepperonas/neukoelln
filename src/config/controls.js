// Default control mappings
export const DEFAULT_CONTROLS = {
    // Vehicle controls
    ACCELERATE: ['KeyW', 'ArrowUp'],
    BRAKE_REVERSE: ['KeyS', 'ArrowDown'],
    TURN_LEFT: ['KeyA', 'ArrowLeft'],
    TURN_RIGHT: ['KeyD', 'ArrowRight'],
    HANDBRAKE: ['Space'],
    HORN: ['KeyH'],

    // Character controls
    MOVE_FORWARD: ['KeyW', 'ArrowUp'],
    MOVE_BACKWARD: ['KeyS', 'ArrowDown'],
    MOVE_LEFT: ['KeyA', 'ArrowLeft'],
    MOVE_RIGHT: ['KeyD', 'ArrowRight'],
    SPRINT: ['ShiftLeft'],
    JUMP: ['Space'],
    CROUCH: ['ControlLeft'],

    // Combat controls
    FIRE: ['MouseLeft'],
    AIM: ['MouseRight'],
    RELOAD: ['KeyR'],
    NEXT_WEAPON: ['KeyQ'],
    PREVIOUS_WEAPON: ['KeyE'],

    // Interaction controls
    INTERACT: ['KeyF'],
    ENTER_EXIT_VEHICLE: ['KeyF'],

    // UI controls
    PAUSE: ['Escape'],
    MAP: ['KeyM'],
    INVENTORY: ['KeyI'],
    MISSION_LOG: ['KeyL'],

    // Camera controls
    CAMERA_CHANGE: ['KeyC'],
    LOOK_BEHIND: ['KeyB']
};

// Gamepad control mappings
export const GAMEPAD_CONTROLS = {
    // Vehicle controls
    ACCELERATE: ['RightTrigger'],
    BRAKE_REVERSE: ['LeftTrigger'],
    TURN_LEFT: ['LeftStickLeft'],
    TURN_RIGHT: ['LeftStickRight'],
    HANDBRAKE: ['ButtonA'],
    HORN: ['ButtonB'],

    // Character controls
    MOVE_FORWARD: ['LeftStickUp'],
    MOVE_BACKWARD: ['LeftStickDown'],
    MOVE_LEFT: ['LeftStickLeft'],
    MOVE_RIGHT: ['LeftStickRight'],
    SPRINT: ['ButtonA'],
    JUMP: ['ButtonA'],
    CROUCH: ['ButtonB'],

    // Combat controls
    FIRE: ['RightTrigger'],
    AIM: ['LeftTrigger'],
    RELOAD: ['ButtonX'],
    NEXT_WEAPON: ['ButtonRight'],
    PREVIOUS_WEAPON: ['ButtonLeft'],

    // Interaction controls
    INTERACT: ['ButtonY'],
    ENTER_EXIT_VEHICLE: ['ButtonY'],

    // UI controls
    PAUSE: ['ButtonStart'],
    MAP: ['ButtonBack'],
    INVENTORY: ['ButtonUp'],
    MISSION_LOG: ['ButtonDown'],

    // Camera controls
    CAMERA_CHANGE: ['RightStickButton'],
    LOOK_BEHIND: ['LeftStickButton']
};

// Control helper functions
export const isControlPressed = (key, inputManager) => {
    const keys = DEFAULT_CONTROLS[key];
    return keys.some(keyCode => inputManager.isPressed(keyCode));
};

export const isGamepadControlPressed = (key, gamepadManager) => {
    const buttons = GAMEPAD_CONTROLS[key];
    return buttons.some(buttonCode => gamepadManager.isPressed(buttonCode));
};

// Control configuration functions
export const saveControlConfig = (controls) => {
    localStorage.setItem('gameControls', JSON.stringify(controls));
};

export const loadControlConfig = () => {
    const savedControls = localStorage.getItem('gameControls');
    return savedControls ? JSON.parse(savedControls) : DEFAULT_CONTROLS;
};

export const resetControlConfig = () => {
    localStorage.removeItem('gameControls');
    return DEFAULT_CONTROLS;
};