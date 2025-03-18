import * as THREE from 'three';

// Hilfsklasse für Kollisionserkennung
export class CollisionHelper {
    // Prüft, ob zwei Objekte (mit .mesh Eigenschaft) kollidieren
    static checkCollision(objectA, objectB) {
        if (!objectA || !objectA.mesh || !objectB || !objectB.mesh) {
            return false;
        }
        
        const boxA = new THREE.Box3().setFromObject(objectA.mesh);
        const boxB = new THREE.Box3().setFromObject(objectB.mesh);
        
        return boxA.intersectsBox(boxB);
    }
    
    // Prüft, ob ein Objekt mit einer Liste von Objekten kollidiert
    static checkCollisionWithList(object, objectList) {
        if (!object || !object.mesh) {
            return null;
        }
        
        const box = new THREE.Box3().setFromObject(object.mesh);
        
        for (const other of objectList) {
            if (!other || !other.mesh) continue;
            
            const otherBox = new THREE.Box3().setFromObject(other.mesh);
            
            if (box.intersectsBox(otherBox)) {
                return other;
            }
        }
        
        return null;
    }
    
    // Prüft, ob ein Punkt innerhalb eines Objekts liegt
    static isPointInObject(point, object) {
        if (!object || !object.mesh) {
            return false;
        }
        
        const box = new THREE.Box3().setFromObject(object.mesh);
        return box.containsPoint(point);
    }
    
    // Versucht, ein Objekt aus einer Kollision "herauszuschieben"
    static resolveCollision(movingObject, staticObject, previousPosition = null) {
        if (!movingObject || !movingObject.mesh || !staticObject || !staticObject.mesh) {
            return false;
        }
        
        // Wenn eine vorherige Position gegeben ist, stelle sie wieder her
        if (previousPosition) {
            movingObject.position.copy(previousPosition);
            
            if (movingObject.mesh) {
                movingObject.mesh.position.copy(previousPosition);
            }
            
            return true;
        }
        
        // Berechne Kollisionsvektor
        const movingBox = new THREE.Box3().setFromObject(movingObject.mesh);
        const staticBox = new THREE.Box3().setFromObject(staticObject.mesh);
        
        // Berechne Richtung und Tiefe der Kollision
        const movingCenter = new THREE.Vector3();
        const staticCenter = new THREE.Vector3();
        
        movingBox.getCenter(movingCenter);
        staticBox.getCenter(staticCenter);
        
        // Vektor vom statischen zum beweglichen Objekt
        const direction = new THREE.Vector3().subVectors(movingCenter, staticCenter).normalize();
        
        // Schiebe das bewegliche Objekt in diese Richtung
        const pushDistance = 0.1; // Kleine Distanz zum Herausschieben
        
        movingObject.position.x += direction.x * pushDistance;
        movingObject.position.z += direction.z * pushDistance;
        
        if (movingObject.mesh) {
            movingObject.mesh.position.copy(movingObject.position);
        }
        
        return true;
    }
}
