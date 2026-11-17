﻿/*
SCPM Studio
Build 0023
shop.js — NFT coin purchase with limited emission & serial numbering
*/
class Shop {
    constructor() {
        this.config = {
            contractAddress: null,
            price: {
                BTC: { amount: "0.10", unit: "BTC" },
                ETH: { amount: "0.10", unit: "ETH" }
            },
        };
        this.coins = {
            BTC: { title: "GOLD BTC",   meta: "Золото 999 • 1 TROY OUNCE" },
            ETH: { title: "SILVER ETH", meta: "Серебро 999 • 1 TROY OUNCE" },
        };
        this.supply = {
            BTC: 21000000,
            ETH: 100000000
        };
        this.overlay = null;
        this.coin = null;
        this.busy = false;
    }

    init() {
        this.buildUI();
        this.bindStaticZones();
        console.log("[Shop] Ready");
    }

    get isDemo() {
        return !this.config.contractAddress;
    }

    buildUI() {
        this.overlay = document.createElement("div");
        this.overlay.className = "shop-overlay";
        this.overlay.innerHTML = `
            <div class="shop-card">
                <div class="shop-badge">DEMO</div>
                <button class="shop-close" type="button">✕</button>
                <img class="shop-coin" alt="">
                <h2 class="shop-title"></h2>
                <p class="shop-meta"></p>
                <p class="shop-price"></p>
                <p class="shop-supply" style="font-size:11px; color:#666; margin:4px 0;"></p>
                <p class="shop-owned"></p>
                <div class="shop-status"></div>
                <div class="shop-actions">
                    <button class="shop-btn mint" type="button">Купить NFT</button>
                </div>
            </div>`;
        document.body.appendChild(this.overlay);

        this.overlay.addEventListener("click", e => {
            if (e.target === this.overlay) this.close();
        });
        this.overlay.querySelector(".shop-close").addEventListener("click", () => this.close());
        this.overlay.querySelector(".mint").addEventListener("click", () => this.mint());
        document.addEventListener("keydown", e => {
            if (e.key === "Escape") this.close();
        });
    }

    bindStaticZones() {
        document.querySelectorAll(".buy-zone").forEach(el => {
            el.addEventListener("click", () => {
                if (!(window.app && app.playMode)) return;
                this.open(el.id === "buyZoneBtc" ? "BTC" : "ETH");
            });
        });
    }

    open(coin) {
        if (!this.coins[coin]) return;
        this.coin = coin;
        const info = this.coins[coin];
        const limit = this.supply[coin];
        const minted = this.getMintedCount(coin);

        this.overlay.querySelector(".shop-coin").src =
            "assets/sprites/" + coin.toLowerCase() + ".png";
        this.overlay.querySelector(".shop-title").textContent = info.title;
        this.overlay.querySelector(".shop-meta").textContent = info.meta + " • NFT";
        var pr = this.config.price[coin] || { amount: "0.10", unit: coin };
        this.overlay.querySelector(".shop-price").textContent = "Цена: " + pr.amount + " " + pr.unit;
        this.overlay.querySelector(".shop-supply").textContent =
            "Эмиссия: " + minted.toLocaleString("en-US") + " из " + limit.toLocaleString("en-US");
        this.overlay.querySelector(".mint").disabled = false;
        this.refreshOwned();
        this.setStatus("Демо-режим: минт симулируется", "");
        this.overlay.classList.add("open");
        try { if (window.scpmSfx) scpmSfx.buyPulse(coin); } catch (e) {}
    }

    close() {
        if (this.overlay) this.overlay.classList.remove("open");
    }

    getMintedCount(coin) {
        return this.owned().filter(n => n.coin === coin).length;
    }

    async mint() {
        if (this.busy || !this.coin) return;
        this.busy = true;
        const btn = this.overlay.querySelector(".mint");
        btn.disabled = true;
        const coin = this.coin;

        try {
            // ============ ПРОВЕРКА АВТОРИЗАЦИИ ============
            console.log("[Shop] Проверка авторизации...");
            if (!window.scpmAuth) {
                throw new Error("window.scpmAuth не найден. auth.js не подключен?");
            }
            const session = await window.scpmAuth.session();
            console.log("[Shop] Session:", session);

            if (!session || !session.user) {
                this.setStatus("❌ Сначала войдите в аккаунт (кнопка ВХОД на дисплее)", "err");
                return;
            }

            console.log("[Shop] User ID:", session.user.id);

            const limit = this.supply[coin];
            const minted = this.getMintedCount(coin);
            if (minted >= limit) {
                this.setStatus("Эмиссия " + coin + " исчерпана", "err");
                return;
            }

            this.setStatus("Минтим " + this.coins[coin].title + "…", "");
            await new Promise(r => setTimeout(r, 500));

            const serial = minted + 1;
            const serialPad = String(serial).padStart(8, '0');
            const pr = this.config.price[coin] || { amount: "0.10", unit: coin };
            const txHash = "demo-" + Math.random().toString(16).slice(2, 10);

            // ============ ФОРМИРУЕМ ССЫЛКУ ============
            const baseUrl = window.location.origin || 'http://localhost:8000';
            const passportUrl = baseUrl + "/nft.html?coin=" + coin + "&serial=%23" + serialPad + "&tx=" + txHash;
            console.log("[Shop] Passport URL:", passportUrl);

            // ============ ПРОВЕРКА КЛИЕНТА SUPABASE ============
            if (!window.scpmSupabase) {
                throw new Error("window.scpmSupabase не найден. auth.js не подключен?");
            }

            // ============ ЗАПИСЬ В БАЗУ ============
            console.log("[Shop] Запись в Supabase...");
            const insertPayload = {
                user_id: session.user.id,
                coin: coin,
                serial: serial,
                token_id: null,
                tx_hash: txHash,
                passport_url: passportUrl
            };
            console.log("[Shop] Payload:", insertPayload);

            const { data, error } = await window.scpmSupabase
                .from('nfts')
                .insert([insertPayload])
                .select();

            console.log("[Shop] Insert response:", { data, error });

            if (error) {
                // Подробная диагностика
                console.error("[Shop] Supabase Error:", error);
                const errMsg = error.message || JSON.stringify(error);
                
                if (errMsg.includes('row-level security') || errMsg.includes('policy')) {
                    throw new Error("🔒 RLS блокирует вставку. Нужна RLS-политика INSERT для таблицы nfts для роли authenticated.");
                }
                if (errMsg.includes('column') && errMsg.includes('does not exist')) {
                    throw new Error("📋 Проблема со столбцом: " + errMsg + ". Проверь структуру таблицы nfts в Supabase.");
                }
                if (errMsg.includes('foreign key')) {
                    throw new Error("🔗 Foreign key ошибка. Возможно user_id не совпадает с auth.users.");
                }
                throw new Error("Ошибка Supabase: " + errMsg);
            }

            // ============ ЛОКАЛЬНОЕ СОХРАНЕНИЕ ============
            const nft = {
                coin: coin,
                id: Date.now() % 100000,
                serial: serial,
                tx: txHash,
                at: Date.now(),
                price: pr.amount + " " + pr.unit,
            };
            this.save(nft);

            this.setStatus("✔ NFT #" + serial + " ваш! TX: " + txHash, "ok");
            try { if (window.scpmSfx) scpmSfx.buySuccess(coin); } catch (e) {}
            this.refreshOwned();
            this.overlay.querySelector(".shop-supply").textContent =
                "Эмиссия: " + this.getMintedCount(coin).toLocaleString("en-US") + " из " + limit.toLocaleString("en-US");

            // Сигнал для Account
            window.dispatchEvent(new Event('scpm:nft-updated'));

        } catch (e) {
            console.error("[Shop] MINT ERROR:", e);
            this.setStatus("❌ " + (e.message || e), "err");
        } finally {
            btn.disabled = false;
            this.busy = false;
        }
    }

    owned() {
        return JSON.parse(localStorage.getItem("scpm_owned_nfts") || "[]");
    }

    save(nft) {
        const list = this.owned();
        list.push(nft);
        localStorage.setItem("scpm_owned_nfts", JSON.stringify(list));
    }

    refreshOwned() {
        const list = this.owned();
        this.overlay.querySelector(".shop-owned").textContent =
            list.length ? "В коллекции: " + list.length + " NFT" : "Коллекция пуста";
    }

    setStatus(text, kind) {
        const el = this.overlay.querySelector(".shop-status");
        el.textContent = text;
        el.className = "shop-status" + (kind ? " " + kind : "");
    }

    coinByZone(object) {
        const id = (object.id || "").toUpperCase();
        if (object.type !== "zone" && id.indexOf("ZONE") === -1) return null;
        if (id.indexOf("BTC") !== -1) return "BTC";
        if (id.indexOf("ETH") !== -1) return "ETH";
        return null;
    }
}
window.shop = new Shop();