/*
SCPM Studio
Build 0024
renderer.js — Sprite Renderer + zone labels (только известные id)
*/
class Renderer {
    constructor() {
        this.layer = null;
        this.elements = new Map();
        this.zoneTexts = {
            BUYBTCZONE: "BUY BTC",
            BUYETHZONE: "BUY ETH"
        };
    }

    init() {
        this.layer = document.getElementById("objectLayer");
        if (!this.layer) {
            console.error("[Renderer] objectLayer not found.");
            return;
        }
        console.log("[Renderer] Ready");
        this.render();
    }

    createHandle(position) {
        const handle = document.createElement("div");
        handle.className = "selection-handle " + position;
        return handle;
    }

    render() {
        if (!this.layer) return;
        this.layer.innerHTML = "";
        this.elements.clear();
        scene.getAll().forEach(object => {
            if (!object.visible) return;
            const el = this.buildElement(object);
            this.elements.set(object.id, el);
            this.layer.appendChild(el);
        });
    }

    updateObject(object) {
        const el = this.elements.get(object.id);
        if (!el) {
            this.render();
            return;
        }
        const scale = object.scale ?? 1;
        const width = object.width * scale;
        const height = object.height * scale;
        el.style.left = `${object.x - width / 2}px`;
        el.style.top = `${object.y - height / 2}px`;
        el.style.width = width + "px";
        el.style.height = height + "px";
        el.style.transform = `rotate(${object.rotation || 0}deg)`;
        const img = el.querySelector(".coin-sprite");
        if (img) {
            img.style.opacity = object.opacity ?? 1;
        }
    }

    isZone(object) {
        return object.type === "zone" || /ZONE$/i.test(object.id);
    }

    buildElement(object) {
        const scale = object.scale ?? 1;
        const width = object.width * scale;
        const height = object.height * scale;
        const element = document.createElement("div");
        element.className = "scene-object";
        element.dataset.id = object.id;
        element.dataset.type = object.type;
        if (object.selected) {
            element.classList.add("selected");
        }
        element.style.left = `${object.x - width / 2}px`;
        element.style.top = `${object.y - height / 2}px`;
        element.style.width = width + "px";
        element.style.height = height + "px";
        element.style.transformOrigin = "50% 50%";
        if (object.type === "coin" || /^(btc|eth)$/i.test(object.id)) {
            element.style.borderRadius = "50%";
            element.style.overflow = "hidden";
        }
        element.style.transform = `rotate(${object.rotation || 0}deg)`;

        if (object.sprite) {
            const img = document.createElement("img");
            img.className = "coin-sprite";
            img.src = object.sprite;
            img.alt = object.id;
            img.draggable = false;
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.pointerEvents = "none";
            img.style.userSelect = "none";
            img.style.opacity = object.opacity ?? 1;
            let transform = "";
            if (object.flipX) transform += " scaleX(-1)";
            if (object.flipY) transform += " scaleY(-1)";
            img.style.transformOrigin = "center center";
            img.style.transform = transform;
            element.appendChild(img);
        }

        /* Зоны: рисуем ► BUY BTC ◄ / ► BUY ETH ◄ ТОЛЬКО для известных id.
           Никаких fallback-текстов из сырого id — чтобы мусорные объекты
           никогда не показывали надписи-призраки. */
        if (this.isZone(object)) {
            const text = this.zoneTexts[object.id];
            if (text) {
                const label = document.createElement("span");
                label.className = "zone-label";
                const arrowL = document.createElement("span");
                arrowL.className = "zone-arrow";
                arrowL.textContent = "►";
                const textEl = document.createElement("span");
                textEl.className = "zone-text";
                textEl.textContent = text;
                const arrowR = document.createElement("span");
                arrowR.className = "zone-arrow";
                arrowR.textContent = "◄";
                label.appendChild(arrowL);
                label.appendChild(textEl);
                label.appendChild(arrowR);
                element.appendChild(label);
            }
        }

        if (object.selected) {
            element.appendChild(this.createHandle("top-left"));
            element.appendChild(this.createHandle("top-right"));
            element.appendChild(this.createHandle("bottom-left"));
            element.appendChild(this.createHandle("bottom-right"));
        }
        return element;
    }
}
window.renderer = new Renderer();