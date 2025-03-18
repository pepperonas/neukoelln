import * as THREE from 'three';

// Objekt-Hilfsfunktionen
export function createObject(geometry, material, options = {}) {
    const mesh = new THREE.Mesh(geometry, material);

    if (options.position) {
        mesh.position.copy(options.position);
    }

    if (options.rotation) {
        mesh.rotation.copy(options.rotation);
    }

    if (options.scale) {
        if (typeof options.scale === 'number') {
            mesh.scale.set(options.scale, options.scale, options.scale);
        } else {
            mesh.scale.copy(options.scale);
        }
    }

    if (options.castShadow !== undefined) {
        mesh.castShadow = options.castShadow;
    }

    if (options.receiveShadow !== undefined) {
        mesh.receiveShadow = options.receiveShadow;
    }

    return mesh;
}

// Licht-Hilfsfunktionen
export function createDirectionalLight(color = 0xffffff, intensity = 1, position = [1, 1, 1], options = {}) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...position);

    if (options.target) {
        light.target = options.target;
    }

    if (options.castShadow) {
        light.castShadow = true;

        // Schatten-Konfiguration
        if (options.shadowSize) {
            light.shadow.mapSize.width = options.shadowSize;
            light.shadow.mapSize.height = options.shadowSize;
        }

        if (options.shadowCamera) {
            const { near, far, left, right, top, bottom } = options.shadowCamera;
            light.shadow.camera.near = near || 0.5;
            light.shadow.camera.far = far || 500;
            light.shadow.camera.left = left || -10;
            light.shadow.camera.right = right || 10;
            light.shadow.camera.top = top || 10;
            light.shadow.camera.bottom = bottom || -10;
        }
    }

    return light;
}

export function createAmbientLight(color = 0x404040, intensity = 1) {
    return new THREE.AmbientLight(color, intensity);
}

export function createPointLight(color = 0xffffff, intensity = 1, distance = 0, position = [0, 0, 0], options = {}) {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.set(...position);

    if (options.castShadow) {
        light.castShadow = true;

        if (options.shadowSize) {
            light.shadow.mapSize.width = options.shadowSize;
            light.shadow.mapSize.height = options.shadowSize;
        }
    }

    return light;
}

export function createSpotLight(color = 0xffffff, intensity = 1, distance = 0, angle = Math.PI / 3, position = [0, 0, 0], options = {}) {
    const light = new THREE.SpotLight(color, intensity, distance, angle, options.penumbra || 0);
    light.position.set(...position);

    if (options.target) {
        light.target = options.target;
    }

    if (options.castShadow) {
        light.castShadow = true;

        if (options.shadowSize) {
            light.shadow.mapSize.width = options.shadowSize;
            light.shadow.mapSize.height = options.shadowSize;
        }
    }

    return light;
}

// Material-Hilfsfunktionen
export function createStandardMaterial(options = {}) {
    const material = new THREE.MeshStandardMaterial({
        color: options.color || 0xffffff,
        roughness: options.roughness !== undefined ? options.roughness : 0.7,
        metalness: options.metalness !== undefined ? options.metalness : 0.2,
        transparent: options.transparent || false,
        opacity: options.opacity !== undefined ? options.opacity : 1,
        side: options.side || THREE.FrontSide
    });

    if (options.map) {
        material.map = options.map;
    }

    if (options.normalMap) {
        material.normalMap = options.normalMap;
    }

    if (options.roughnessMap) {
        material.roughnessMap = options.roughnessMap;
    }

    if (options.metalnessMap) {
        material.metalnessMap = options.metalnessMap;
    }

    if (options.emissive) {
        material.emissive.set(options.emissive);
    }

    if (options.emissiveIntensity !== undefined) {
        material.emissiveIntensity = options.emissiveIntensity;
    }

    if (options.emissiveMap) {
        material.emissiveMap = options.emissiveMap;
    }

    return material;
}

export function createBasicMaterial(options = {}) {
    const material = new THREE.MeshBasicMaterial({
        color: options.color || 0xffffff,
        transparent: options.transparent || false,
        opacity: options.opacity !== undefined ? options.opacity : 1,
        wireframe: options.wireframe || false,
        side: options.side || THREE.FrontSide
    });

    if (options.map) {
        material.map = options.map;
    }

    return material;
}

// UI und DOM Hilfsfunktionen
export function createElement(tag, className, parent = null) {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }

    if (parent) {
        parent.appendChild(element);
    }

    return element;
}

export function removeElement(element) {
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

export function showElement(element) {
    if (element) {
        element.classList.remove('hidden');
    }
}

export function hideElement(element) {
    if (element) {
        element.classList.add('hidden');
    }
}

// Zeit und Animationshelfer
export function tween(object, targetProps, duration = 1000, options = {}) {
    const startProps = {};
    const propDiff = {};

    // Startposition und Differenz für jede Eigenschaft speichern
    for (const prop in targetProps) {
        if (object[prop] !== undefined) {
            startProps[prop] = object[prop];
            propDiff[prop] = targetProps[prop] - startProps[prop];
        }
    }

    // Easing-Funktionen
    const easingFunctions = {
        linear: t => t,
        easeInQuad: t => t * t,
        easeOutQuad: t => t * (2 - t),
        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: t => t * t * t,
        easeOutCubic: t => (--t) * t * t + 1,
        easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
    };

    const easing = options.easing ? easingFunctions[options.easing] : easingFunctions.linear;

    // Startzeit
    const startTime = performance.now();

    // Animation starten
    function animate(currentTime) {
        // Zeit seit Beginn
        const elapsed = currentTime - startTime;

        // Fortschritt berechnen (0 bis 1)
        let progress = Math.min(elapsed / duration, 1);

        // Easing anwenden
        progress = easing(progress);

        // Eigenschaften aktualisieren
        for (const prop in targetProps) {
            if (object[prop] !== undefined) {
                object[prop] = startProps[prop] + propDiff[prop] * progress;
            }
        }

        // Callback für jeden Frame
        if (options.onUpdate) {
            options.onUpdate(progress);
        }

        // Animation fortsetzen oder beenden
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            if (options.onComplete) {
                options.onComplete();
            }
        }
    }

    // Animation starten
    requestAnimationFrame(animate);
}

// Formatierungs-Hilfsfunktionen
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatNumber(number, decimalPlaces = 0) {
    return Number(number).toFixed(decimalPlaces);
}

export function formatMoney(amount) {
    return `$${amount.toLocaleString()}`;
}

// Debug-Hilfsfunktionen
export function createDebugAxis(scene, size = 10) {
    // X-Achse (rot)
    const xAxis = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(size, 0, 0)
        ]),
        new THREE.LineBasicMaterial({ color: 0xff0000 })
    );

    // Y-Achse (grün)
    const yAxis = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, size, 0)
        ]),
        new THREE.LineBasicMaterial({ color: 0x00ff00 })
    );

    // Z-Achse (blau)
    const zAxis = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, size)
        ]),
        new THREE.LineBasicMaterial({ color: 0x0000ff })
    );

    scene.add(xAxis);
    scene.add(yAxis);
    scene.add(zAxis);

    return { xAxis, yAxis, zAxis };
}