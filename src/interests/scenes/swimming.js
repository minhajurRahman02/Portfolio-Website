/* 07 · Swimming — "Through the Surface"
   From the deep up to the light. Scroll is the ascent: the water warms and
   brightens, everything on the seabed falls away beneath you, caustics
   strengthen near the surface and the bright rippling ceiling arrives. */
import { SWIM } from '../config.js';
import { TAU, rng, lerp, ease, track, rgb, approach } from '../util.js';
import { vgrad, glow, rays } from '../paint.js';
import { baked } from '../bakery.js';
import { field } from '../particles.js';
import { push } from '../depth.js';

const WATER = [
  [0.0, '#031A2E', '#062A40'],
  [0.35, '#0A4D63', '#0E5E74'],
  [0.7, '#1B8A9E', '#3FB0C0'],
  [1.0, '#59C7D2', '#CFF6F2'],
];

export default function create() {
  let L = null;
  let fish = [];
  let cx = 0.5, cy = 0.5;

  function build(env) {
    const { W, H, mobile, pscale } = env;
    const r = rng(707);
    const kelp = Array.from({ length: Math.round(SWIM.kelp * (mobile ? 0.6 : 1)) }, () => ({ x: r() * W, h: r.range(H * 0.4, H * 0.9), w: r.range(5, 11), ph: r() * TAU, c: r.pick(['#6E7A36', '#7E8A3E', '#5E6E30', '#8A8E46']) }));
    const bubbles = field({ n: Math.round(SWIM.bubbles * pscale), seed: 11, box: [0, 0, W, H], vx: [-6, 6], vy: [-120, -50], size: [1.5, 6], life: [3, 7], color: '#DFFFFF', style: 'ring', wobble: 14, fadeIn: 0.1 });
    const snow = field({ n: Math.round(SWIM.snow * pscale), seed: 12, box: [0, 0, W, H], vx: [-3, 3], vy: [-4, 8], size: [0.5, 1.5], life: [6, 12], color: '#BFE8E8', style: 'dot', wobble: 4, alpha: 0.6 });
    fish = Array.from({ length: Math.round(SWIM.fish * (mobile ? 0.6 : 1)) }, () => ({ x: W * r.range(0.3, 0.7), y: H * r.range(0.4, 0.6), vx: r.range(-30, 30), vy: r.range(-10, 10), s: r.range(0.7, 1.2), tone: r() }));
    L = { W, H, env, kelp, bubbles, snow, scratch: null, ready: false };
    attach();
  }

  /** rocks, seabed, foreground and caustic frames are painted off-thread (bakery.js) */
  function attach() {
    const P = baked('swimming', L.env);
    if (P) { Object.assign(L, P); L.ready = true; }
  }

  function update(s) {
    if (!L) return;
    if (!L.ready) attach();
    const dt = Math.min(s.dt, 0.05);
    L.bubbles.update(dt);
    L.snow.update(dt);
    // a simple school: steer toward a wandering point, keep apart, flee the cursor
    const k = approach(1.5, dt);
    cx += (0.5 + 0.22 * Math.sin(s.t * 0.21) - cx) * k;
    cy += (0.52 + 0.1 * Math.sin(s.t * 0.33) - cy) * k;
    const tx = cx * s.W, ty = cy * s.H;
    for (let i = 0; i < fish.length; i++) {
      const f = fish[i];
      let ax = (tx - f.x) * 0.25, ay = (ty - f.y) * 0.25;
      for (let j = i + 1; j < Math.min(fish.length, i + 8); j++) {
        const g = fish[j], dx = f.x - g.x, dy = f.y - g.y, d2 = dx * dx + dy * dy;
        if (d2 < 900 && d2 > 0.01) { const m = 900 / d2; ax += dx * m * 0.6; ay += dy * m * 0.6; g.vx -= dx * m * 0.6 * dt; g.vy -= dy * m * 0.6 * dt; }
      }
      if (s.ptr) {
        const dx = f.x - s.px, dy = f.y - s.py, d = Math.hypot(dx, dy);
        if (d < 150) { ax += (dx / (d + 1)) * 2400; ay += (dy / (d + 1)) * 2400; }
      }
      f.vx += ax * dt; f.vy += ay * dt;
      const sp = Math.hypot(f.vx, f.vy), max = 160;
      if (sp > max) { f.vx *= max / sp; f.vy *= max / sp; }
      f.x += f.vx * dt; f.y += f.vy * dt;
    }
  }

  function causticLayer(ctx, img, y, w, h, t, a) {
    // stamp the caustic pattern onto a baked layer only, via a scratch canvas
    if (!L.scratch || L.scratch.width !== img.width || L.scratch.height !== img.height) {
      L.scratch = document.createElement('canvas'); L.scratch.width = img.width; L.scratch.height = img.height; L.scratch.x = L.scratch.getContext('2d');
    }
    const c = L.scratch, x = c.x;
    x.globalCompositeOperation = 'copy';
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.globalAlpha = a;
    const fr = L.caustics[Math.floor(t * 9) % L.caustics.length];
    const pat = x.createPattern(fr, 'repeat');
    const sc = (img.width / img.w) * 2.2;
    pat.setTransform && pat.setTransform(new DOMMatrix().scale(sc, sc));
    x.fillStyle = pat;
    x.globalCompositeOperation = 'lighter';
    x.fillRect(0, 0, c.width, c.height);
    // keep the light inside the stone shapes
    x.globalCompositeOperation = 'destination-in';
    x.globalAlpha = 1;
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-over';
    ctx.drawImage(c, 0, y, w, h);
  }

  function draw(ctx, s) {
    if (!L) return;
    const { W, H, p, t } = s;
    const deep = track(WATER, p, 1), shallow = track(WATER, p, 2);
    const rise = (d) => p * H * 1.25 * d; // things fall away beneath you as you climb
    const surfY = lerp(-H * 0.55, H * 0.1, ease(SWIM.surfaceAt - 0.35, 1, p));

    ctx.fillStyle = vgrad(ctx, 0, 0, H, [[0, rgb(shallow)], [1, rgb(deep)]]);
    ctx.fillRect(0, 0, W, H);

    /* the surface seen from below */
    const sa = ease(0.4, 1, p);
    if (surfY > -H * 0.5) {
      ctx.fillStyle = vgrad(ctx, 0, surfY - H * 0.3, surfY + H * 0.12, [[0, 'rgba(240,255,250,0)'], [0.6, `rgba(220,252,248,${0.55 * sa})`], [1, 'rgba(200,245,245,0)']]);
      ctx.fillRect(0, surfY - H * 0.3, W, H * 0.42);
      ctx.strokeStyle = `rgba(255,255,255,${0.35 * sa})`;
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 7; k++) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 14) {
          const y = surfY - k * 9 + Math.sin(x * 0.02 + t * 2 + k) * 4 + Math.sin(x * 0.007 - t * 1.3 + k * 2) * 6;
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      glow(ctx, W * 0.5, surfY - H * 0.05, W * 0.45, '#F4FFE8', 0.45 * sa);
    }
    rays(ctx, W * 0.5, surfY - H * 0.1, Math.PI / 2, 1.1, H * 1.4, '#E8FFF6', 0.09 + sa * 0.16, 12, 7, t);

    /* far rock arches and kelp silhouettes */
    const a0 = push(s, 0.08);
    if (L.ready) ctx.drawImage(L.arches, a0.x, H * 0.3 + rise(0.08) + a0.y, W, L.arches.h);
    ctx.fillStyle = `rgba(${deep.map((v) => v | 0)},${0.22})`;
    ctx.fillRect(0, 0, W, H);

    /* stone with caustics, stronger near the surface */
    const a1 = push(s, 0.2);
    if (L.ready) causticLayer(ctx, L.stones, H * 0.5 + rise(0.2) + a1.y, W, L.stones.h, t, 0.25 + sa * 0.6);

    /* kelp, swaying */
    const a2 = push(s, 0.4);
    const base = H * 1.02 + rise(0.4) + a2.y;
    for (const k of L.kelp) {
      // giant kelp: a thin stipe swaying with the swell, and long wavy
      // blades off it, each on a small gas bladder; olive-gold, translucent
      const spine = [];
      for (let j = 0; j <= 16; j++) {
        const u = j / 16;
        spine.push([k.x + a2.x + Math.sin(t * 0.9 + k.ph + u * 3) * 26 * u + Math.sin(t * 0.4 + k.ph) * 12 * u, base - k.h * u]);
      }
      ctx.strokeStyle = '#3A4A22'; ctx.lineWidth = Math.max(1.5, k.w * 0.28); ctx.lineCap = 'round';
      ctx.beginPath(); spine.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      for (let j = 1; j < spine.length; j++) {
        const [lx, ly] = spine[j];
        const sd = j % 2 ? 1 : -1;
        const len = k.w * (7 + Math.sin(j * 2.3 + k.ph) * 1.6) * (1 - j / 30);
        const wv = Math.sin(t * 1.6 + j + k.ph);
        const ex = lx + sd * len, ey = ly - len * 0.5 + wv * 5;
        const g = ctx.createLinearGradient(lx, ly, ex, ey);
        g.addColorStop(0, 'rgba(70,84,36,.95)'); g.addColorStop(0.6, k.c); g.addColorStop(1, 'rgba(170,176,96,.7)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.bezierCurveTo(lx + sd * len * 0.3, ly - len * 0.35 + wv * 3, lx + sd * len * 0.7, ly - len * 0.15 - wv * 4, ex, ey);
        ctx.bezierCurveTo(lx + sd * len * 0.6, ly + len * 0.12 - wv * 2, lx + sd * len * 0.25, ly + len * 0.14, lx, ly + 3);
        ctx.fill();
        ctx.fillStyle = '#8A8A48'; ctx.beginPath(); ctx.arc(lx + sd * 2, ly, Math.max(1.2, k.w * 0.22), 0, TAU); ctx.fill();
      }
    }
    /* a sea turtle gliding through the middle distance */
    {
      const tu = ((t * 0.018 + 0.3) % 1.3) - 0.15;
      const tx = tu * W, ty = H * 0.34 + rise(0.25) * 0.4 + Math.sin(t * 0.5) * 12;
      const ts = Math.min(W, H) * 0.065;
      const fl = Math.sin(t * 1.8);
      ctx.save(); ctx.translate(tx, ty); ctx.globalAlpha = 0.92;
      ctx.fillStyle = `rgba(${(deep[0] * 0.5 + 10) | 0},${(deep[1] * 0.55 + 30) | 0},${(deep[2] * 0.55 + 24) | 0},1)`;
      ctx.beginPath(); ctx.moveTo(-ts * 0.3, -ts * 0.1); ctx.quadraticCurveTo(-ts * 1.2, -ts * (0.9 + fl * 0.4), -ts * 1.5, -ts * (0.4 + fl * 0.5)); ctx.quadraticCurveTo(-ts * 0.9, -ts * 0.1, -ts * 0.1, ts * 0.1); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, ts, ts * 0.55, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(ts * 1.05, -ts * 0.05, ts * 0.28, ts * 0.2, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-ts * 0.2, ts * 0.2); ctx.quadraticCurveTo(-ts * 0.8, ts * (0.9 - fl * 0.3), -ts * 1.1, ts * (0.5 - fl * 0.3)); ctx.quadraticCurveTo(-ts * 0.6, ts * 0.3, ts * 0.1, ts * 0.3); ctx.fill();
      // shell plates: a central row and two flanking rows, edged lighter
      ctx.strokeStyle = 'rgba(200,250,240,.18)'; ctx.lineWidth = 1;
      for (const [px, py, rx, ry] of [[-ts * 0.45, 0, ts * 0.22, ts * 0.16], [0, 0, ts * 0.24, ts * 0.18], [ts * 0.45, 0, ts * 0.2, ts * 0.15], [-ts * 0.25, -ts * 0.3, ts * 0.22, ts * 0.12], [ts * 0.25, -ts * 0.3, ts * 0.22, ts * 0.12], [-ts * 0.25, ts * 0.3, ts * 0.22, ts * 0.12], [ts * 0.25, ts * 0.3, ts * 0.22, ts * 0.12]]) {
        ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, 0, TAU); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(200,250,240,.3)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, ts, ts * 0.55, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.restore();
    }

    /* the school of fish */
    const a3 = push(s, 0.7);
    for (const f of fish) {
      const ang = Math.atan2(f.vy, f.vx);
      const x = f.x + a3.x, y = f.y + rise(0.1) * 0.2 + a3.y, sz = 7 * f.s;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      // countershaded like a real baitfish: dark back, silver flank, a glint
      const up = Math.cos(ang) >= 0 ? -1 : 1;
      ctx.fillStyle = f.tone < 0.5 ? '#8FB4C0' : '#A9C8CE';
      ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * 0.38, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3E6274';
      ctx.beginPath(); ctx.ellipse(0, up * sz * 0.12, sz * 0.92, sz * 0.22, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-sz * 0.8, 0); ctx.lineTo(-sz * 1.5, -sz * 0.45); ctx.lineTo(-sz * 1.3, 0); ctx.lineTo(-sz * 1.5, sz * 0.45); ctx.fill();
      ctx.fillStyle = 'rgba(235,250,255,.75)'; ctx.fillRect(-sz * 0.5, -up * sz * 0.06, sz * 1.1, sz * 0.09);
      ctx.fillStyle = '#0E1A20'; ctx.beginPath(); ctx.arc(sz * 0.62, up * sz * 0.04, sz * 0.09, 0, TAU); ctx.fill();
      ctx.restore();
    }
    if (L.ready) ctx.drawImage(L.near, a3.x, H * 0.62 + rise(0.7) + a3.y, W, L.near.h);

    L.snow.draw(ctx, 0.8);
    L.bubbles.draw(ctx, 0.9);

    const a4 = push(s, 1.3);
    if (L.ready) ctx.drawImage(L.fg, a4.x, rise(1.3) * 0.6 + a4.y, W, H);
    // depth vignette that lifts as you rise
    const vg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.8);
    vg.addColorStop(0, 'rgba(0,10,20,0)'); vg.addColorStop(1, `rgba(0,10,20,${0.55 * (1 - p)})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  return {
    build, update, draw,
    dispose() { L = null; },
    crane: () => null,
  };
}
