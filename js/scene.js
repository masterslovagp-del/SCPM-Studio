/*
=========================================================
SCPM Studio
Build 0007
scene.js
=========================================================
*/

class SceneObject {
    constructor(options = {}) {
        this.id = options.id || "";
        this.type = options.type || "object";
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.width = options.width || 0;
        this.height = options.height || 0;
        this.scale = options.scale || 1;
        this.rotation = options.rotation || 0;
        this.sprite = options.sprite || "";
        this.flipX = options.flipX || false;
        this.flipY = options.flipY || false;
        this.opacity = options.opacity ?? 1;
        this.locked = options.locked || false;
        this.visible = options.visible ?? true;
        this.selected = false;
    }
}

class Scene {
    constructor() {
        this.objects = [];
        this.selected = null;
    }

    add(object) {
        this.objects.push(object);
        console.log("[Scene] Added:", object.id);
        this.refresh();
        return object;
    }

    remove(id) {
        this.objects = this.objects.filter(obj => obj.id !== id);
        if (this.selected && this.selected.id === id) {
            this.selected = null;
        }
        this.refresh();
    }

    find(id) {
        return this.objects.find(obj => obj.id === id);
    }

    select(id) {
        this.clearSelection();
        const obj = this.find(id);
        if (!obj) return null;
        obj.selected = true;
        this.selected = obj;
        this.refresh();
        return obj;
    }

    deselect() {
        this.clearSelection();
        this.refresh();
    }

    toggleSelection(id) {
        if (this.selected && this.selected.id === id) {
            this.deselect();
            return null;
        }
        return this.select(id);
    }

    clearSelection() {
        this.objects.forEach(obj => {
            obj.selected = false;
        });
        this.selected = null;
    }

    getSelected() {
        return this.selected;
    }

    getAll() {
        return this.objects;
    }

    count() {
        return this.objects.length;
    }

    refresh() {
        if (window.renderer) {
            renderer.render();
        }
        if (window.ui) {
            ui.refresh();
        }
    }
}

window.scene = new Scene();