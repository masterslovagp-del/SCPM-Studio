/*
SCPM Studio
Build 0023
projectManager.js — Save / Load (.scpm)
*/
class ProjectManager {
    constructor() {
        this.version = "0.5.0";
        this.fileExtension = ".scpm";
    }

    save() {
        if (!window.scene) return;
        const project = {
            version: this.version,
            savedAt: new Date().toISOString(),
            objects: scene.getAll().map(o => ({
                id: o.id, type: o.type, sprite: o.sprite,
                x: o.x, y: o.y, width: o.width, height: o.height,
                scale: o.scale, rotation: o.rotation,
                flipX: o.flipX, flipY: o.flipY, opacity: o.opacity,
                locked: o.locked, visible: o.visible
            }))
        };

        const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `project_${Date.now()}${this.fileExtension}`;
        a.click();
        URL.revokeObjectURL(a.href);

        console.log("[ProjectManager] Saved", project.objects.length, "objects");
        if (window.app) app.showStatus("Project saved");
    }

    triggerLoad() {
        const input = document.getElementById("fileLoad");
        if (input) {
            input.click();
        } else {
            const el = document.createElement("input");
            el.type = "file";
            el.accept = ".scpm,.json";
            el.onchange = (e) => {
                const file = e.target.files[0];
                if (file) this.load(file);
            };
            el.click();
        }
    }

    load(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.apply(data);
            } catch (err) {
                console.error("[ProjectManager] Load failed:", err);
                alert("Failed to load project file");
                if (window.app) app.showStatus("Load failed");
            }
        };
        reader.readAsText(file);
    }

    apply(data) {
        if (!data || !data.objects) return;

        const fileVersion = data.version || "0.0";
        if (fileVersion !== this.version) {
            console.warn(`[ProjectManager] Version mismatch: file=${fileVersion}, app=${this.version}`);
            data = this.migrate(data, fileVersion);
        }

        scene.objects = [];
        scene.selected = null;
        if (window.undoRedo) undoRedo.clear();

        data.objects.forEach(o => scene.add(new SceneObject(o)));
        renderer.render();

        if (window.app) app.showStatus("Loaded: " + data.objects.length + " objects");
        console.log(`[ProjectManager] Loaded ${data.objects.length} objects`);
    }

    migrate(data, fromVersion) {
        if (fromVersion < "0.5.0") {
            data.objects.forEach(obj => {
                if (obj.opacity === undefined) obj.opacity = 1;
                if (obj.locked === undefined) obj.locked = false;
                if (obj.visible === undefined) obj.visible = true;
            });
        }
        data.version = this.version;
        return data;
    }
}

window.projectManager = new ProjectManager();

window.addEventListener("DOMContentLoaded", () => {
    const fi = document.getElementById("fileLoad");
    if (fi) fi.addEventListener("change", e => {
        const f = e.target.files[0];
        if (f) projectManager.load(f);
        fi.value = "";
    });
});