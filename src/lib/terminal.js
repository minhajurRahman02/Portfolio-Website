/* ============================================================
   AUD — one shared WebAudio graph. Everything is synthesised;
   no media files, so nothing can fail to load.
   TERM — retro sci-fi terminal: radar sweep, CRT glitch, typewriter keys,
   and an uninvited signal that arrives on the channel and has to be killed.
   ============================================================ */
(function (root) {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ============================================================
     THE SIGNAL'S VOICE
     Set SIGNAL_SRC to a file in /public/media and that recording plays on
     the channel instead of the synthesised transmission. It is routed
     through the same analyser, so the waveform follows it either way.
       e.g. var SIGNAL_SRC = '/media/signal.mp3';
     ============================================================ */
  var SIGNAL_SRC = '';

  /** How long after the terminal opens before something starts transmitting,
      in ms — a window, so it is never the same twice. */
  var SIGNAL_DELAY = [9000, 20000];

  /* ---------------- audio ---------------- */
  var A = { ctx: null, master: null, unlocked: false, _noiseBuf: null, _an: null, _buf: null };

  function ensure() {
    if (A.ctx) return A.ctx;
    var C = root.AudioContext || root.webkitAudioContext;
    if (!C) return null;
    try { A.ctx = new C(); } catch (e) { return null; }
    A.master = A.ctx.createGain();
    A.master.gain.value = 0.9;
    A.master.connect(A.ctx.destination);
    // tap for the waveform display — fed only by whatever is on the channel
    A._an = A.ctx.createAnalyser();
    A._an.fftSize = 1024;
    A._an.smoothingTimeConstant = 0.55;
    A._buf = new Float32Array(A._an.fftSize);
    return A.ctx;
  }
  function noiseBuf() {
    var c = ensure(); if (!c) return null;
    if (A._noiseBuf) return A._noiseBuf;
    var len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A._noiseBuf = b; return b;
  }
  // Any real gesture unlocks playback for the rest of the session.
  function unlock() {
    var c = ensure(); if (!c) return;
    if (c.state === 'suspended') c.resume();
    A.unlocked = c.state === 'running';
  }
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (e) {
    addEventListener(e, unlock, { passive: true });
  });

  var Aud = {
    ready: function () { return !!(A.ctx && A.ctx.state === 'running'); },
    unlock: unlock,

    // short mechanical keypress — noise transient + body thock
    key: function (hard) {
      var c = ensure(); if (!c || c.state !== 'running') return;
      var t = c.currentTime;
      var n = c.createBufferSource(); n.buffer = noiseBuf();
      n.playbackRate.value = 1.4 + Math.random() * 0.5;
      var bp = c.createBiquadFilter(); bp.type = 'bandpass';
      bp.frequency.value = 2400 + Math.random() * 1400; bp.Q.value = 1.1;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(hard ? 0.16 : 0.085, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
      n.connect(bp); bp.connect(g); g.connect(A.master);
      n.start(t); n.stop(t + 0.07);

      var o = c.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(190 + Math.random() * 90, t);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.05);
      var og = c.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.05, t + 0.005);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(og); og.connect(A.master); o.start(t); o.stop(t + 0.08);
    },

    // carriage-return ding
    ret: function () {
      var c = ensure(); if (!c || c.state !== 'running') return;
      var t = c.currentTime, o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = 1760;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.32);
    },

    // continuous electrical hiss/crackle while the terminal is open
    hiss: function (on) {
      var c = ensure(); if (!c) return;
      if (on) {
        if (A._hiss || c.state !== 'running') return;
        var n = c.createBufferSource(); n.buffer = noiseBuf(); n.loop = true;
        var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
        var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
        var g = c.createGain(); g.gain.value = 0;
        g.gain.linearRampToValueAtTime(0.012, c.currentTime + 0.6);
        // slow crackle modulation
        var lfo = c.createOscillator(), lg = c.createGain();
        lfo.type = 'sawtooth'; lfo.frequency.value = 0.37; lg.gain.value = 0.009;
        lfo.connect(lg); lg.connect(g.gain); lfo.start();
        n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(A.master); n.start();
        A._hiss = { n: n, g: g, lfo: lfo };
      } else if (A._hiss) {
        try {
          A._hiss.g.gain.linearRampToValueAtTime(0, c.currentTime + 0.3);
          A._hiss.n.stop(c.currentTime + 0.35); A._hiss.lfo.stop(c.currentTime + 0.35);
        } catch (e) {}
        A._hiss = null;
      }
    },

    // ambient space drone for the cleared sky
    drone: function (on) {
      var c = ensure(); if (!c) return;
      if (on) {
        if (A._drone || c.state !== 'running') return;
        var g = c.createGain(); g.gain.value = 0; g.connect(A.master);
        var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 2.2;
        lp.connect(g);
        var oscs = [];
        [41.2, 61.7, 82.4, 123.5].forEach(function (hz, i) {
          var o = c.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle';
          o.frequency.value = hz * (1 + (Math.random() - 0.5) * 0.004);
          var og = c.createGain(); og.gain.value = i === 0 ? 1 : 0.45 / i;
          o.connect(og); og.connect(lp); o.start(); oscs.push(o);
        });
        // shimmer
        var n = c.createBufferSource(); n.buffer = noiseBuf(); n.loop = true;
        var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.7;
        var ng = c.createGain(); ng.gain.value = 0.05;
        n.connect(bp); bp.connect(ng); ng.connect(g); n.start();
        var lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = 0.055; lg.gain.value = 140;
        lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
        g.gain.linearRampToValueAtTime(0.1, c.currentTime + 4);
        A._drone = { g: g, oscs: oscs, n: n, lfo: lfo };
      } else if (A._drone) {
        var d = A._drone; A._drone = null;
        try {
          d.g.gain.cancelScheduledValues(c.currentTime);
          d.g.gain.setValueAtTime(d.g.gain.value, c.currentTime);
          d.g.gain.linearRampToValueAtTime(0, c.currentTime + 1.6);
          setTimeout(function () {
            try { d.oscs.forEach(function (o) { o.stop(); }); d.n.stop(); d.lfo.stop(); } catch (e) {}
          }, 1800);
        } catch (e) {}
      }
    },

    // Procedural "distorted radio transmission". Formant-filtered saw,
    // ring-modulated, band-limited to a radio channel, with squelch.
    /** Time-domain samples of whatever is currently on the channel, or null
        when nothing is. Drives the terminal's waveform. */
    wave: function () {
      if (!A._an) return null;
      A._an.getFloatTimeDomainData(A._buf);
      return A._buf;
    },

    /** The set dropping out — a short burst of broken-electronics noise. */
    fritz: function (hard) {
      var c = ensure(); if (!c || c.state !== 'running') return;
      var t = c.currentTime;
      var n = c.createBufferSource(); n.buffer = noiseBuf();
      n.playbackRate.value = 0.6 + Math.random() * 1.6;
      var bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(400 + Math.random() * 2600, t);
      bp.frequency.exponentialRampToValueAtTime(180 + Math.random() * 500, t + 0.14);
      bp.Q.value = 1.4;
      var g = c.createGain();
      var peak = hard ? 0.075 : 0.035;
      var dur = hard ? 0.19 : 0.1;
      // a couple of hard on/off steps read as a contact failing, not a whoosh
      g.gain.setValueAtTime(0, t);
      g.gain.setValueAtTime(peak, t + 0.005);
      g.gain.setValueAtTime(0.0001, t + dur * 0.35);
      g.gain.setValueAtTime(peak * 0.7, t + dur * 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(bp); bp.connect(g); g.connect(A.master);
      n.start(t); n.stop(t + dur + 0.05);
    },

    radio: function (on) {
      var c = ensure(); if (!c) return;
      if (!on) {
        if (A._radio) {
          var r = A._radio; A._radio = null;
          clearTimeout(r.timer);
          try {
            r.out.gain.linearRampToValueAtTime(0, c.currentTime + 0.25);
            setTimeout(function () { try { r.stopAll(); } catch (e) {} }, 400);
          } catch (e) {}
        }
        return;
      }
      if (A._radio || c.state !== 'running') return;

      var out = c.createGain(); out.gain.value = 0.0001;
      out.connect(A.master);
      out.connect(A._an);          // the waveform reads the channel here
      out.gain.linearRampToValueAtTime(0.5, c.currentTime + 0.3);

      /* a supplied recording replaces the synthesised transmission */
      if (SIGNAL_SRC) {
        var el = new Audio(SIGNAL_SRC);
        el.loop = true;
        el.crossOrigin = 'anonymous';
        var node = c.createMediaElementSource(el);
        node.connect(out);
        var q = el.play(); if (q && q.catch) q.catch(function () {});
        A._radio = { out: out, timer: 0, stopAll: function () { el.pause(); } };
        return;
      }

      // radio channel: 300 Hz - 2.9 kHz
      var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 320;
      var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2900;
      var shaper = c.createWaveShaper();
      var curve = new Float32Array(1024);
      for (var i = 0; i < 1024; i++) { var x = i / 512 - 1; curve[i] = Math.tanh(x * 3.2); }
      shaper.curve = curve;
      hp.connect(lp); lp.connect(shaper); shaper.connect(out);

      // voice source
      var vg = c.createGain(); vg.gain.value = 0;
      var src = c.createOscillator(); src.type = 'sawtooth'; src.frequency.value = 104;
      var vib = c.createOscillator(), vibg = c.createGain();
      vib.frequency.value = 5.1; vibg.gain.value = 5; vib.connect(vibg); vibg.connect(src.frequency); vib.start();
      src.connect(vg); src.start();

      // three formants
      var f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), f3 = c.createBiquadFilter();
      [f1, f2, f3].forEach(function (f, i) {
        f.type = 'bandpass'; f.Q.value = 7 + i * 3;
        f.frequency.value = [620, 1180, 2500][i];
        vg.connect(f); f.connect(hp);
      });

      // ring modulation gives the inhuman edge
      var ring = c.createOscillator(), rg = c.createGain();
      ring.type = 'sine'; ring.frequency.value = 37; rg.gain.value = 0.85;
      ring.connect(rg); rg.connect(vg.gain); ring.start();

      // carrier hiss
      var nz = c.createBufferSource(); nz.buffer = noiseBuf(); nz.loop = true;
      var nbp = c.createBiquadFilter(); nbp.type = 'bandpass'; nbp.frequency.value = 1700; nbp.Q.value = 0.6;
      var ng = c.createGain(); ng.gain.value = 0.1;
      nz.connect(nbp); nbp.connect(ng); ng.connect(out); nz.start();

      var VOW = [[520, 1180, 2480], [740, 1180, 2560], [330, 2100, 2900], [400, 870, 2400], [660, 1700, 2500]];
      var rec = { out: out, timer: 0 };
      function syllable() {
        if (!A._radio) return;
        var t = c.currentTime;
        var v = VOW[(Math.random() * VOW.length) | 0];
        var dur = 0.09 + Math.random() * 0.22;
        [f1, f2, f3].forEach(function (f, i) {
          f.frequency.cancelScheduledValues(t);
          f.frequency.setTargetAtTime(v[i] * (0.9 + Math.random() * 0.25), t, 0.03);
        });
        src.frequency.setTargetAtTime(86 + Math.random() * 54, t, 0.05);
        ring.frequency.setTargetAtTime(24 + Math.random() * 44, t, 0.08);
        vg.gain.cancelScheduledValues(t);
        vg.gain.setValueAtTime(vg.gain.value, t);
        vg.gain.linearRampToValueAtTime(0.5 + Math.random() * 0.4, t + 0.025);
        vg.gain.linearRampToValueAtTime(0.02, t + dur);
        // squelch bursts
        if (Math.random() < 0.22) ng.gain.setTargetAtTime(0.42, t, 0.01);
        ng.gain.setTargetAtTime(0.09, t + dur * 0.8, 0.05);
        var gap = Math.random() < 0.16 ? 420 + Math.random() * 700 : 30 + Math.random() * 120;
        rec.timer = setTimeout(syllable, dur * 1000 + gap);
      }
      rec.stopAll = function () {
        try { src.stop(); vib.stop(); ring.stop(); nz.stop(); } catch (e) {}
      };
      A._radio = rec;
      syllable();
    },

    // sonar ping
    ping: function () {
      var c = ensure(); if (!c || c.state !== 'running') return;
      var t = c.currentTime, o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(1300, t);
      o.frequency.exponentialRampToValueAtTime(680, t + 0.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.75);
    },

    zap: function () {
      var c = ensure(); if (!c || c.state !== 'running') return;
      var t = c.currentTime, n = c.createBufferSource(); n.buffer = noiseBuf();
      var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.8;
      bp.frequency.exponentialRampToValueAtTime(120, t + 0.4);
      var g = c.createGain();
      g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      n.connect(bp); bp.connect(g); g.connect(A.master); n.start(t); n.stop(t + 0.5);
    }
  };


  /* ---------------- terminal ---------------- */
  var Term = {
    el: null, out: null, input: null, radarCv: null, radarCtx: null,
    waveCv: null, waveCtx: null, open: false, mode: 'idle',
    cmds: {}, blips: [], _sigT: null, _glitchT: 0,

    init: function () {
      Term.el = $('#term'); Term.out = $('#term-out'); Term.input = $('#term-cmd');
      Term.radarCv = $('#radar'); Term.radarCtx = Term.radarCv.getContext('2d');
      Term.waveCv = $('#signal-wave'); Term.waveCtx = Term.waveCv.getContext('2d');
      Term.sizeCanvases();
      addEventListener('resize', Term.sizeCanvases);

      Term.input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          Aud.ret();
          var raw = Term.input.value.trim(); Term.input.value = '';
          if (!raw) return;
          Term.echo('<span class="ok">&gt;</span> ' + raw.replace(/</g, '&lt;'));
          Term.run(raw);
        } else if (e.key.length === 1 || e.key === 'Backspace') {
          Aud.key(e.key === 'Backspace');
        }
      });
      $('#term-x').addEventListener('click', function () { Term.hide(); });
      Term.boot();
    },

    sizeCanvases: function () {
      [[Term.radarCv, Term.radarCtx], [Term.waveCv, Term.waveCtx]].forEach(function (p) {
        var cv = p[0], ctx = p[1]; if (!cv) return;
        var r = cv.getBoundingClientRect();
        var d = Math.min(devicePixelRatio || 1, 2);
        cv.width = Math.max(1, r.width * d); cv.height = Math.max(1, r.height * d);
        ctx.setTransform(d, 0, 0, d, 0, 0);
        cv._w = r.width; cv._h = r.height;
      });
    },

    register: function (name, fn) { Term.cmds[name] = fn; },

    echo: function (html, cls) {
      Term.out.innerHTML += '<div' + (cls ? ' class="' + cls + '"' : '') + '>' + html + '</div>';
      Term.out.scrollTop = Term.out.scrollHeight;
    },

    // type a line out character by character with key sounds
    typeOut: function (text, cls, done) {
      var d = document.createElement('div');
      if (cls) d.className = cls;
      Term.out.appendChild(d);
      var i = 0;
      (function step() {
        if (i >= text.length) { if (done) done(); return; }
        d.textContent += text[i++];
        if (i % 2 === 0) Aud.key();
        Term.out.scrollTop = Term.out.scrollHeight;
        setTimeout(step, 14 + Math.random() * 22);
      })();
    },

    boot: function () {
      Term.echo('<span class="ac">╭─ ORBITAL TERMINAL v2.6 ─────────────╮</span>');
      Term.echo('<span class="ac">│</span> link established · signal nominal  <span class="ac">│</span>');
      Term.echo('<span class="ac">╰─────────────────────────────────────╯</span>');
      Term.echo('type <span class="cm">help</span> to begin', 'dimline');
    },

    show: function () {
      Term.el.classList.add('open');
      Term.open = true;
      Aud.unlock(); Aud.hiss(true);
      setTimeout(function () { Term.sizeCanvases(); Term.input.focus(); }, 320);
      Term.glitch(0.5);
      Term.armSignal();
    },
    hide: function () {
      Term.el.classList.remove('open');
      Term.open = false;
      Aud.hiss(false);
      clearTimeout(Term._sigT);
      Term.endSignal(true);
    },

    glitch: function (strength) {
      Term.el.classList.add('glitching');
      clearTimeout(Term._g);
      Term._g = setTimeout(function () { Term.el.classList.remove('glitching'); }, 180 + strength * 320);
    },

    run: function (raw) {
      var sp = raw.split(/\s+/), c = sp.shift().toLowerCase(), arg = sp.join(' ');
      if (Term.mode === 'signal' && c !== 'kill' && c !== 'exit' && c !== 'clear') {
        Term.echo('channel occupied — type <span class="cm">kill</span> to disconnect', 'er');
        return;
      }
      if (c === 'kill') {
        if (Term.mode !== 'signal') return Term.echo('nothing to disconnect.', 'dimline');
        return Term.endSignal(false);
      }
      if (Term.cmds[c]) return Term.cmds[c](arg);
      Term.glitch(0.3);
      Term.echo('command not found: ' + c + ' — try <span class="cm">help</span>', 'er');
    },

    /* ---- the incoming signal ----
       Nobody summons it. Some time after the terminal is opened something
       starts transmitting on the channel, and it keeps transmitting until it
       is killed. */
    armSignal: function () {
      clearTimeout(Term._sigT);
      if (Term.mode === 'signal') return;
      Term._sigT = setTimeout(function () {
        if (Term.open && Term.mode !== 'signal') Term.beginSignal();
      }, SIGNAL_DELAY[0] + Math.random() * (SIGNAL_DELAY[1] - SIGNAL_DELAY[0]));
    },

    beginSignal: function () {
      Term.mode = 'signal';
      Term.el.classList.add('signal');
      Aud.ping();
      Term.blips = [{ a: Math.random() * 6.28, r: 0.74, life: 0 }];
      setTimeout(function () {
        if (Term.mode !== 'signal') return;
        Term.glitch(0.8);
        Aud.radio(true);
        Term.echo('<span class="er">⚠ incoming signal detected — type <span class="cm">kill</span> to disconnect</span>');
      }, 420);
    },

    endSignal: function (silent) {
      clearTimeout(Term._sigT);
      if (Term.mode !== 'signal') return;
      Term.mode = 'idle';
      Term.el.classList.remove('signal');
      Aud.radio(false);
      Term.blips = [];
      if (!silent) {
        Aud.zap(); Term.glitch(1);
        Term.echo('<span class="er">── carrier dropped ──</span>');
        Term.echo('link returned to local.', 'dimline');
        Term.armSignal();     // it will come back
      }
    },

    /* ---- per-frame drawing ---- */
    tick: function (t, dt) {
      if (!Term.open) return;
      Term.drawRadar(t, dt);
      Term.drawWave(t);

      /* the set is old and badly shielded: it drops out on its own every so
         often, harder while something is on the channel */
      Term._glitchT -= dt;
      if (Term._glitchT <= 0) {
        var hot = Term.mode === 'signal';
        Term._glitchT = (hot ? 1.1 : 4) + Math.random() * (hot ? 2.2 : 7);
        Term.glitch(hot ? 0.7 : 0.35);
        Aud.fritz(hot);
      }
    },

    drawRadar: function (t, dt) {
      var ctx = Term.radarCtx, cv = Term.radarCv;
      if (!ctx || !cv._w) return;
      var w = cv._w, h = cv._h, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 2;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(80,255,190,.28)'; ctx.lineWidth = 1;
      for (var i = 1; i <= 3; i++) {
        ctx.beginPath(); ctx.arc(cx, cy, R * i / 3, 0, 6.283); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();

      // sweeps anticlockwise
      var a = (-t * 1.5) % 6.283;
      var g = ctx.createConicGradient ? ctx.createConicGradient(a, cx, cy) : null;
      if (g) {
        g.addColorStop(0, 'rgba(80,255,190,.42)');
        g.addColorStop(0.12, 'rgba(80,255,190,0)');
        g.addColorStop(1, 'rgba(80,255,190,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(140,255,215,.95)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();

      if (Term.mode !== 'signal' && Math.random() < dt * 0.5) {
        Term.blips.push({ a: Math.random() * 6.28, r: 0.25 + Math.random() * 0.65, life: 0 });
      }
      for (var k = Term.blips.length - 1; k >= 0; k--) {
        var b = Term.blips[k]; b.life += dt;
        var fade = Term.mode === 'signal' ? 1 : Math.max(0, 1 - b.life / 3.2);
        if (fade <= 0) { Term.blips.splice(k, 1); continue; }
        var bx = cx + Math.cos(b.a) * b.r * R, by = cy + Math.sin(b.a) * b.r * R;
        var hot = Term.mode === 'signal';
        ctx.fillStyle = hot ? 'rgba(255,90,110,' + fade + ')' : 'rgba(120,255,200,' + fade + ')';
        ctx.beginPath(); ctx.arc(bx, by, hot ? 4 : 2.4, 0, 6.283); ctx.fill();
        if (hot) {
          var pr = (t * 0.8 % 1);
          ctx.strokeStyle = 'rgba(255,90,110,' + (1 - pr) + ')';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(bx, by, 4 + pr * 16, 0, 6.283); ctx.stroke();
        }
      }
    },

    /* ---- the signal: a live waveform of whatever is on the channel ----
       The trace is read from a real analyser tap on the audio graph, so it
       shows the actual transmission rather than a decorative sine. Neutral is
       a flat carrier with a little noise on it; once the signal lands the
       trace is driven by the voice itself. */
    drawWave: function (t) {
      var ctx = Term.waveCtx, cv = Term.waveCv;
      if (!ctx || !cv._w) return;
      var w = cv._w, h = cv._h, mid = h / 2;
      ctx.clearRect(0, 0, w, h);

      var live = Term.mode === 'signal';
      var buf = live ? Aud.wave() : null;
      var tint = live ? '255,120,140' : '120,255,200';

      ctx.strokeStyle = 'rgba(' + tint + ',.16)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();

      var N = 128;
      ctx.strokeStyle = 'rgba(' + tint + ',.95)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (var i = 0; i < N; i++) {
        var x = (i / (N - 1)) * w, v;
        if (buf) {
          v = buf[(i / N * buf.length) | 0] * 1.5;
        } else {
          // idle carrier: a slow breath with a little hiss on it
          v = Math.sin(t * 1.6 + i * 0.22) * 0.05 + (Math.random() - 0.5) * 0.03;
        }
        var y = mid - Math.max(-1, Math.min(1, v)) * (h * 0.4);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();

      if (live) {
        ctx.fillStyle = 'rgba(255,120,140,' + (0.45 + 0.55 * Math.sin(t * 6)).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(w - 11, 11, 3.2, 0, 6.283); ctx.fill();
      }
      ctx.fillStyle = 'rgba(' + tint + ',.7)';
      ctx.font = '9px ui-monospace,monospace';
      ctx.fillText(live ? 'SIGNAL  LOCKED' : 'CARRIER  IDLE', 8, h - 8);
    }
  };

  root.Aud = Aud;
  root.Term = Term;
})(typeof window !== 'undefined' ? window : globalThis);

export const Aud = window.Aud;
export const Term = window.Term;
