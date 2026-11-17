/*
SCPM Studio
Build 0023
cassetteDisplay.js — Hover price display, zone buy hint & label highlighting
*/
class CassetteDisplay {
    constructor() {
        this.COIN_TO_ZONE = { btc: "BUYBTCZONE", eth: "BUYETHZONE" };
        this.ZONE_TO_COIN = { BUYBTCZONE: "btc", BUYETHZONE: "eth" };
        this.COIN_TO_LABEL = { btc: ".quote-label-btc", eth: ".quote-label-eth" };
        this.hoveredCoin = null;
        this.hoveredZone = null;
    }

    init() {
        this.hint = document.querySelector("#cassetteDisplay .display-hint");
        this.priceBox = document.querySelector("#cassetteDisplay .display-price");
        this.layer = document.getElementById("objectLayer");
        if (!this.layer) return;

        this.layer.addEventListener("mouseover", e => {
            const el = e.target.closest(".scene-object");
            if (!el) return;
            const id = el.dataset.id;

            if (this.COIN_TO_ZONE[id]) {
                // Навели на монету — показываем цену
                this.showPrice(id);
                this.toggleClass(this.COIN_TO_ZONE[id], "lit", true);
                this.toggleLabel(id, true);
                this.hoveredCoin = id;
            } else if (this.ZONE_TO_COIN[id]) {
                // Навели на зону BUY — показываем "Купить!"
                this.showBuy();
                this.toggleClass(id, "lit", true);           // подсвечиваем саму зону
                this.toggleLabel(this.ZONE_TO_COIN[id], true); // подсвечиваем label BTC/ETH
                this.hoveredZone = id;
            }
        });

        this.layer.addEventListener("mouseout", e => {
            const el = e.target.closest(".scene-object");
            if (!el) return;

            const related = e.relatedTarget;
            if (related && el.contains(related)) return;

            const id = el.dataset.id;

            if (this.COIN_TO_ZONE[id]) {
                this.hide();
                this.toggleClass(this.COIN_TO_ZONE[id], "lit", false);
                this.toggleLabel(id, false);
                this.hoveredCoin = null;
            } else if (this.ZONE_TO_COIN[id]) {
                this.hide();
                this.toggleClass(id, "lit", false);
                this.toggleLabel(this.ZONE_TO_COIN[id], false);
                this.hoveredZone = null;
            }
        });

        this.layer.addEventListener("mouseleave", () => {
            this.hide();
            if (this.hoveredCoin) {
                this.toggleClass(this.COIN_TO_ZONE[this.hoveredCoin], "lit", false);
                this.toggleLabel(this.hoveredCoin, false);
                this.hoveredCoin = null;
            }
            if (this.hoveredZone) {
                this.toggleClass(this.hoveredZone, "lit", false);
                this.toggleLabel(this.ZONE_TO_COIN[this.hoveredZone], false);
                this.hoveredZone = null;
            }
        });

        console.log("[CassetteDisplay] Ready");
    }

    toggleClass(objectId, cls, on) {
        const el = this.layer.querySelector('.scene-object[data-id="' + objectId + '"]');
        if (el) el.classList.toggle(cls, on);
    }

    toggleLabel(coin, on) {
        // Подсвечиваем маленькие надписи в углу
        const label = document.querySelector(this.COIN_TO_LABEL[coin]);
        if (label) label.classList.toggle("lit", on);

        // Подсвечиваем большие надписи GOLD BTC / SILVER ETH
        const bigLabel = document.getElementById(coin === 'btc' ? 'goldBtcLabel' : 'silverEthLabel');
        if (bigLabel) bigLabel.classList.toggle("lit", on);
    }

    showPrice(id) {
        const coin = id.toUpperCase();
        const amountEl = this.priceBox.querySelector(".display-amount");
        if (amountEl) {
            const text = window.priceTicker ? priceTicker.getPhysicalDisplay(coin) : "";
            amountEl.textContent = text || "$0";
            amountEl.classList.remove("buy-hint");
        }
        if (this.hint) this.hint.classList.add("hidden");
        if (this.priceBox) this.priceBox.classList.remove("hidden");
    }

    showBuy() {
        const amountEl = this.priceBox.querySelector(".display-amount");
        if (amountEl) {
            amountEl.textContent = "Купить!";
            amountEl.classList.add("buy-hint");
        }
        if (this.hint) this.hint.classList.add("hidden");
        if (this.priceBox) this.priceBox.classList.remove("hidden");
    }

    hide() {
        if (this.hint) this.hint.classList.remove("hidden");
        if (this.priceBox) this.priceBox.classList.add("hidden");
        const amountEl = this.priceBox.querySelector(".display-amount");
        if (amountEl) amountEl.classList.remove("buy-hint");
    }
}

window.cassetteDisplay = new CassetteDisplay();