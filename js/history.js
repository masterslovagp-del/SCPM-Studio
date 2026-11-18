/*
SCPM Studio
Build 0023
history.js — Undo/Redo (command stacks)
*/
class PropertyChangeCommand {
    constructor(object, key, oldValue, newValue) {
        this.objectId = object.id;
        this.key = key;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }
    get label() { return "prop " + this.key; }
    undo() { this.apply(this.oldValue); }
    redo() { this.apply(this.newValue); }
    apply(value) {
        const obj = window.scene && scene.find(this.objectId);
        if (!obj) return;
        obj[this.key] = value;
        if (window.renderer) renderer.updateObject(obj);
        if (window.ui) ui.refresh();
    }
}

class MoveCommand {
    constructor(object, fromX, fromY, toX, toY) {
        this.objectId = object.id;
        this.fromX = fromX;
        this.fromY = fromY;
        this.toX = toX;
        this.toY = toY;
    }
    get label() { return "move " + this.objectId; }
    undo() { this.apply(this.fromX, this.fromY); }
    redo() { this.apply(this.toX, this.toY); }
    apply(x, y) {
        const obj = window.scene && scene.find(this.objectId);
        if (!obj) return;
        obj.x = x;
        obj.y = y;
        if (window.renderer) renderer.updateObject(obj);
        if (window.ui) ui.refresh();
    }
}

class UndoRedo {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.limit = 100;
    }
    push(cmd) {
        this.undoStack.push(cmd);
        if (this.undoStack.length > this.limit) this.undoStack.shift();
        this.redoStack = [];
        if (window.app) app.showStatus("Action: " + (cmd.label || "edit"));
    }
    undo() {
        const cmd = this.undoStack.pop();
        if (!cmd) {
            if (window.app) app.showStatus("Nothing to undo");
            return;
        }
        cmd.undo();
        this.redoStack.push(cmd);
        if (window.app) app.showStatus("Undo");
    }
    redo() {
        const cmd = this.redoStack.pop();
        if (!cmd) {
            if (window.app) app.showStatus("Nothing to redo");
            return;
        }
        cmd.redo();
        this.undoStack.push(cmd);
        if (window.app) app.showStatus("Redo");
    }
    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}
window.undoRedo = new UndoRedo();