/* ============================================================
   AUD — one shared WebAudio graph. Everything is synthesised;
   no media files, so nothing can fail to load.
   TERM — retro sci-fi terminal: radar sweep, CRT glitch,
   typewriter keys, and the `alien` contact sequence.
   ============================================================ */
(function (root) {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  /* ---------------- audio ---------------- */
  var A = { ctx: null, master: null, unlocked: false, _noiseBuf: null };

  function ensure() {
    if (A.ctx) return A.ctx;
    var C = root.AudioContext || root.webkitAudioContext;
    if (!C) return null;
    try { A.ctx = new C(); } catch (e) { return null; }
    A.master = A.ctx.createGain();
    A.master.gain.value = 0.9;
    A.master.connect(A.ctx.destination);
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

      var out = c.createGain(); out.gain.value = 0.0001; out.connect(A.master);
      out.gain.linearRampToValueAtTime(0.5, c.currentTime + 0.3);

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

  /* ---------------- alien wireframe ---------------- */
  /* ---------------- alien head mesh ----------------
     A profile-swept surface rather than a sphere: wide cranium, pinched
     temples, hollow cheeks, pointed chin, with the eye sockets pressed in
     and a neck below. Rendered as shaded, depth-sorted triangles. */
  function smoothProfile(stops, v) {
    for (var i = 0; i < stops.length - 1; i++) {
      var a = stops[i], b = stops[i + 1];
      if (v >= a[0] && v <= b[0]) {
        var t = (v - a[0]) / (b[0] - a[0] || 1);
        t = t * t * (3 - 2 * t);                       // smoothstep
        return a[1] + (b[1] - a[1]) * t;
      }
    }
    return stops[stops.length - 1][1];
  }

  // half-width / half-depth by latitude (0 = crown, 1 = chin)
  var W_PROFILE = [[0,.07],[.05,.36],[.12,.56],[.20,.68],[.30,.73],[.40,.72],
                   [.47,.67],[.55,.57],[.63,.45],[.72,.34],[.82,.25],[.91,.19],[1,.15]];
  var D_PROFILE = [[0,.07],[.07,.36],[.18,.54],[.30,.62],[.42,.60],[.52,.54],
                   [.64,.44],[.78,.33],[.90,.25],[1,.20]];

  function buildAlien2() {
    var LAT = 26, LON = 30, grid = [], pts = [], tris = [], i, j;
    var EYES = [[-0.36, 0.02, 0.46], [0.36, 0.02, 0.46]];

    for (i = 0; i <= LAT; i++) {
      grid[i] = [];
      var v = i / LAT;
      var w = smoothProfile(W_PROFILE, v);
      var d = smoothProfile(D_PROFILE, v);
      var y = 0.92 - v * 1.62;
      for (j = 0; j < LON; j++) {
        var th = (j / LON) * Math.PI * 2;
        var x = w * Math.cos(th), z = d * Math.sin(th);
        var front = Math.max(0, Math.sin(th));
        z -= front * 0.12 * d;                           // the face is flatter than a sphere
        if (v > 0.30 && v < 0.44) z += front * 0.05;     // brow ridge
        if (v > 0.52 && v < 0.70) z -= front * 0.07;     // cheek hollow

        for (var e = 0; e < 2; e++) {                    // press in the eye sockets
          var ec = EYES[e];
          var dx = (x - ec[0]) / 0.34, dy = (y - ec[1]) / 0.22, dz = (z - ec[2]) / 0.7;
          var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < 1) {
            var k = (1 - dist); k = k * k * 0.16;
            var L = Math.hypot(x, y, z) || 1;
            x -= x / L * k; y -= y / L * k * 0.35; z -= z / L * k;
          }
        }
        grid[i][j] = pts.length;
        pts.push([x, y, z]);
      }
    }

    var neckTop = pts.length;                            // neck + shoulders
    for (i = 0; i < 3; i++) {
      for (j = 0; j < LON; j++) {
        var t2 = (j / LON) * Math.PI * 2;
        var rr = [0.145, 0.155, 0.26][i];
        pts.push([Math.cos(t2) * rr, -0.70 - i * 0.16, Math.sin(t2) * rr * 0.88]);
      }
    }

    function quad(a1, b1, c1, d1) { tris.push([a1, b1, c1]); tris.push([a1, c1, d1]); }
    for (i = 0; i < LAT; i++) for (j = 0; j < LON; j++) {
      var j2 = (j + 1) % LON;
      quad(grid[i][j], grid[i][j2], grid[i + 1][j2], grid[i + 1][j]);
    }
    for (i = 0; i < 2; i++) for (j = 0; j < LON; j++) {
      var jj = (j + 1) % LON;
      quad(neckTop + i * LON + j, neckTop + i * LON + jj,
           neckTop + (i + 1) * LON + jj, neckTop + (i + 1) * LON + j);
    }
    for (j = 0; j < LON; j++) {
      var jk = (j + 1) % LON;
      quad(grid[LAT][j], grid[LAT][jk], neckTop + jk, neckTop + j);
    }

    var eyes = EYES.map(function (ec, idx) {
      var sx = idx ? 1 : -1, ring = [], tilt = sx * 0.36;
      for (var k = 0; k <= 26; k++) {
        var a2 = (k / 26) * Math.PI * 2;
        var ex = Math.cos(a2) * 0.29;
        var ey = Math.sin(a2) * 0.125 * (1 - 0.42 * Math.max(0, Math.cos(a2)) * sx);
        var rx = ex * Math.cos(tilt) - ey * Math.sin(tilt);
        var ry2 = ex * Math.sin(tilt) + ey * Math.cos(tilt);
        ring.push([ec[0] + rx, ec[1] + ry2, 0.43 + Math.cos(a2) * 0.02]);
      }
      return ring;
    });

    var marks = [
      [[-0.12, -0.52, 0.40], [0, -0.545, 0.43], [0.12, -0.52, 0.40]],
      [[-0.07, -0.28, 0.46], [-0.055, -0.33, 0.46]],
      [[0.07, -0.28, 0.46], [0.055, -0.33, 0.46]]
    ];
    return { pts: pts, tris: tris, eyes: eyes, marks: marks };
  }

  // Wide cranium, pointed chin, big slanted almond eyes.
  function buildAlien() {
    var pts = [], edges = [], LAT = 18, LON = 22, grid = [], i, j;
    for (i = 0; i <= LAT; i++) {
      grid[i] = [];
      var v = i / LAT, phi = v * Math.PI;
      // wide up top, collapsing to a point at the chin
      var taper = v < 0.36
        ? 1 + 0.16 * Math.sin((v / 0.36) * Math.PI)
        : 0.08 + 0.92 * Math.pow(1 - (v - 0.36) / 0.64, 1.25);
      for (j = 0; j < LON; j++) {
        var th = (j / LON) * Math.PI * 2;
        var rx = 1.06 * taper, ry = 1.3, rz = 0.86 * taper;
        grid[i][j] = pts.length;
        pts.push([
          rx * Math.sin(phi) * Math.cos(th),
          -ry * Math.cos(phi) + 0.1,
          rz * Math.sin(phi) * Math.sin(th)
        ]);
      }
    }
    for (i = 0; i <= LAT; i++) for (j = 0; j < LON; j++) {
      edges.push([grid[i][j], grid[i][(j + 1) % LON]]);
      if (i < LAT) edges.push([grid[i][j], grid[i + 1][j]]);
    }
    // large slanted almond eyes on the front face
    var eyes = [];
    [-1, 1].forEach(function (sx) {
      var ring = [], tilt = sx * 0.42;
      for (var k = 0; k <= 22; k++) {
        var a = (k / 22) * Math.PI * 2;
        var ex = Math.cos(a) * 0.40, ey = Math.sin(a) * 0.185;
        // taper one end so it reads as an almond, not an ellipse
        ey *= (1 - 0.45 * Math.max(0, Math.cos(a)) * sx * sx);
        var rxp = ex * Math.cos(tilt) - ey * Math.sin(tilt);
        var ryp = ex * Math.sin(tilt) + ey * Math.cos(tilt);
        ring.push([sx * 0.40 + rxp, -0.12 + ryp, 0.74]);
      }
      eyes.push(ring);
    });
    return { pts: pts, edges: edges, eyes: eyes };
  }
  var ALIEN = null;

  /* ---------------- terminal ---------------- */
  var Term = {
    el: null, out: null, input: null, radarCv: null, radarCtx: null,
    scanCv: null, scanCtx: null, open: false, mode: 'idle',
    cmds: {}, contact: 0, blips: [],

    init: function () {
      Term.el = $('#term'); Term.out = $('#term-out'); Term.input = $('#term-cmd');
      Term.radarCv = $('#radar'); Term.radarCtx = Term.radarCv.getContext('2d');
      Term.scanCv = $('#alien-scan'); Term.scanCtx = Term.scanCv.getContext('2d');
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
      [[Term.radarCv, Term.radarCtx], [Term.scanCv, Term.scanCtx]].forEach(function (p) {
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
      Term.echo('type <span class="cm">help</span> to begin — or you can type <span class="cm">alien</span>', 'dimline');
    },

    show: function () {
      Term.el.classList.add('open');
      Term.open = true;
      Aud.unlock(); Aud.hiss(true);
      setTimeout(function () { Term.sizeCanvases(); Term.input.focus(); }, 320);
      Term.glitch(0.5);
    },
    hide: function () {
      Term.el.classList.remove('open');
      Term.open = false;
      Aud.hiss(false);
      Term.endContact(true);
    },

    glitch: function (strength) {
      Term.el.classList.add('glitching');
      clearTimeout(Term._g);
      Term._g = setTimeout(function () { Term.el.classList.remove('glitching'); }, 180 + strength * 320);
    },

    run: function (raw) {
      var sp = raw.split(/\s+/), c = sp.shift().toLowerCase(), arg = sp.join(' ');
      if (Term.mode === 'contact' && c !== 'exit') {
        Term.echo('channel occupied — press <span class="cm">ESC</span> to drop the link', 'er');
        return;
      }
      if (c === 'alien') return Term.beginContact();
      if (Term.cmds[c]) return Term.cmds[c](arg);
      Term.glitch(0.3);
      Term.echo('command not found: ' + c + ' — try <span class="cm">help</span>', 'er');
    },

    /* ---- the alien contact sequence ---- */
    beginContact: function () {
      Term.mode = 'contact'; Term.contact = 0.001;
      Term.el.classList.add('contact');
      Aud.ping();
      Term.blips = [{ a: Math.random() * 6.28, r: 0.74, life: 0 }];
      Term.typeOut('scanning deep field...', 'ac', function () {
        setTimeout(function () {
          Aud.ping();
          Term.echo('<span class="er">⚠ CONTACT — unidentified return, bearing 047</span>');
          setTimeout(function () {
            Term.glitch(1); Aud.zap();
            Term.echo('<span class="ac">resolving geometry · 3D scan engaged</span>');
            Term.el.classList.add('scanning');
            setTimeout(function () {
              Aud.radio(true);
              Term.echo('<span class="er">◉ incoming transmission — unintelligible</span>');
              Term.echo('press <span class="cm">ESC</span> for lost connection', 'dimline');
            }, 1200);
          }, 700);
        }, 500);
      });
    },

    endContact: function (silent) {
      if (Term.mode !== 'contact') return;
      Term.mode = 'idle'; Term.contact = 0;
      Term.el.classList.remove('contact', 'scanning');
      Aud.radio(false);
      Term.blips = [];
      if (!silent) {
        Aud.zap(); Term.glitch(1);
        Term.echo('<span class="er">── signal lost ──</span>');
        Term.echo('carrier dropped. link returned to local.', 'dimline');
      }
    },

    /* ---- per-frame drawing ---- */
    tick: function (t, dt) {
      if (!Term.open) return;
      Term.drawRadar(t, dt);
      if (Term.mode === 'contact') {
        Term.contact = Math.min(1, Term.contact + dt * 0.9);
        Term.drawAlien(t);
        if (Math.random() < dt * 1.4) Term.glitch(0.2);
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

      var a = (t * 1.5) % 6.283;
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

      if (Term.mode !== 'contact' && Math.random() < dt * 0.5) {
        Term.blips.push({ a: Math.random() * 6.28, r: 0.25 + Math.random() * 0.65, life: 0 });
      }
      for (var k = Term.blips.length - 1; k >= 0; k--) {
        var b = Term.blips[k]; b.life += dt;
        var fade = Term.mode === 'contact' ? 1 : Math.max(0, 1 - b.life / 3.2);
        if (fade <= 0) { Term.blips.splice(k, 1); continue; }
        var bx = cx + Math.cos(b.a) * b.r * R, by = cy + Math.sin(b.a) * b.r * R;
        var hot = Term.mode === 'contact';
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

    drawAlien: function (t) {
      var ctx = Term.scanCtx, cv = Term.scanCv;
      if (!ctx || !cv._w) return;
      if (!ALIEN) ALIEN = buildAlien2();
      var w = cv._w, h = cv._h;
      ctx.clearRect(0, 0, w, h);
      var app = Math.min(1, Term.contact * 1.3);
      if (app <= 0.01) return;

      var S = Math.min(w, h) * 0.40 * app, cx = w / 2, cy = h / 2;
      var ry = Math.sin(t * 0.42) * 0.95, rx = Math.sin(t * 0.27) * 0.13;
      var cR = Math.cos(ry), sR = Math.sin(ry), cX = Math.cos(rx), sX = Math.sin(rx);

      // model -> view space (z grows away from the camera)
      function view(p) {
        var x = p[0], y = -p[1], z = p[2];
        var x1 = x * cR - z * sR, z1 = x * sR + z * cR;
        return [x1, y * cX - z1 * sX, -(y * sX + z1 * cX)];
      }
      function proj(v) { var k = 3.4 / (3.4 + v[2]); return [cx + v[0] * S * k, cy + v[1] * S * k]; }

      var V = ALIEN.pts.map(view), P = V.map(proj);

      var sy = ((t * 0.5) % 1) * h;
      var sg = ctx.createLinearGradient(0, sy - 30, 0, sy + 30);
      sg.addColorStop(0, 'rgba(90,255,200,0)');
      sg.addColorStop(0.5, 'rgba(90,255,200,.14)');
      sg.addColorStop(1, 'rgba(90,255,200,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, sy - 30, w, 60);

      // painter's algorithm with two-sided normals — no winding assumptions
      var LX = -0.42, LY = -0.55, LZ = -0.72;
      var faces = [];
      for (var i = 0; i < ALIEN.tris.length; i++) {
        var T = ALIEN.tris[i], A = V[T[0]], B = V[T[1]], C = V[T[2]];
        var ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
        var vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        var nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
        if (nz > 0) { nx = -nx; ny = -ny; nz = -nz; }     // face the camera
        faces.push([(A[2] + B[2] + C[2]) / 3, P[T[0]], P[T[1]], P[T[2]],
                    Math.max(0, nx * LX + ny * LY + nz * LZ), Math.pow(1 - Math.abs(nz), 2.8)]);
      }
      faces.sort(function (p, q) { return q[0] - p[0]; });

      for (i = 0; i < faces.length; i++) {
        var f = faces[i], my = (f[1][1] + f[2][1] + f[3][1]) / 3;
        var hot = Math.abs(my - sy) < 32 ? 0.26 : 0;
        var lum = Math.min(1.2, 0.10 + f[4] * 0.80 + f[5] * 0.42 + hot);
        ctx.fillStyle = 'rgba(' + (18 + 150 * lum | 0) + ',' + (92 + 160 * lum | 0) + ',' +
          (78 + 150 * lum | 0) + ',' + (0.95 * app) + ')';
        ctx.beginPath();
        ctx.moveTo(f[1][0], f[1][1]); ctx.lineTo(f[2][0], f[2][1]); ctx.lineTo(f[3][0], f[3][1]);
        ctx.closePath(); ctx.fill();
        if (f[5] > 0.5) {
          ctx.strokeStyle = 'rgba(190,255,235,' + (f[5] * 0.45 * app) + ')';
          ctx.lineWidth = 0.7; ctx.stroke();
        }
      }

      function facing(ring) {                              // average depth of a loop
        var z = 0; for (var k = 0; k < ring.length; k++) z += ring[k][2];
        return z / ring.length;
      }
      ALIEN.eyes.forEach(function (ring) {
        var vv = ring.map(view);
        if (facing(vv) > -0.02) return;                    // on the far side
        var pr = vv.map(proj);
        ctx.beginPath();
        pr.forEach(function (p, k) { k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
        ctx.closePath();
        ctx.fillStyle = 'rgba(3,14,12,' + (0.95 * app) + ')'; ctx.fill();
        ctx.strokeStyle = 'rgba(175,255,228,' + (0.9 * app) + ')'; ctx.lineWidth = 1.2; ctx.stroke();
        var mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
        pr.forEach(function (p) {
          mnx = Math.min(mnx, p[0]); mxx = Math.max(mxx, p[0]);
          mny = Math.min(mny, p[1]); mxy = Math.max(mxy, p[1]);
        });
        ctx.fillStyle = 'rgba(215,255,245,' + (0.78 * app) + ')';
        ctx.beginPath();
        ctx.ellipse(mnx + (mxx - mnx) * 0.3, mny + (mxy - mny) * 0.3,
          Math.max(1, (mxx - mnx) * 0.1), Math.max(1, (mxy - mny) * 0.17), -0.4, 0, 6.283);
        ctx.fill();
      });

      ctx.strokeStyle = 'rgba(12,54,44,' + (0.9 * app) + ')'; ctx.lineWidth = 1.4;
      ALIEN.marks.forEach(function (m) {
        var vv = m.map(view);
        if (facing(vv) > -0.05) return;
        var pr = vv.map(proj);
        ctx.beginPath();
        pr.forEach(function (p, k) { k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
        ctx.stroke();
      });

      ctx.fillStyle = 'rgba(120,255,200,' + (0.75 * app) + ')';
      ctx.font = '9px ui-monospace,monospace';
      ctx.fillText('MASS  ~41kg', 8, 32);
      ctx.fillText('BIO   UNKNOWN', 8, 44);
      ctx.fillText('ROT   ' + (((ry * 57.3) % 360 + 360) % 360).toFixed(0).padStart(3, '0') + '°', 8, 56);
      ctx.fillText('SCAN  ' + (Term.contact * 100).toFixed(0) + '%', 8, h - 8);
    }
  };

  root.Aud = Aud;
  root.Term = Term;
})(typeof window !== 'undefined' ? window : globalThis);

export const Aud = window.Aud;
export const Term = window.Term;
