/*
 * SCPM Studio — SFX + Background Music Playlist (JSON loading)
 */
(function (global) {
    var ctx = null;
    var unlocked = false;
    var muted = false;

    var FLIP_SRC = 'assets/sfx/cassette-flip.wav';
    var REEL_SRC = 'assets/sfx/reel-loop.wav';

    var MUSIC_PLAYLIST = [];
    var flipAudio = null, flipVolume = 0.9;
    var reelAudio = null, reelOn = false, REEL_VOL = 0.22;
    var musicAudio = null, musicOn = false, musicIndex = 0, MUSIC_VOL = 0.35;

    try {
        var savedVol = localStorage.getItem('scpm_music_volume');
        if (savedVol !== null) MUSIC_VOL = parseFloat(savedVol) || 0.35;
        muted = localStorage.getItem('scpm_sfx_muted') === '1';
    } catch (e) {}

    fetch('assets/sfx/music/playlist.json')
        .then(function(r) { return r.json(); })
        .then(function(list) {
            if (Array.isArray(list)) {
                MUSIC_PLAYLIST = list.map(function(name) { return 'assets/sfx/music/' + name; });
                console.log('[Sfx] Плейлист загружен:', MUSIC_PLAYLIST);
                try {
                    var savedIdx = parseInt(localStorage.getItem('scpm_music_idx') || '0', 10);
                    musicIndex = (Number.isInteger(savedIdx) && savedIdx < MUSIC_PLAYLIST.length) ? savedIdx : 0;
                } catch (e) {}
                updateMusicUI();
            }
        })
        .catch(function(e) { console.warn('[Sfx] Не удалось загрузить playlist.json.', e); });

    function getCtx() {
        if (!ctx) {
            var AC = global.AudioContext || global.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
        }
        return ctx;
    }

    function unlock() {
        var c = getCtx();
        if (!c) return;
        if (c.state === 'suspended') c.resume().catch(function () {});
        unlocked = true;
        if (!flipAudio) {
            try {
                flipAudio = new Audio(FLIP_SRC);
                flipAudio.preload = 'auto';
                flipAudio.volume = flipVolume;
            } catch (e) {}
        }
        if (!muted) tryAutoStartMusic();
    }

    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
        global.addEventListener(ev, unlock, { once: true, passive: true });
    });

    function flipCassetteSynth() {
        var c = getCtx();
        if (!c) return;
        var t0 = c.currentTime, src = c.createBufferSource();
        var buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.35), c.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        src.buffer = buf;
        var filt = c.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.setValueAtTime(400, t0);
        filt.frequency.exponentialRampToValueAtTime(2200, t0 + 0.12);
        filt.frequency.exponentialRampToValueAtTime(600, t0 + 0.28);
        var g = c.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
        src.connect(filt); filt.connect(g); g.connect(c.destination);
        src.start(t0); src.stop(t0 + 0.36);
    }

    function flipCassette() {
        if (muted) return;
        unlock();
        try {
            if (!flipAudio) {
                flipAudio = new Audio(FLIP_SRC);
                flipAudio.preload = 'auto';
                flipAudio.volume = flipVolume;
            }
            var a = flipAudio.cloneNode(true);
            a.volume = flipVolume;
            var p = a.play();
            if (p && typeof p.then === 'function') p.catch(function () { flipCassetteSynth(); });
        } catch (e) { flipCassetteSynth(); }
    }

    function buyPulse(kind) {
        if (muted) return; unlock();
        var c = getCtx(); if (!c) return;
        var t0 = c.currentTime, f1 = kind === 'ETH' ? 520 : 380, f2 = kind === 'ETH' ? 780 : 560;
        [f1, f2].forEach(function (freq, i) {
            var osc = c.createOscillator(); osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t0 + i * 0.07);
            var g = c.createGain();
            g.gain.setValueAtTime(0.0001, t0 + i * 0.07);
            g.gain.exponentialRampToValueAtTime(0.1 - i * 0.02, t0 + i * 0.07 + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.07 + 0.2);
            osc.connect(g); g.connect(c.destination);
            osc.start(t0 + i * 0.07); osc.stop(t0 + i * 0.07 + 0.25);
        });
    }

    function buySuccess(kind) {
        if (muted) return; unlock();
        var c = getCtx(); if (!c) return;
        var t0 = c.currentTime, base = kind === 'ETH' ? 440 : 330;
        [0, 1, 2].forEach(function (i) {
            var osc = c.createOscillator(); osc.type = 'sine';
            osc.frequency.value = base * (1 + i * 0.5);
            var g = c.createGain();
            g.gain.setValueAtTime(0.0001, t0 + i * 0.06);
            g.gain.exponentialRampToValueAtTime(0.07 - i * 0.015, t0 + i * 0.06 + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.06 + 0.25);
            osc.connect(g); g.connect(c.destination);
            osc.start(t0 + i * 0.06); osc.stop(t0 + i * 0.06 + 0.3);
        });
    }

    function setReel(on) {
        if (muted) on = false; on = !!on; unlock();
        if (!reelAudio) {
            try {
                reelAudio = new Audio(REEL_SRC);
                reelAudio.loop = true; reelAudio.preload = 'auto'; reelAudio.volume = REEL_VOL;
                try { reelAudio.load(); } catch (e) {}
            } catch (e) { return; }
        }
        if (on) {
            if (!reelAudio.paused && reelOn) return;
            var p = reelAudio.play();
            if (p && typeof p.then === 'function') p.then(function () { reelOn = true; }).catch(function () { reelOn = false; });
            else reelOn = true;
        } else {
            try { reelAudio.pause(); } catch (e) {}
            reelOn = false;
        }
    }

    function isReelOn() { return reelOn; }

    function playMusicIndex(index, play) {
        if (!MUSIC_PLAYLIST.length) return;
        index = ((index % MUSIC_PLAYLIST.length) + MUSIC_PLAYLIST.length) % MUSIC_PLAYLIST.length;
        musicIndex = index;
        try { localStorage.setItem('scpm_music_idx', musicIndex); } catch (e) {}
        if (musicAudio) { try { musicAudio.pause(); } catch (e) {} }
        var url = MUSIC_PLAYLIST[musicIndex];
        try {
            musicAudio = new Audio(url);
            musicAudio.preload = 'auto';
            musicAudio.volume = MUSIC_VOL;
            musicAudio.addEventListener('ended', function () { playMusicIndex(musicIndex + 1, true); });
            musicAudio.addEventListener('error', function () {
                console.warn('[Sfx] music load error:', url);
                if (MUSIC_PLAYLIST.length > 1 && musicOn) setTimeout(function () { playMusicIndex(musicIndex + 1, true); }, 500);
            });
            if (play && !muted) {
                var p = musicAudio.play();
                if (p && typeof p.then === 'function') {
                    p.then(function () { musicOn = true; setReel(true); updateMusicUI(); }).catch(function () { musicOn = false; updateMusicUI(); });
                } else { musicOn = true; setReel(true); updateMusicUI(); }
            } else { musicOn = false; updateMusicUI(); }
        } catch (e) { console.warn(e); }
    }

    function setMusic(on) {
        if (muted) on = false;
        if (!on) {
            if (musicAudio) { try { musicAudio.pause(); } catch (e) {} }
            musicOn = false; setReel(false); updateMusicUI(); return;
        }
        if (!musicAudio) { playMusicIndex(musicIndex, true); return; }
        var p = musicAudio.play();
        if (p && typeof p.then === 'function') {
            p.then(function () { musicOn = true; setReel(true); updateMusicUI(); }).catch(function () { musicOn = false; updateMusicUI(); });
        } else { musicOn = true; setReel(true); updateMusicUI(); }
    }

    function nextTrack() { playMusicIndex(musicIndex + 1, true); }
    function prevTrack() { playMusicIndex(musicIndex - 1, true); }
    function isMusicOn() { return musicOn; }
    function getPlaylist() { return MUSIC_PLAYLIST.slice(); }
    function getTrackIndex() { return musicIndex; }

    function tryAutoStartMusic() {
        if (muted || musicOn || !MUSIC_PLAYLIST.length) return;
        try { var auto = localStorage.getItem('scpm_music_auto') !== '0'; if (!auto) return; } catch (e) {}
        setMusic(true);
    }

    function setMuted(v) {
        muted = !!v;
        try { localStorage.setItem('scpm_sfx_muted', muted ? '1' : '0'); } catch (e) {}
        if (muted) {
            setReel(false);
            if (musicAudio) { try { musicAudio.pause(); } catch (e) {} }
            musicOn = false;
        }
        updateMusicUI();
    }

    function isMuted() { return muted; }

    // ---------- UI ----------
    function updateMusicUI() {
        var volIcon = document.getElementById('iconVolume');
        var muteIcon = document.getElementById('iconMute');
        var playIcon = document.getElementById('iconPlay');
        var pauseIcon = document.getElementById('iconPause');
        var playBtn = document.getElementById('btnMusicPlay');

        if (volIcon && muteIcon) {
            if (muted) {
                volIcon.style.display = 'none';
                muteIcon.style.display = 'block';
            } else {
                volIcon.style.display = 'block';
                muteIcon.style.display = 'none';
            }
        }

        if (playIcon && pauseIcon && playBtn) {
            if (musicOn) {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
                playBtn.classList.add('active');
            } else {
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
                playBtn.classList.remove('active');
            }
        }
    }

    function bindMusicButtons() {
        var muteBtn = document.getElementById('btnMusicMute');
        if (muteBtn && muteBtn.dataset.bound !== '1') {
            muteBtn.dataset.bound = '1';
            muteBtn.addEventListener('click', function () {
                unlock();
                setMuted(!isMuted());
                if (!isMuted() && !musicOn) setMusic(true);
            });
        }
        var playBtn = document.getElementById('btnMusicPlay');
        if (playBtn && playBtn.dataset.bound !== '1') {
            playBtn.dataset.bound = '1';
            playBtn.addEventListener('click', function () {
                unlock();
                if (isMuted()) setMuted(false);
                setMusic(!musicOn);
                try { localStorage.setItem('scpm_music_auto', musicOn ? '1' : '0'); } catch (e) {}
            });
        }
        var prevBtn = document.getElementById('btnMusicPrev');
        if (prevBtn && prevBtn.dataset.bound !== '1') {
            prevBtn.dataset.bound = '1';
            prevBtn.addEventListener('click', function () { unlock(); if (isMuted()) setMuted(false); prevTrack(); });
        }
        var nextBtn = document.getElementById('btnMusicNext');
        if (nextBtn && nextBtn.dataset.bound !== '1') {
            nextBtn.dataset.bound = '1';
            nextBtn.addEventListener('click', function () { unlock(); if (isMuted()) setMuted(false); nextTrack(); });
        }
        updateMusicUI();
    }

        function boot() {
        bindMusicButtons();
        
        // Принудительно разблокируем аудио при первом же клике по странице
        document.addEventListener('pointerdown', function unlockOnce() {
            document.removeEventListener('pointerdown', unlockOnce);
            unlock(); // Разблокирует AudioContext
            if (!muted && !musicOn) {
                tryAutoStartMusic(); // Попробует включить музыку
            }
        }, { once: true, passive: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();

    global.scpmSfx = {
        flip: flipCassette, buyPulse: buyPulse, buySuccess: buySuccess,
        setReel: setReel, isReelOn: isReelOn,
        setMusic: setMusic, isMusicOn: isMusicOn, setMusicVolume: function(v){ MUSIC_VOL = Math.max(0, Math.min(1, v)); if (musicAudio) musicAudio.volume = MUSIC_VOL; },
        setMuted: setMuted, isMuted: isMuted, unlock: unlock,
        nextTrack: nextTrack, prevTrack: prevTrack,
        getPlaylist: getPlaylist, getTrackIndex: getTrackIndex
    };
})(typeof window !== 'undefined' ? window : globalThis);