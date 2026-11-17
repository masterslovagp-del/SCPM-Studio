/*
SCPM Studio
Build 0023
priceTicker.js — Live prices + physical coin display
Primary: Coinbase  |  Fallback: CoinGecko  |  Seed defaults if offline
*/
class PriceTicker {
    constructor() {
        // Seed so UI never shows empty $0 / ($—) before first successful fetch
        this.prices = { BTC: 80000, ETH: 2500 };
        this.prev = { BTC: 80000, ETH: 2500 };
        this.change24h = { BTC: 0, ETH: 0 };

        // Fixed physical amount on the cassette center display
        this.physicalPrices = {
            btc: { amount: 0.10, unit: "BTC" },
            eth: { amount: 0.10, unit: "ETH" }
        };
    }

    init() {
        this.quoteBtc = document.getElementById("quoteBtc");
        this.quoteEth = document.getElementById("quoteEth");
        this.trendBTC = document.getElementById("trendBTC");
        this.trendETH = document.getElementById("trendETH");

        // Paint seed prices immediately
        this.paintQuotes();

        this.fetch();
        setInterval(() => this.fetch(), 60000);
        console.log("[PriceTicker] Ready");
    }

    async fetch() {
        // 1) Coinbase (reliable, CORS-friendly)
        try {
            const [btcRes, ethRes] = await Promise.all([
                fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot"),
                fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot")
            ]);
            if (btcRes.ok && ethRes.ok) {
                const btc = await btcRes.json();
                const eth = await ethRes.json();
                const btcPrice = parseFloat(btc?.data?.amount);
                const ethPrice = parseFloat(eth?.data?.amount);
                if (btcPrice > 0 && ethPrice > 0) {
                    this.applyLive(btcPrice, ethPrice, 0, 0);
                    console.log("[PriceTicker] Coinbase OK", btcPrice, ethPrice);
                    return;
                }
            }
        } catch (e) {
            console.warn("[PriceTicker] Coinbase failed:", e);
        }

        // 2) CoinGecko fallback
        try {
            const res = await fetch(
                "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
            );
            if (res.ok) {
                const data = await res.json();
                const btcPrice = data?.bitcoin?.usd;
                const ethPrice = data?.ethereum?.usd;
                if (btcPrice > 0 && ethPrice > 0) {
                    this.applyLive(
                        btcPrice,
                        ethPrice,
                        data.bitcoin.usd_24h_change || 0,
                        data.ethereum.usd_24h_change || 0
                    );
                    console.log("[PriceTicker] CoinGecko OK", btcPrice, ethPrice);
                    return;
                }
            } else {
                console.warn("[PriceTicker] CoinGecko HTTP", res.status);
            }
        } catch (e) {
            console.warn("[PriceTicker] CoinGecko failed:", e);
        }

        // Keep last known / seed prices
        this.paintQuotes();
        console.warn("[PriceTicker] Using last known prices");
    }

    applyLive(btcPrice, ethPrice, btcChange, ethChange) {
        this.prev.BTC = this.prices.BTC;
        this.prev.ETH = this.prices.ETH;
        this.prices.BTC = btcPrice;
        this.prices.ETH = ethPrice;
        this.change24h.BTC = btcChange;
        this.change24h.ETH = ethChange;
        this.paintQuotes();
    }

    paintQuotes() {
        if (this.quoteBtc) this.quoteBtc.textContent = this.formatPrice(this.prices.BTC);
        if (this.quoteEth) this.quoteEth.textContent = this.formatPrice(this.prices.ETH);

        this.paintTrend(this.trendBTC, this.change24h.BTC, this.prices.BTC, this.prev.BTC);
        this.paintTrend(this.trendETH, this.change24h.ETH, this.prices.ETH, this.prev.ETH);
    }

    paintTrend(el, change24h, current, prev) {
        if (!el) return;
        let dir = "neutral";
        if (typeof change24h === "number" && change24h !== 0) {
            dir = change24h > 0 ? "up" : "down";
        } else if (prev > 0 && current !== prev) {
            dir = current > prev ? "up" : "down";
        }
        el.className = "quote-trend " + dir;
        el.textContent = dir === "up" ? "▲" : dir === "down" ? "▼" : "—";
    }

    getPrice(coin) {
        const key = (coin || "").toUpperCase();
        return this.prices[key] || 0;
    }

    formatPrice(price) {
        return "$" + Number(price).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /** USD for center display — without cents, shorter string */
    formatPhysicalUsd(price) {
        return "$" + Math.round(Number(price)).toLocaleString("en-US");
    }

    /**
     * Center cassette display:
     * "0.10 BTC ($8,000)" — amount fixed, $ = amount × live rate (rounded)
     */
    getPhysicalDisplay(coin) {
        const key = (coin || "").toLowerCase();
        const p = this.physicalPrices[key];
        if (!p) return "";

        const unit = p.unit;
        const rate = this.getPrice(unit);
        if (!(rate > 0)) {
            return p.amount.toFixed(2) + " " + unit;
        }
        const usd = p.amount * rate;
        return p.amount.toFixed(2) + " " + unit + " (" + this.formatPhysicalUsd(usd) + ")";
    }
}

window.priceTicker = new PriceTicker();
