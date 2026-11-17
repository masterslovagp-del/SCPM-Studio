/*
SCPM Studio
Build 0023
ui.js — Interactive Properties
*/
class UI {
    constructor() {
        this.selectedObject = null;
        this.propX = null;
        this.propY = null;
        this.propScale = null;
        this.propRotation = null;
        this.propOpacity = null;
    }

    init() {
        this.selectedObject = document.getElementById("selectedObject");
        this.propX = document.getElementById("propX");
        this.propY = document.getElementById("propY");
        this.propScale = document.getElementById("propScale");
        this.propRotation = document.getElementById("propRotation");
        this.propOpacity = document.getElementById("propOpacity");
        this.bindToolbar();
        this.bindProperties();
        this.refresh();
        console.log("[UI] Ready");
    }

    bindToolbar() {
        const btnSave = document.getElementById("btnSave");
        if (btnSave) {
            btnSave.addEventListener("click", () => projectManager.save());
        }
        const btnLoad = document.getElementById("btnLoad");
        if (btnLoad) {
            btnLoad.addEventListener("click", () => projectManager.triggerLoad());
        }
        const btnAnim = document.getElementById("btnAnimToggle");
        if (btnAnim && window.animation) {
            btnAnim.addEventListener("click", () => {
                animation.toggle();
                btnAnim.textContent = animation.enabled ? "⏸️ Pause" : "▶️ Play";
                btnAnim.classList.toggle("active", animation.enabled);
                try {
                    if (window.scpmSfx) scpmSfx.setReel(animation.enabled);
                } catch (e) {}
            });
            btnAnim.textContent = animation.enabled ? "⏸️ Pause" : "▶️ Play";
            btnAnim.classList.toggle("active", animation.enabled);
        }
        document.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.key === "s") {
                e.preventDefault();
                projectManager.save();
            }
            if (e.ctrlKey && e.key === "z") {
                e.preventDefault();
                if (window.undoRedo) undoRedo.undo();
            }
            if (e.ctrlKey && e.key === "y") {
                e.preventDefault();
                if (window.undoRedo) undoRedo.redo();
            }
        });
    }

    bindProperties() {
        const inputs = [
            { el: this.propX, key: 'x', isNumber: true },
            { el: this.propY, key: 'y', isNumber: true },
            { el: this.propScale, key: 'scale', isNumber: true, factor: 0.01, suffix: '%' },
            { el: this.propRotation, key: 'rotation', isNumber: true, suffix: '°' },
            { el: this.propOpacity, key: 'opacity', isNumber: true, factor: 0.01, suffix: '%' }
        ];
        inputs.forEach(({ el, key, isNumber, factor }) => {
            if (!el) return;
            el.addEventListener('change', (e) => {
                const obj = scene.getSelected();
                if (!obj) return;
                let value = e.target.value;
                if (isNumber) {
                    value = parseFloat(value);
                    if (isNaN(value)) return;
                }
                if (factor) {
                    value = value * factor;
                }
                if (key === 'rotation') {
                    value = value % 360;
                }
                if (key === 'scale') {
                    value = Math.max(0.25, Math.min(4.0, value));
                }
                if (key === 'opacity') {
                    value = Math.max(0, Math.min(1, value));
                }
                const oldValue = obj[key];
                obj[key] = value;
                if (window.undoRedo) {
                    undoRedo.push(new PropertyChangeCommand(obj, key, oldValue, value));
                }
                renderer.updateObject(obj);
                this.refresh();
            });
        });
    }

    refresh() {
        if (!scene) return;
        const object = scene.getSelected();
        if (!object) {
            this.selectedObject.textContent = "None";
            this.setInputValue(this.propX, "", true);
            this.setInputValue(this.propY, "", true);
            this.setInputValue(this.propScale, "", true);
            this.setInputValue(this.propRotation, "", true);
            this.setInputValue(this.propOpacity, "", true);
            return;
        }
        this.selectedObject.textContent = object.id.toUpperCase();
        this.setInputValue(this.propX, Math.round(object.x), false);
        this.setInputValue(this.propY, Math.round(object.y), false);
        this.setInputValue(this.propScale, Math.round(object.scale * 100), false);
        this.setInputValue(this.propRotation, Math.round(object.rotation || 0), false);
        this.setInputValue(this.propOpacity, Math.round((object.opacity ?? 1) * 100), false);
    }

    setInputValue(input, value, disabled) {
        if (!input) return;
        input.value = value;
        input.disabled = disabled;
    }
}
window.ui = new UI();