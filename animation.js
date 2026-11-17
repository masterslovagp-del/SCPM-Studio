/*
=========================================================
SCPM Studio
Build 0022
animation.js — synced clockwise rotation (one shared angle)
=========================================================
*/

class AnimationSystem {
    constructor() {
        this.enabled = true;
        this.lastTime = performance.now();
        // Degrees per second — both coins use the same shared angle
        this.speed = 20;
        this.sharedAngle = 0;
    }

    update(deltaTime) {
        if (!this.enabled) return;

        // One clock for both coins → always perfectly in sync
        this.sharedAngle = (this.sharedAngle + this.speed * deltaTime) % 360;
        if (this.sharedAngle < 0) this.sharedAngle += 360;

        const btc = scene.find("btc");
        const eth = scene.find("eth");

        let changed = false;

        if (btc) {
            btc.rotation = this.sharedAngle;
            if (window.renderer) renderer.updateObject(btc);
            changed = true;
        }

        if (eth) {
            eth.rotation = this.sharedAngle;
            if (window.renderer) renderer.updateObject(eth);
            changed = true;
        }

        if (changed && window.ui) {
            ui.refresh();
        }
    }

    setEnabled(value) {
        this.enabled = !!value;
        try {
            if (window.scpmSfx) scpmSfx.setReel(this.enabled);
        } catch (e) {}
    }

    toggle() {
        this.enabled = !this.enabled;
        console.log("[Animation]", this.enabled ? "Enabled" : "Disabled");
        try {
            if (window.scpmSfx) scpmSfx.setReel(this.enabled);
        } catch (e) {}
    }

    setSpeed(id, speed) {
        // Keep API compatibility: any setSpeed changes the shared speed
        if (typeof speed === "number") {
            this.speed = Math.abs(speed);
        }
    }

    /** Reset both coins to the same phase (0°) */
    sync() {
        this.sharedAngle = 0;
        const btc = scene.find("btc");
        const eth = scene.find("eth");
        if (btc) {
            btc.rotation = 0;
            if (window.renderer) renderer.updateObject(btc);
        }
        if (eth) {
            eth.rotation = 0;
            if (window.renderer) renderer.updateObject(eth);
        }
    }
}

window.animation = new AnimationSystem();
