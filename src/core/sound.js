import { Howl, Howler } from 'howler';

export class SoundManager {
    constructor() {
        this.sounds = {};
        this.music = null;
        this.musicVolume = 0.5;
        this.sfxVolume = 0.8;
        this.isMuted = false;
    }

    load(id, url, options = {}) {
        this.sounds[id] = new Howl({
            src: [url],
            volume: options.volume || this.sfxVolume,
            loop: options.loop || false,
            autoplay: options.autoplay || false,
            onload: options.onload || null,
            onend: options.onend || null,
            onloaderror: error => {
                console.error(`Error loading sound ${id}:`, error);
                if (options.onloaderror) options.onloaderror(error);
            }
        });

        return this.sounds[id];
    }

    play(id, options = {}) {
        if (!this.sounds[id]) {
            console.warn(`Sound with id "${id}" not found`);
            return null;
        }

        if (this.isMuted) return null;

        // Clone options with defaults
        const playOptions = {
            volume: options.volume || this.sfxVolume,
            loop: options.loop || false
        };

        // Set volume and loop
        this.sounds[id].volume(playOptions.volume);
        this.sounds[id].loop(playOptions.loop);

        // Play the sound
        return this.sounds[id].play();
    }

    stop(id) {
        if (!this.sounds[id]) {
            console.warn(`Sound with id "${id}" not found`);
            return;
        }

        this.sounds[id].stop();
    }

    pause(id) {
        if (!this.sounds[id]) {
            console.warn(`Sound with id "${id}" not found`);
            return;
        }

        this.sounds[id].pause();
    }

    loadMusic(url, autoplay = false) {
        this.music = new Howl({
            src: [url],
            volume: this.musicVolume,
            loop: true,
            autoplay: autoplay
        });

        return this.music;
    }

    playMusic() {
        if (this.music && !this.isMuted) {
            this.music.play();
        }
    }

    pauseMusic() {
        if (this.music) {
            this.music.pause();
        }
    }

    stopMusic() {
        if (this.music) {
            this.music.stop();
        }
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.music) {
            this.music.volume(this.musicVolume);
        }
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));

        // Update volume for all sounds
        Object.values(this.sounds).forEach(sound => {
            if (!sound._isMusic) {
                sound.volume(this.sfxVolume);
            }
        });
    }

    mute() {
        this.isMuted = true;
        Howler.volume(0);
    }

    unmute() {
        this.isMuted = false;
        Howler.volume(1);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        Howler.volume(this.isMuted ? 0 : 1);
        return this.isMuted;
    }
}