/* ============================================================
   SKY — the background engine.
   Layer 1 (WebGL): nebula smoke, domain-warped fbm.
   Layer 2 (canvas): stars, comets, planets, galaxy.
   One palette drives both. Journey mode interpolates palettes
   across scroll for the /interests page.
   ============================================================ */
(function (root) {
  'use strict';

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  function mixArr(a, b, t, out) { for (var i = 0; i < 3; i++) out[i] = lerp(a[i], b[i], t); return out; }
  function hex(h) {
    return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  }

  // ---- palettes -------------------------------------------------------
  function P(bg, c1, c2, c3, star, smoke, stars) {
    return { bg: hex(bg), c1: hex(c1), c2: hex(c2), c3: hex(c3), star: hex(star), smoke: smoke, stars: stars };
  }

  var PAL = {
    // night: darker and less violet than the first pass, but the smoke
    // still has to read as smoke
    dark: P('#06060F', '#18214C', '#3B2E74', '#115A6E', '#CFE4FF', 1.0, 1.0),
    // the cleared sky — almost no smoke, deep black, everything visible
    clear: P('#010208', '#05071A', '#0B0A24', '#041420', '#E6F2FF', 0.16, 1.0),
    light: P('#EDF0F9', '#C5D0F2', '#FBD3B8', '#BCE3F0', '#7A86B8', 0.95, 0.0),
    lightClear: P('#E6EBF7', '#B6C3EC', '#F6DCC6', '#AFDAEB', '#5E6B9E', 0.34, 0.25)
  };

  // /interests scroll journey: deep space -> dawn -> noon
  var JOURNEY = [
    P('#010206', '#05071A', '#0A0C22', '#030A16', '#EAF4FF', 0.22, 1.00),
    P('#050A1E', '#101A3C', '#1F2154', '#0A2038', '#DCEBFF', 0.50, 0.80),
    P('#1A1434', '#3A2250', '#6B3A5A', '#2A2A55', '#FFE3D8', 0.85, 0.42),
    P('#48283E', '#8C4A46', '#DE8C4E', '#6B4060', '#FFE9C8', 1.00, 0.12),
    P('#8BA6C8', '#BACCE0', '#F2D4AE', '#A6C3D8', '#FFFFFF', 0.70, 0.00),
    P('#BBDEF2', '#DBEDF8', '#F8F4DD', '#CBE7F0', '#FFFFFF', 0.34, 0.00)
  ];

  // ---- shader ---------------------------------------------------------
  var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision highp float;',
    'uniform vec2 u_res;uniform float u_time;uniform vec2 u_mouse;',
    'uniform float u_amp,u_smoke,u_horizon,u_vig;uniform vec3 cbg,c1,c2,c3;',
    'vec2 hash(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
    ' return mix(mix(dot(hash(i),f),dot(hash(i+vec2(1,0)),f-vec2(1,0)),u.x),',
    '  mix(dot(hash(i+vec2(0,1)),f-vec2(0,1)),dot(hash(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/u_res.xy;',
    ' vec2 p=(gl_FragCoord.xy-.5*u_res.xy)/u_res.y;',
    ' float t=u_time*.042;',
    ' vec2 q=vec2(fbm(p*1.35+vec2(0.,t)),fbm(p*1.35+vec2(5.2,t*1.15)));',
    ' vec2 r=vec2(fbm(p*1.35+3.4*q+vec2(1.7,9.2)+t*.6),fbm(p*1.35+3.4*q+vec2(8.3,2.8)+t*.5));',
    ' float f=fbm(p*1.35+3.4*r);',
    ' vec2 mp=(u_mouse-.5)*vec2(u_res.x/u_res.y,1.)*2.;',
    ' f+=(1.-smoothstep(0.,1.0,length(p-mp)))*.26*(.5+u_amp);',
    ' vec3 col=mix(cbg,c1,clamp(f*1.35+.3,0.,1.));',
    ' col=mix(col,c2,clamp(length(q)*.82,0.,1.));',
    ' col=mix(col,c3,clamp(r.x*.62+.06,0.,1.));',
    ' col=mix(cbg,col,u_smoke);',                       // smoke density
    ' float horizon=mix(1.,smoothstep(-.55,.9,uv.y),u_horizon);',
    ' col*=mix(1.,horizon,.42);',                        // far sky darker
    ' col*=mix(1.,clamp(1.-length(uv-vec2(.5,.46))*.56,.46,1.),u_vig);', // vignette
    ' gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  // ---- state ----------------------------------------------------------
  var gl, U = {}, ok = false, cv, sCv, sCtx;
  var cur = {
    bg: PAL.dark.bg.slice(), c1: PAL.dark.c1.slice(), c2: PAL.dark.c2.slice(),
    c3: PAL.dark.c3.slice(), star: PAL.dark.star.slice(), smoke: 1, stars: 1
  };
  var tgt = PAL.dark;
  var light = false, clearAmt = 0, clearTgt = 0, journey = null;
  var vel = 0, mx = 0.5, my = 0.5, mxC = 0.5, myC = 0.5, scrollY = 0;
  var W = 0, H = 0, DPR = 1;
  var hidden = 0, hiddenTgt = 0;          // 1 = sky fully handed over to video
  var px = -9999, py = -9999;             // cursor, in CSS pixels

  var stars = [], comets = [], planets = [], galaxy = [];

  function buildField() {
    stars = [];
    var n = Math.round(clamp(W * H / 2600, 260, 1100));
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random(), y: Math.random(),
        z: Math.random(),                       // depth: parallax + size
        r: Math.random() * 1.15 + 0.22,
        tw: Math.random() * 6.28,
        ts: 0.4 + Math.random() * 1.6,
        // only a subset is visible before the sky is cleared
        base: Math.random(),
        ox: 0, oy: 0                            // cursor-pull offset, px
      });
    }
    planets = [
      { x: 0.80, y: 0.22, r: 0.085, hue: [0.44, 0.38, 0.72], ring: true, spin: 0.06 },
      { x: 0.14, y: 0.70, r: 0.052, hue: [0.78, 0.46, 0.33], ring: false, spin: -0.04 },
      { x: 0.58, y: 0.86, r: 0.030, hue: [0.35, 0.62, 0.70], ring: false, spin: 0.09 }
    ];
    galaxy = [];
    for (var g = 0; g < 320; g++) {
      var arm = g % 2, a = (g / 320) * 6.2 + arm * Math.PI;
      var rad = Math.pow(g / 320, 0.62) * 0.9;
      galaxy.push({ a: a + rad * 2.6, r: rad, s: Math.random() * 0.9 + 0.25 });
    }
  }

  function size() {
    W = innerWidth; H = innerHeight;
    DPR = Math.min(devicePixelRatio || 1, 1.75);
    if (ok) {
      cv.width = Math.floor(W * DPR); cv.height = Math.floor(H * DPR);
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(U.u_res, cv.width, cv.height);
    }
    if (sCtx) {
      sCv.width = Math.floor(W * DPR); sCv.height = Math.floor(H * DPR);
      sCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    buildField();
  }

  function initGL(canvas) {
    cv = canvas;
    try { gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }); } catch (e) { return; }
    if (!gl) return;
    function sh(ty, src) {
      var s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS);
    if (!v || !f) return;
    var pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['u_res', 'u_time', 'u_mouse', 'u_amp', 'u_smoke', 'u_horizon', 'u_vig', 'cbg', 'c1', 'c2', 'c3']
      .forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
    ok = true;
  }

  // ---- comets ---------------------------------------------------------
  function spawnComet(force) {
    var edge = Math.random();
    var c = {
      x: edge < 0.5 ? -0.1 : Math.random(), y: edge < 0.5 ? Math.random() * 0.6 : -0.1,
      vx: 0.22 + Math.random() * 0.4, vy: 0.14 + Math.random() * 0.3,
      life: 0, max: 1.6 + Math.random() * 1.4,
      len: 70 + Math.random() * 150, w: 0.7 + Math.random() * 1.5,
      big: force === true || Math.random() < 0.18
    };
    if (c.big) { c.len *= 1.8; c.w *= 2.1; }
    comets.push(c);
  }

  // ---- drawing --------------------------------------------------------
  function drawStars(t, dt) {
    if (!sCtx) return;
    sCtx.clearRect(0, 0, W, H);
    var vis = cur.stars;
    if (vis <= 0.004 && clearAmt < 0.01) return;

    // parallax from page scroll
    var py = scrollY;

    // galaxy + planets only once the sky starts clearing
    if (clearAmt > 0.02) {
      drawGalaxy(t);
      drawPlanets(t);
    }

    var PR = 260, PR2 = PR * PR;              // cursor pull radius
    var kPull = 1 - Math.pow(0.0015, dt / 0.6);
    var col = 'rgb(' + (cur.star[0] * 255 | 0) + ',' + (cur.star[1] * 255 | 0) + ',' + (cur.star[2] * 255 | 0) + ')';

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      // before clearing only the brightest ~45% show
      if (s.base >= 0.45 + 0.55 * clearAmt) continue;
      var y = (s.y - (py * (0.02 + s.z * 0.07)) / H) % 1;
      if (y < 0) y += 1;
      var bx = s.x * W, by = y * H;

      // cursor attraction: nearer stars are pulled harder, far ones ignore it
      var tx = 0, ty = 0;
      var dx = px - bx, dy = py - by, d2 = dx * dx + dy * dy;
      if (d2 < PR2) {
        var f = (1 - Math.sqrt(d2) / PR);
        f = f * f * (0.3 + s.z * 0.7) * 34;
        var dd = Math.sqrt(d2) || 1;
        tx = dx / dd * f; ty = dy / dd * f;
      }
      s.ox += (tx - s.ox) * kPull; s.oy += (ty - s.oy) * kPull;
      bx += s.ox; by += s.oy;

      var tw = 0.55 + 0.45 * Math.sin(t * s.ts + s.tw);
      var a = vis * tw * (0.25 + s.z * 0.75) * (0.55 + 0.45 * clearAmt);
      if (a <= 0.012) continue;
      var r = s.r * (1 + clearAmt * 0.45) * (0.6 + s.z * 0.8);
      sCtx.globalAlpha = Math.min(a, 1);
      sCtx.fillStyle = col;
      sCtx.beginPath(); sCtx.arc(bx, by, r, 0, 6.283); sCtx.fill();
      // a few get a cross flare once the sky is clear
      if (clearAmt > 0.5 && s.z > 0.93) {
        sCtx.globalAlpha = a * 0.4 * clearAmt;
        sCtx.fillRect(bx - r * 5, by - 0.4, r * 10, 0.8);
        sCtx.fillRect(bx - 0.4, by - r * 5, 0.8, r * 10);
      }
    }
    sCtx.globalAlpha = 1;
    drawComets(t, dt);
  }

  function drawGalaxy(t) {
    var cx = W * 0.22, cy = H * 0.28, sc = Math.min(W, H) * 0.19;
    var a0 = t * 0.012;
    sCtx.save();
    sCtx.globalAlpha = clearAmt * 0.5;
    var gr = sCtx.createRadialGradient(cx, cy, 0, cx, cy, sc * 1.25);
    gr.addColorStop(0, 'rgba(188,170,255,.5)');
    gr.addColorStop(0.45, 'rgba(110,96,210,.17)');
    gr.addColorStop(1, 'rgba(60,50,140,0)');
    sCtx.fillStyle = gr;
    sCtx.beginPath(); sCtx.ellipse(cx, cy, sc * 1.25, sc * 0.6, -0.42, 0, 6.283); sCtx.fill();
    for (var i = 0; i < galaxy.length; i++) {
      var p = galaxy[i], a = p.a + a0;
      var x = cx + Math.cos(a) * p.r * sc * 1.15, y = cy + Math.sin(a) * p.r * sc * 0.56;
      var rx = (x - cx) * Math.cos(-0.42) - (y - cy) * Math.sin(-0.42) + cx;
      var ry = (x - cx) * Math.sin(-0.42) + (y - cy) * Math.cos(-0.42) + cy;
      sCtx.globalAlpha = clearAmt * (0.75 - p.r * 0.5) * p.s;
      sCtx.fillStyle = p.r < 0.3 ? '#FFF4E0' : '#C3C8FF';
      sCtx.fillRect(rx, ry, 1.3, 1.3);
    }
    sCtx.restore();
  }

  function drawPlanets(t) {
    for (var i = 0; i < planets.length; i++) {
      var p = planets[i];
      var R = p.r * Math.min(W, H);
      var x = p.x * W, y = p.y * H - (scrollY * 0.03) % H;
      sCtx.save();
      sCtx.globalAlpha = clearAmt;
      // body
      var g = sCtx.createRadialGradient(x - R * 0.35, y - R * 0.38, R * 0.1, x, y, R);
      g.addColorStop(0, 'rgba(' + (p.hue[0] * 255 | 0) + ',' + (p.hue[1] * 255 | 0) + ',' + (p.hue[2] * 255 | 0) + ',1)');
      g.addColorStop(0.62, 'rgba(' + (p.hue[0] * 140 | 0) + ',' + (p.hue[1] * 140 | 0) + ',' + (p.hue[2] * 150 | 0) + ',1)');
      g.addColorStop(1, 'rgba(6,6,16,1)');
      sCtx.fillStyle = g;
      sCtx.beginPath(); sCtx.arc(x, y, R, 0, 6.283); sCtx.fill();
      // banding
      sCtx.globalAlpha = clearAmt * 0.22;
      sCtx.strokeStyle = 'rgba(255,255,255,.5)';
      for (var k = -2; k <= 2; k++) {
        sCtx.beginPath();
        sCtx.ellipse(x, y + k * R * 0.3, R * Math.sqrt(Math.max(0.02, 1 - (k * 0.3) * (k * 0.3))), R * 0.055, 0, 0, 6.283);
        sCtx.stroke();
      }
      if (p.ring) {
        sCtx.globalAlpha = clearAmt * 0.6;
        sCtx.strokeStyle = 'rgba(220,210,255,.65)';
        sCtx.lineWidth = R * 0.075;
        sCtx.beginPath(); sCtx.ellipse(x, y, R * 1.75, R * 0.42, -0.38 + t * p.spin * 0.04, 0, 6.283); sCtx.stroke();
        sCtx.globalAlpha = clearAmt * 0.3; sCtx.lineWidth = R * 0.03;
        sCtx.beginPath(); sCtx.ellipse(x, y, R * 2.1, R * 0.5, -0.38 + t * p.spin * 0.04, 0, 6.283); sCtx.stroke();
      }
      sCtx.restore();
    }
  }

  function drawComets(t, dt) {
    var rate = (0.14 + clearAmt * 0.5) * dt;
    if (Math.random() < rate) spawnComet();
    for (var i = comets.length - 1; i >= 0; i--) {
      var c = comets[i];
      c.life += dt;
      c.x += c.vx * dt * 0.22; c.y += c.vy * dt * 0.22;
      if (c.life > c.max || c.x > 1.25 || c.y > 1.25) { comets.splice(i, 1); continue; }
      var k = c.life / c.max;
      var a = Math.sin(Math.PI * k) * (0.55 + clearAmt * 0.45);
      var x = c.x * W, y = c.y * H;
      var dx = -c.vx, dy = -c.vy, m = Math.hypot(dx, dy) || 1;
      var tx = x + dx / m * c.len, ty = y + dy / m * c.len;
      var g = sCtx.createLinearGradient(x, y, tx, ty);
      g.addColorStop(0, 'rgba(226,244,255,' + a + ')');
      g.addColorStop(0.35, 'rgba(150,196,255,' + a * 0.4 + ')');
      g.addColorStop(1, 'rgba(120,150,255,0)');
      sCtx.strokeStyle = g; sCtx.lineWidth = c.w; sCtx.lineCap = 'round';
      sCtx.beginPath(); sCtx.moveTo(x, y); sCtx.lineTo(tx, ty); sCtx.stroke();
      sCtx.globalAlpha = a; sCtx.fillStyle = '#F2F8FF';
      sCtx.beginPath(); sCtx.arc(x, y, c.w * 0.95, 0, 6.283); sCtx.fill();
      sCtx.globalAlpha = 1;
    }
  }

  // ---- public ---------------------------------------------------------
  var Sky = {
    init: function (glCanvas, starCanvas) {
      initGL(glCanvas);
      sCv = starCanvas; sCtx = sCv ? sCv.getContext('2d') : null;
      size();
      addEventListener('resize', size);
    },
    setTheme: function (isLight) {
      light = isLight;
      Sky._retarget();
    },
    setClear: function (v) { clearTgt = clamp(v, 0, 1); },
    clearAmount: function () { return clearAmt; },
    setJourney: function (p) { journey = p; Sky._retarget(); },
    setVel: function (v) { vel = v; },
    setScroll: function (y) { scrollY = y; },
    setMouse: function (x, y) { mx = x; my = y; },
    // cursor in CSS pixels — drives the star attraction
    setPointer: function (x, y) { px = x; py = y; },
    // 1 hands the whole backdrop over to a video layer
    setHidden: function (v) { hiddenTgt = v ? 1 : 0; },
    burstComets: function (n) { for (var i = 0; i < (n || 3); i++) spawnComet(true); },

    _retarget: function () {
      if (journey != null) {
        var n = JOURNEY.length - 1, f = clamp(journey, 0, 1) * n;
        var i = Math.min(Math.floor(f), n - 1), k = f - i;
        var a = JOURNEY[i], b = JOURNEY[i + 1];
        tgt = {
          bg: mixArr(a.bg, b.bg, k, [0, 0, 0]), c1: mixArr(a.c1, b.c1, k, [0, 0, 0]),
          c2: mixArr(a.c2, b.c2, k, [0, 0, 0]), c3: mixArr(a.c3, b.c3, k, [0, 0, 0]),
          star: mixArr(a.star, b.star, k, [0, 0, 0]),
          smoke: lerp(a.smoke, b.smoke, k), stars: lerp(a.stars, b.stars, k)
        };
      } else {
        var base = light ? PAL.light : PAL.dark;
        var cl = light ? PAL.lightClear : PAL.clear;
        tgt = {
          bg: mixArr(base.bg, cl.bg, clearAmt, [0, 0, 0]),
          c1: mixArr(base.c1, cl.c1, clearAmt, [0, 0, 0]),
          c2: mixArr(base.c2, cl.c2, clearAmt, [0, 0, 0]),
          c3: mixArr(base.c3, cl.c3, clearAmt, [0, 0, 0]),
          star: mixArr(base.star, cl.star, clearAmt, [0, 0, 0]),
          smoke: lerp(base.smoke, cl.smoke, clearAmt),
          stars: lerp(base.stars, cl.stars, clearAmt)
        };
      }
    },

    tick: function (t, dt, frozen) {
      hidden = lerp(hidden, hiddenTgt, 1 - Math.pow(0.0015, dt / 1.4));
      if (cv) cv.style.opacity = (1 - hidden).toFixed(3);
      if (sCv) sCv.style.opacity = (1 - hidden).toFixed(3);
      if (hidden > 0.985) return;               // video owns the screen

      var kSlow = 1 - Math.pow(0.0015, dt / 1.1);
      var kClear = 1 - Math.pow(0.0015, dt / 2.6);
      var before = clearAmt;
      clearAmt = lerp(clearAmt, clearTgt, kClear);
      if (Math.abs(clearAmt - before) > 0.0004 || journey != null) Sky._retarget();

      mxC = lerp(mxC, mx, 1 - Math.pow(0.0015, dt / 0.5));
      myC = lerp(myC, my, 1 - Math.pow(0.0015, dt / 0.5));

      ['bg', 'c1', 'c2', 'c3', 'star'].forEach(function (k) {
        for (var i = 0; i < 3; i++) cur[k][i] = lerp(cur[k][i], tgt[k][i], kSlow);
      });
      cur.smoke = lerp(cur.smoke, tgt.smoke, kSlow);
      cur.stars = lerp(cur.stars, tgt.stars, kSlow);

      if (ok) {
        gl.uniform1f(U.u_time, frozen ? 12.0 : t);
        gl.uniform2f(U.u_mouse, mxC, myC);
        gl.uniform1f(U.u_amp, clamp(Math.abs(vel) / 26, 0, 1.3));
        gl.uniform1f(U.u_smoke, cur.smoke);
        // as the journey reaches daylight, back off the vignette and the
        // horizon shading — both read as grime on a bright sky
        // A vignette that reads as depth on a night sky reads as dirt on a
        // bright one, so it eases off for daylight and for light mode.
        var day = journey != null ? clamp((journey - 0.42) / 0.58, 0, 1) : 0;
        var base = light ? 0.42 : 1;
        gl.uniform1f(U.u_horizon, journey != null ? 0.85 * (1 - day * 0.8) : base);
        gl.uniform1f(U.u_vig, journey != null ? 1 - day * 0.85 : base);
        gl.uniform3fv(U.cbg, cur.bg); gl.uniform3fv(U.c1, cur.c1);
        gl.uniform3fv(U.c2, cur.c2); gl.uniform3fv(U.c3, cur.c3);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      drawStars(t, frozen ? 0.0001 : dt);
    }
  };

  root.Sky = Sky;
})(typeof window !== 'undefined' ? window : globalThis);

export const Sky = window.Sky;
export default Sky;
