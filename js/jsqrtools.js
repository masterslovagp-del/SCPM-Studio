/*
SCPM Studio
qrtools.js — QR для NFT (оборотная сторона монеты)
Требует CDN-библиотеку qrcode-generator (подключается в HTML)
*/
window.qrTools = {
    /* ПУБЛИЧНЫЙ URL вашего сайта — замените после хостинга!
       QR ведёт сюда: siteUrl + /nft.html?coin=…&serial=… */
    siteUrl: "https://scpm-studio.example",

    nftUrl(coin, serialText) {
        return this.siteUrl + "/nft.html?coin=" + encodeURIComponent(coin) +
            "&serial=" + encodeURIComponent(serialText);
    },

    /* QR как data-URL (GIF) для <img> */
    dataUrl(text, size) {
        try {
            if (typeof qrcode === "undefined") return null;
            var qr = qrcode(0, "M");
            qr.addData(text);
            qr.make();
            var cell = Math.max(2, Math.floor((size || 120) / qr.getModuleCount() / 2) * 2);
            return qr.createDataURL(cell, 4);
        } catch (e) {
            console.warn("[qrTools]", e);
            return null;
        }
    }
};