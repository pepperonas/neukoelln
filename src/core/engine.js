import * as THREE from 'three';

export class Engine {
    constructor() {
        // Basic setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Lighting
        this.setupLighting();

        // Bind methods
        this.animate = this.animate.bind(this);
        this.handleResize = this.handleResize.bind(this);

        // Handle window resize
        window.addEventListener('resize', this.handleResize);

        // Animation frame variables
        this.previousTime = 0;
        this.isRunning = false;
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
    }

    start() {
        this.isRunning = true;
        this.previousTime = performance.now();
        this.animate();
    }

    stop() {
        this.isRunning = false;
    }

    animate(currentTime = performance.now()) {
        if (!this.isRunning) return;

        requestAnimationFrame(this.animate);

        // Calculate delta time
        const deltaTime = (currentTime - this.previousTime) / 1000;
        this.previousTime = currentTime;

        // Update game objects (will be overridden by GameManager)
        if (this.update) {
            this.update(deltaTime);
        }

        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }
}