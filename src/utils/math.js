import * as THREE from 'three';

// Vektor-Hilfsfunktionen
export function vectorToAngle(vector) {
    return Math.atan2(vector.x, vector.z);
}

export function angleToVector(angle) {
    return new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
}

export function distance(a, b) {
    return Math.sqrt(
        Math.pow(a.x - b.x, 2) +
        Math.pow(a.y - b.y, 2) +
        Math.pow(a.z - b.z, 2)
    );
}

export function distance2D(a, b) {
    return Math.sqrt(
        Math.pow(a.x - b.x, 2) +
        Math.pow(a.z - b.z, 2)
    );
}

// Zufälligkeitsfunktionen
export function random(min, max) {
    return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomVector3(minX, maxX, minY, maxY, minZ, maxZ) {
    return new THREE.Vector3(
        random(minX, maxX),
        random(minY, maxY),
        random(minZ, maxZ)
    );
}

export function randomPointInCircle(centerX, centerZ, radius) {
    // Generiere zufälligen Punkt im Einheitskreis
    const angle = random(0, Math.PI * 2);
    const distance = Math.sqrt(Math.random()) * radius;

    return {
        x: centerX + Math.cos(angle) * distance,
        z: centerZ + Math.sin(angle) * distance
    };
}

// Interpolation
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function lerpVector3(a, b, t) {
    return new THREE.Vector3(
        lerp(a.x, b.x, t),
        lerp(a.y, b.y, t),
        lerp(a.z, b.z, t)
    );
}

// Winkel normalisieren
export function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}

// Kürzeste Rotationsrichtung finden
export function shortestRotation(currentAngle, targetAngle) {
    const diff = normalizeAngle(targetAngle - currentAngle);
    return diff;
}

// Kollisionserkennung
export function pointInRectangle(point, rect) {
    return (
        point.x >= rect.x &&
        point.x <= rect.x + rect.width &&
        point.z >= rect.z &&
        point.z <= rect.z + rect.depth
    );
}

export function rectanglesIntersect(rectA, rectB) {
    return !(
        rectA.x + rectA.width < rectB.x ||
        rectB.x + rectB.width < rectA.x ||
        rectA.z + rectA.depth < rectB.z ||
        rectB.z + rectB.depth < rectA.z
    );
}

export function spheresIntersect(sphereA, sphereB) {
    const distance = Math.sqrt(
        Math.pow(sphereA.x - sphereB.x, 2) +
        Math.pow(sphereA.y - sphereB.y, 2) +
        Math.pow(sphereA.z - sphereB.z, 2)
    );

    return distance < (sphereA.radius + sphereB.radius);
}

// Pfadsuche und Navigation
export function smoothStep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
}

// 3D Geometrie-Hilfsfunktionen
export function createBoundingBox(object) {
    const boundingBox = new THREE.Box3().setFromObject(object);
    return boundingBox;
}

export function isPointInBox(point, box) {
    return (
        point.x >= box.min.x && point.x <= box.max.x &&
        point.y >= box.min.y && point.y <= box.max.y &&
        point.z >= box.min.z && point.z <= box.max.z
    );
}

// Raycasting-Hilfsfunktionen
export function createRay(origin, direction, length = 100) {
    return new THREE.Raycaster(origin, direction, 0, length);
}

export function raycastFromScreenCoords(x, y, camera, objects) {
    const mouse = new THREE.Vector2();
    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    return raycaster.intersectObjects(objects, true);
}