/*
SCPM Studio
Build 0023
input.js — Drag, Scale (wheel + handles), Rotate, Touch, Shop Test Mode, Undo
*/
class Input {
    constructor() {
        this.layer = null;
        this.dragging = false;
        this.dragObject = null;
        this.dragDX = 0;
        this.dragDY = 0;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.minScale = 0.25;
        this.maxScale = 4.00;
        this.scaleStep = 0.05;

        // Resize via handles
        this.resizing = false;
        this.resizeObject = null;
        this.startScale = 1;
        this.startDist = 0;
    }

    init() {
        this.layer = document.getElementById("objectLayer");
        if (!this.layer) {
            console.error("[Input] objectLayer not found.");
            return;
        }
        this.bindEvents();
        console.log("[Input] Ready");
    }

    bindEvents() {
        this.layer.addEventListener("mousedown", e => this.onMouseDown(e));
        document.addEventListener("mousemove", e => this.onMouseMove(e));
        document.addEventListener("mouseup", () => this.onMouseUp());
        this.layer.addEventListener("wheel", e => this.onMouseWheel(e), { passive: false });
        this.layer.addEventListener("touchstart", e => this.onTouchStart(e), { passive: false });
        document.addEventListener("touchmove", e => this.onTouchMove(e), { passive: false });
        document.addEventListener("touchend", () => this.onTouchEnd());
    }

    getMousePos(e) {
        const r = this.layer.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    getTouchPos(e) {
        const r = this.layer.getBoundingClientRect();
        const t = e.touches[0] || e.changedTouches[0];
        return { x: t.clientX - r.left, y: t.clientY - r.top };
    }

    isTest() {
        return !!(window.app && app.playMode);
    }

    tryZoneClick(obj) {
        const c = window.shop ? shop.coinByZone(obj) : null;
        if (c) { shop.open(c); return true; }
        return false;
    }

    commitDrag() {
        const o = this.dragObject;
        if (!o) return;
        if (o.x === this.dragStartX && o.y === this.dragStartY) return;
        if (window.undoRedo) undoRedo.push(new MoveCommand(o, this.dragStartX, this.dragStartY, o.x, o.y));
    }

    commitResize() {
        const o = this.resizeObject;
        if (!o) return;
        if (o.scale === this.startScale) return;
        if (window.undoRedo) undoRedo.push(new PropertyChangeCommand(o, 'scale', this.startScale, o.scale));
    }

    getDistance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    onMouseDown(e) {
        // Resize handle has priority
        const handle = e.target.closest(".selection-handle");
        if (handle && !this.isTest()) {
            const objEl = handle.closest(".scene-object");
            if (!objEl) return;
            const obj = scene.find(objEl.dataset.id);
            if (!obj) return;

            scene.select(obj.id);
            this.resizing = true;
            this.resizeObject = obj;
            this.startScale = obj.scale;

            const m = this.getMousePos(e);
            this.startDist = this.getDistance(obj.x, obj.y, m.x, m.y);

            e.preventDefault();
            e.stopPropagation();
            return;
        }

        const el = e.target.closest(".scene-object");
        if (!el) { scene.deselect(); return; }
        const obj = scene.find(el.dataset.id);
        if (!obj) return;

        if (this.isTest()) {
            this.tryZoneClick(obj);
            return;
        }

        scene.select(obj.id);
        const m = this.getMousePos(e);
        this.dragDX = m.x - obj.x;
        this.dragDY = m.y - obj.y;
        this.dragStartX = obj.x;
        this.dragStartY = obj.y;
        this.dragObject = obj;
        this.dragging = true;
        e.preventDefault();
    }

    onMouseMove(e) {
        if (this.resizing && this.resizeObject) {
            const m = this.getMousePos(e);
            const dist = this.getDistance(this.resizeObject.x, this.resizeObject.y, m.x, m.y);
            if (this.startDist > 0) {
                let newScale = this.startScale * (dist / this.startDist);
                newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
                this.resizeObject.scale = Math.round(newScale * 100) / 100;
                renderer.updateObject(this.resizeObject);
                if (window.ui) ui.refresh();
            }
            return;
        }

        if (!this.dragging || !this.dragObject) return;
        const m = this.getMousePos(e);
        this.dragObject.x = m.x - this.dragDX;
        this.dragObject.y = m.y - this.dragDY;
        renderer.updateObject(this.dragObject);
        if (window.ui) ui.refresh();
    }

    onMouseUp() {
        if (this.resizing) {
            this.commitResize();
            this.resizing = false;
            this.resizeObject = null;
        }
        if (this.dragging) this.commitDrag();
        this.dragging = false;
        this.dragObject = null;
    }

    onMouseWheel(e) {
        if (this.isTest()) return;
        const obj = scene.getSelected();
        if (!obj) return;
        e.preventDefault();

        if (e.altKey) {
            const step = e.shiftKey ? 1 : 5;
            obj.rotation += (e.deltaY < 0 ? -step : step);
            obj.rotation %= 360;
            renderer.updateObject(obj);
            if (window.ui) ui.refresh();
            return;
        }

        let step = this.scaleStep;
        if (e.shiftKey) step = 0.01;
        if (e.ctrlKey) step = 0.10;

        obj.scale += (e.deltaY < 0 ? step : -step);
        obj.scale = Math.max(this.minScale, Math.min(this.maxScale, obj.scale));
        obj.scale = Math.round(obj.scale * 100) / 100;
        renderer.updateObject(obj);
        if (window.ui) ui.refresh();
    }

    onTouchStart(e) {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        const el = document.elementFromPoint(t.clientX, t.clientY)?.closest(".scene-object");
        if (!el) { scene.deselect(); return; }
        const obj = scene.find(el.dataset.id);
        if (!obj) return;

        if (this.isTest()) {
            this.tryZoneClick(obj);
            return;
        }

        scene.select(obj.id);
        const p = this.getTouchPos(e);
        this.dragDX = p.x - obj.x;
        this.dragDY = p.y - obj.y;
        this.dragStartX = obj.x;
        this.dragStartY = obj.y;
        this.dragObject = obj;
        this.dragging = true;
        e.preventDefault();
    }

    onTouchMove(e) {
        if (!this.dragging || !this.dragObject || e.touches.length !== 1) return;
        const p = this.getTouchPos(e);
        this.dragObject.x = p.x - this.dragDX;
        this.dragObject.y = p.y - this.dragDY;
        renderer.updateObject(this.dragObject);
        if (window.ui) ui.refresh();
        e.preventDefault();
    }

    onTouchEnd() {
        if (this.dragging) this.commitDrag();
        this.dragging = false;
        this.dragObject = null;
    }
}

window.input = new Input();