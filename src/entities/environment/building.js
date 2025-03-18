import * as THREE from 'three';
import {Entity} from '../entity.js';

export class Building extends Entity {
    constructor(x, z, width, depth, height) {
        super();

        this.width = width;
        this.depth = depth;
        this.height = height;

        // Create building mesh
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({
            color: Math.random() * 0x808080 + 0x808080,
            roughness: 0.7
        });
        this.mesh = new THREE.Mesh(geometry, material);

        // Set position
        this.setPosition(x, height / 2, z);
    }

    getBoundingBox() {
        return new THREE.Box3().setFromObject(this.mesh);
    }
}