/*
SCPM Studio
Build 0025
Main Loop + Shop Test Mode + autosave sanitize
*/
class App {
    constructor() {
        this.version = "0.5.0";
        this.build = "0025";
        this.playMode = false;
        this.testBtn = null;
        this.knownZoneIds = ["BUYBTCZONE", "BUYETHZONE"];
        this.lastFrameTime = performance.now();
        this.resizeTimer = null;
    }

    start() {
        console.clear();
        console.log("================================");
        console.log("SCPM Studio");
        console.log("Version:", this.version);
        console.log("Build:", this.build);
        console.log("================================");
        this.cacheDOM();
        ui.init();
        renderer.init();
        input.init();
        if (window.priceTicker) {
            priceTicker.init();
        }
        if (window.cassetteDisplay) {
            cassetteDisplay.init();
        }
        if (window.storage) {
            storage.startAutoSave();
            this.tryLoadAutoSave();
        }
        this.createObjects();
        if (window.shop) {
            shop.init();
        }
        this.bindEvents();
        this.showStatus("Ready");
        requestAnimationFrame(this.loop.bind(this));
    }

    loop(currentTime) {
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;
        if (window.animation) {
            animation.update(deltaTime);
        }
        requestAnimationFrame(this.loop.bind(this));
    }

    cacheDOM() {
        this.sceneElement = document.getElementById("scene");
        this.statusbar = document.getElementById("statusbar");
    }

    createObjects() {
        if (scene.count() > 0) return;
        scene.add(new SceneObject({
            id: "btc",
            type: "btc",
            sprite: "assets/sprites/btc.png",
            x: 305,
            y: 182,
            width: 118,
            height: 118
        }));
        scene.add(new SceneObject({
            id: "eth",
            type: "eth",
            sprite: "assets/sprites/eth.png",
            x: 622,
            y: 182,
            width: 118,
            height: 118
        }));
        scene.add(new SceneObject({
            id: "BUYBTCZONE",
            type: "zone",
            sprite: "",
            x: 186,
            y: 338,
            width: 150,
            height: 34,
            scale: 1
        }));
        scene.add(new SceneObject({
            id: "BUYETHZONE",
            type: "zone",
            sprite: "",
            x: 744,
            y: 338,
            width: 150,
            height: 34,
            scale: 1
        }));
        console.log("Scene objects:");
        console.table(scene.getAll());
    }

    bindEvents() {
        window.addEventListener("resize", () => {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => {
                if (window.renderer) renderer.render();
            }, 100);
        });

        this.testBtn = document.getElementById("btnTestMode");
        if (this.testBtn) {
            this.testBtn.addEventListener("click", () => {
                this.setPlayMode(!this.playMode);
            });
        } else {
            console.warn("[App] btnTestMode not found");
        }
    }

    setPlayMode(on) {
        this.playMode = on;
        document.body.classList.toggle("play-mode", on);
        if (this.testBtn) this.testBtn.classList.toggle("active", on);
        if (window.scene) {
            scene.deselect();
            renderer.render();
        }
        this.showStatus(on ? "Shop test mode" : "Ready");
        console.log("[App] Shop test mode:", on ? "ON" : "OFF");
    }

    tryLoadAutoSave() {
        if (!storage.hasData()) return;
        const data = storage.load();
        if (!data || !data.objects) return;
        scene.objects = [];
        scene.selected = null;
        const seen = new Set();
        let skipped = 0;
        data.objects.forEach(objData => {
            if (seen.has(objData.id)) {
                console.warn("[App] Skipped duplicate:", objData.id);
                skipped++;
                return;
            }
            const looksLikeZone =
                objData.type === "zone" || /ZONE$/i.test(objData.id || "");
            if (looksLikeZone && !this.knownZoneIds.includes(objData.id)) {
                console.warn("[App] Skipped stale zone:", objData.id);
                skipped++;
                return;
            }
            seen.add(objData.id);
            const isKnownZone = this.knownZoneIds.includes(objData.id);
            scene.add(new SceneObject({
                id: objData.id,
                type: objData.type || "object",
                sprite: objData.sprite || "",
                x: objData.x || 0,
                y: objData.y || 0,
                width: objData.width || 100,
                height: objData.height || 100,
                /* зоны всегда со Scale 100% — чтобы обе надписи
                   гарантированно были одного размера */
                scale: isKnownZone ? 1 : (objData.scale ?? 1),
                rotation: isKnownZone ? 0 : (objData.rotation || 0),
                flipX: objData.flipX || false,
                flipY: objData.flipY || false,
                opacity: objData.opacity ?? 1,
                locked: objData.locked || false,
                visible: objData.visible ?? true
            }));
        });
        console.log(`[App] Autoloaded ${scene.count()} objects, skipped ${skipped}`);
        this.showStatus(`Autoloaded: ${scene.count()} objects`);
    }

    showStatus(text) {
        if (this.statusbar) {
            this.statusbar.textContent = text;
        }
    }
}
window.addEventListener("DOMContentLoaded", () => {
    window.app = new App();
    window.app.start();
});