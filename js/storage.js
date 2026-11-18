/*
=========================================================
SCPM Studio
Build 0022
storage.js — Autosave / Autoload
=========================================================
*/

class Storage {
    constructor() {
        this.key = "scpm_autosave";
        this.interval = 30000;
        this.timer = null;
    }

    startAutoSave() {
        this.stopAutoSave();
        this.timer = setInterval(() => this.save(), this.interval);
        console.log("[Storage] Autosave started (every " + this.interval + "ms)");
    }

    stopAutoSave() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    save() {
        if (!window.scene || scene.count() === 0) return;
        const project = {
            version: "0.5.0",
            savedAt: new Date().toISOString(),
            objects: scene.getAll().map(obj => ({
                id: obj.id,
                type: obj.type,
                sprite: obj.sprite,
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                scale: obj.scale,
                rotation: obj.rotation,
                flipX: obj.flipX,
                flipY: obj.flipY,
                opacity: obj.opacity,
                locked: obj.locked,
                visible: obj.visible
            }))
        };
        try {
            localStorage.setItem(this.key, JSON.stringify(project));
            if (window.app) app.showStatus("Autosaved");
        } catch (e) {
            console.warn("[Storage] Autosave failed:", e);
        }
    }

    load() {
        try {
            const data = localStorage.getItem(this.key);
            if (!data) return null;
            return JSON.parse(data);
        } catch (e) {
            console.warn("[Storage] Load failed:", e);
            return null;
        }
    }

    clear() {
        localStorage.removeItem(this.key);
    }

    hasData() {
        return !!localStorage.getItem(this.key);
    }
}

window.storage = new Storage();