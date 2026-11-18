/*
SCPM Studio — Side B
NFT Collection Viewer
Build 0039 — согласовано с sideb.css Build 0039
  • размер монеты = сторона A (БЕЗ ограничителя — лицо как раньше)
  • арт оборота 126% (без белого кольца), QR 12%/12%/30%
  • тонировка выключена
  • девиз сверху / номер снизу
Геометрия рабочей зоны — НЕ МЕНЯТЬ: left 6.25% / width 82.6% / right auto
*/
class SideBViewer {
    constructor() {
        this.layer = null;
        this.activeTab = 'BTC';
        this.selectedNft = null;
        this.coinMeta = {
            BTC: {
                title: 'GOLD BTC',
                sprite: 'assets/sprites/btc.png',
                back: 'assets/sprites/btc-back.png',
                backFilter: '',
                discBg: 'radial-gradient(circle at 30% 28%, #ffe28a 0%, #f7c948 35%, #d4911f 70%, #8a5a0c 100%)',
                engrave: '#6b4a08',
                color: '#f7931a',
                protocol: 'ORDINALS'
            },
            ETH: {
                title: 'SILVER ETH',
                sprite: 'assets/sprites/eth.png',
                back: 'assets/sprites/eth-back.png',
                backFilter: '',
                discBg: 'radial-gradient(circle at 30% 28%, #ffffff 0%, #d8dde6 35%, #9aa3b4 70%, #5e6778 100%)',
                engrave: '#3f4550',
                color: '#627eea',
                protocol: 'ERC-721'
            }
        };
    }

    init() {
        this.layer = document.getElementById('objectLayer');
        if (!this.layer) { console.error('[SideB] objectLayer not found'); return; }
        this.ensureQrLib();
        this.syncCoinSize();
        this.bindTabs();
        this.render();
        this.updateStatus();
        console.log('[SideB] Ready (Build 0039)');
    }

    ensureQrLib() {
        if (typeof window.qrcode !== 'undefined') return;
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
        s.onload = function () { console.log('[SideB] QR-библиотека загружена'); };
        s.onerror = function () { console.warn('[SideB] QR-библиотека недоступна'); };
        document.head.appendChild(s);
    }

    nftUrl(coin, serialText) {
        if (window.qrTools) return qrTools.nftUrl(coin, serialText);
        return 'https://scpm-studio.example/nft.html?coin=' + encodeURIComponent(coin) +
            '&serial=' + encodeURIComponent(serialText);
    }

    qrData(url) {
        if (window.qrTools) return qrTools.dataUrl(url, 140);
        if (typeof window.qrcode === 'undefined') return null;
        try {
            var q = qrcode(0, 'M');
            q.addData(url);
            q.make();
            return q.createDataURL(4, 0);
        } catch (e) { return null; }
    }

    /* Размер = как на стороне A, БЕЗ ограничителя (лицо прежнего размера) */
    syncCoinSize() {
        try {
            var keys = ['scpm_autosave', 'scpm_project_autosave', 'scpm_project', 'scpmStudio'];
            var data = null;
            for (var i = 0; i < keys.length; i++) {
                var raw = localStorage.getItem(keys[i]);
                if (raw) { try { data = JSON.parse(raw); break; } catch (e) {} }
            }
            if (!data) return;
            var objs = data.objects || [];
            var btc = null;
            for (var j = 0; j < objs.length; j++) if (objs[j].id === 'btc') { btc = objs[j]; break; }
            if (!btc) return;
            var size = Math.round((btc.width || 118) * (btc.scale != null ? btc.scale : 1));
            if (size > 0) {
                document.documentElement.style.setProperty('--nft-coin', size + 'px');
                console.log('[SideB] NFT coin size = ' + size + 'px');
            }
        } catch (e) { console.warn('[SideB] coin size fallback:', e); }
    }

    /* Стили контейнера — согласованы с CSS (grid, не flex) */
    applyContainerStyles() {
        var s = this.layer.style;
        var set = function (prop, val) { s.setProperty(prop, val, 'important'); };
        set('position', 'absolute');
        set('left', '6.25%');
        set('width', '82.6%');
        set('right', 'auto');
        set('top', '16.8%');
        set('height', '39.06%');
        set('max-height', '39.06%');
        set('bottom', 'auto');
        set('display', 'grid');
        set('grid-template-columns', 'repeat(3, 1fr)');
        set('justify-items', 'center');
        set('align-items', 'start');
        set('align-content', 'start');
        set('gap', '8px 0');
        set('padding', '2px 0');
        set('margin', '0');
        set('overflow-x', 'hidden');
        set('overflow-y', 'auto');
        set('background', 'transparent');
        set('box-sizing', 'border-box');
        set('pointer-events', 'auto');
        set('z-index', '5');
    }

    protoOf(nft) {
        if (nft && nft.protocol) return nft.protocol;
        return (this.coinMeta[nft && nft.coin] || this.coinMeta.BTC).protocol;
    }
    serialTextOf(nft) {
        if (nft && nft.serialText) return nft.serialText;
        return '#' + String(nft && nft.serial != null ? nft.serial : (nft ? nft.id : 0)).padStart(8, '0');
    }

    bindTabs() {
        var b = document.getElementById('tabBtc'), e = document.getElementById('tabEth');
        if (b) b.addEventListener('click', () => this.switchTab('BTC'));
        if (e) e.addEventListener('click', () => this.switchTab('ETH'));
    }
    switchTab(coin) {
        this.activeTab = coin;
        this.selectedNft = null;
        this.clearProperties();
        var b = document.getElementById('tabBtc'), e = document.getElementById('tabEth');
        if (b) b.classList.toggle('active', coin === 'BTC');
        if (e) e.classList.toggle('active', coin === 'ETH');
        this.render();
        this.updateStatus();
    }

    owned() { return JSON.parse(localStorage.getItem('scpm_owned_nfts') || '[]'); }
    filtered() { return this.owned().filter(n => n.coin === this.activeTab); }

    /* ОБОРОТ: арт 126% (без белого кольца) + QR сбоку + девиз/номер */
    buildBack(coin, meta, serialText) {
        var url = this.nftUrl(coin, serialText);
        var d = this.qrData(url);
        var uid = 'arc' + Math.random().toString(36).slice(2, 8);
        var ns = 'http://www.w3.org/2000/svg';

        var holder = document.createElement('div');
        holder.style.cssText = 'display:flex;flex-direction:column;align-items:center;';

        var disc = document.createElement('div');
     disc.className = 'nft-back-disc';
    'position:relative;width:var(--nft-coin);height:var(--nft-coin);border-radius:50%;' +
    'overflow:hidden;background:transparent;' +
    'box-shadow:0 4px 10px rgba(0,0,0,.35);';

        var base = document.createElement('img');
        base.src = meta.back;
        base.alt = '';
        base.draggable = false;
        base.style.cssText =
            'position:absolute;left:-13%;top:-13%;width:126%;height:126%;' +
            'object-fit:cover;border-radius:50%;pointer-events:none;' +
            (meta.backFilter ? 'filter:' + meta.backFilter + ';' : '');
        base.onerror = function () {
            this.style.display = 'none';
            console.warn('[SideB] арт оборота не найден: ' + meta.back);
        };
        disc.appendChild(base);

        if (d) {
            var qr = document.createElement('img');
            qr.src = d;
            qr.alt = 'QR';
            qr.style.cssText =
                'position:absolute;left:12%;top:12%;width:30%;height:30%;' +
                'image-rendering:pixelated;mix-blend-mode:multiply;pointer-events:none;';
            disc.appendChild(qr);
        } else {
            var fb = document.createElement('div');
            fb.style.cssText =
                'position:absolute;left:12%;top:12%;width:30%;height:30%;' +
                'display:flex;align-items:center;justify-content:center;text-align:center;' +
                'font-size:6px;color:#1a1a1a;word-break:break-all;line-height:1.2;' +
                'background:rgba(255,255,255,.9);padding:2px;box-sizing:border-box;';
            fb.textContent = url;
            disc.appendChild(fb);
        }

        var svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
        var defs = document.createElementNS(ns, 'defs');
        var pT = document.createElementNS(ns, 'path');
        pT.setAttribute('id', uid + 't');
        pT.setAttribute('d', 'M 10,50 A 40,40 0 0 1 90,50');
        pT.setAttribute('fill', 'none');
        var pB = document.createElementNS(ns, 'path');
        pB.setAttribute('id', uid + 'b');
        pB.setAttribute('d', 'M 8,50 A 42,42 0 0 0 92,50');
        pB.setAttribute('fill', 'none');
        defs.appendChild(pT);
        defs.appendChild(pB);
        svg.appendChild(defs);

        var mkArc = function (pathId, content, fs, ls) {
            var t = document.createElementNS(ns, 'text');
            t.style.cssText =
                'font-family:"Arial Black",Arial,sans-serif;font-weight:900;' +
                'font-size:' + fs + 'px;letter-spacing:' + ls + 'px;' +
                'fill:' + meta.engrave + ';opacity:.95;';
            var tp = document.createElementNS(ns, 'textPath');
            tp.setAttribute('href', '#' + pathId);
            tp.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + pathId);
            tp.setAttribute('startOffset', '50%');
            tp.setAttribute('text-anchor', 'middle');
            tp.textContent = content;
            t.appendChild(tp);
            return t;
        };
        svg.appendChild(mkArc(uid + 't', 'GREATNESS IS MEASURED IN TANGIBLES', 4.6, 0.4));
        svg.appendChild(mkArc(uid + 'b', serialText, 7, 1.2));
        disc.appendChild(svg);

        holder.appendChild(disc);
        var hint = document.createElement('div');
        hint.style.cssText = 'margin-top:2px;font-size:9px;letter-spacing:1px;color:#777;';
        hint.textContent = 'ОБОРОТ • СКАН QR → ПАСПОРТ NFT';
        holder.appendChild(hint);
        return holder;
    }

    render() {
        if (!this.layer) return;
        this.layer.innerHTML = '';
        this.layer.classList.add('sideb-collection');
        this.applyContainerStyles();
        var list = this.filtered();
        var meta = this.coinMeta[this.activeTab];
        if (list.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'nft-empty-hint';
            empty.style.gridColumn = '1 / -1';
            empty.innerHTML = '<span>КОЛЛЕКЦИЯ ПУСТА</span><span>Купите NFT на стороне A</span>';
            this.layer.appendChild(empty);
            return;
        }
        var self = this;
        list.forEach(nft => {
            var card = document.createElement('div');
            card.className = 'nft-collection-item';
            card.dataset.id = nft.id;
            card.title = '1 клик — свойства • 2 клика — оборот монеты';

            /* ЛИЦО */
            var front = document.createElement('div');
            front.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
            var img = document.createElement('img');
            img.className = 'nft-item-img';
            img.src = meta.sprite;
            img.alt = meta.title;
            img.draggable = false;
            var serial = document.createElement('div');
            serial.className = 'nft-item-serial';
            serial.textContent = self.serialTextOf(nft) + ' • ' + self.protoOf(nft);
            serial.style.color = meta.color;
            front.appendChild(img);
            front.appendChild(serial);

            /* ОБОРОТ */
            var back = self.buildBack(nft.coin, meta, self.serialTextOf(nft));
            back.style.display = 'none';

            card.appendChild(front);
            card.appendChild(back);

            card.addEventListener('click', function () { self.selectNft(nft, card); });
            card.addEventListener('dblclick', function (ev) {
                ev.stopPropagation();
                var showBack = back.style.display === 'none';
                back.style.display = showBack ? 'flex' : 'none';
                front.style.display = showBack ? 'none' : 'flex';
            });

            this.layer.appendChild(card);
        });
    }

    selectNft(nft, card) {
        this.selectedNft = nft;
        this.layer.querySelectorAll('.nft-collection-item').forEach(el => el.classList.remove('selected'));
        if (card) card.classList.add('selected');
        this.showProperties(nft);
    }
    showProperties(nft) {
        var meta = this.coinMeta[nft.coin] || {};
        document.getElementById('selectedNft').textContent = meta.title + ' ' + this.serialTextOf(nft);
        document.getElementById('nftType').textContent = nft.coin + ' • ' + this.protoOf(nft);
        document.getElementById('nftSerial').textContent = this.serialTextOf(nft);
        document.getElementById('nftTx').textContent = nft.tx || '—';
        document.getElementById('nftDate').textContent = nft.at ? new Date(nft.at).toLocaleString() : '—';
    }
    clearProperties() {
        document.getElementById('selectedNft').textContent = 'None';
        document.getElementById('nftType').textContent = '—';
        document.getElementById('nftSerial').textContent = '—';
        document.getElementById('nftTx').textContent = '—';
        document.getElementById('nftDate').textContent = '—';
    }
    updateStatus() {
        var bar = document.getElementById('statusbar');
        if (bar) bar.textContent = 'Side B — ' + this.activeTab + ': ' + this.filtered().length + ' NFT | Total: ' + this.owned().length;
    }
}
window.addEventListener('DOMContentLoaded', function () {
    window.sideb = new SideBViewer();
    sideb.init();
});