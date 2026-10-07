/* 07 · Swimming — "Through the Surface"
   From the deep up to the light. Scroll is the ascent: the water warms and
   brightens, everything on the seabed falls away beneath you, caustics
   strengthen near the surface and the bright rippling ceiling arrives. */
import { SWIM } from '../config.js';
import { TAU, rng, clamp, lerp, ease, inv, bake, blurred, track, rgb, hex2rgb, mixRGB, approach } from '../util.js';
import { vgrad, glow, rays, ridge, speckle, frond } from '../paint.js';
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

  /* animated caustic texture: interference of travelling waves, thresholded */
  function causticFrames(n = 16, S = 128) {
    const out = [];
    const dirs = Array.from({ length: 5 }, (_, i) => { const a = (i / 5) * Math.PI + 0.3; return [Math.cos(a), Math.sin(a)]; });
    for (let f = 0; f < n; f++) {
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const x = c.getContext('2d');
      const im = x.createImageData(S, S);
      const ph = (f / n) * TAU;
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        let v = 0;
        for (let k = 0; k < 5; k++) {
          const [dx, dy] = dirs[k];
          v += Math.sin(((i * dx + j * dy) / S) * TAU * (2 + (k % 3)) + ph * (k % 2 ? 1 : -1) + k);
        }
        const b = Math.pow(Math.max(0, 1 - Math.abs(v) / 1.6), 4);
        const q = (j * S + i) * 4;
        im.data[q] = 230; im.data[q + 1] = 255; im.data[q + 2] = 240; im.data[q + 3] = Math.round(b * 255);
      }
      x.putImageData(im, 0, 0);
      out.push(c);
    }
    return out;
  }

  function build(env) {
    const { W, H, dpr, mobile, pscale } = env;
    const r = rng(707);

    const arches = bake(W, H * 0.7, dpr, (x, w, h) => {
      ridge(x, w, h, { base: h * 0.7, amp: h * 0.18, seed: 71, oct: 4, fill: 'rgba(8,40,60,.75)' });
      x.fillStyle = 'rgba(8,40,60,.75)';
      for (let k = 0; k < 3; k++) {
        const ax = w * (0.15 + k * 0.33), aw = w * 0.16, ah = h * 0.4;
        x.beginPath(); x.moveTo(ax - aw / 2, h * 0.7); x.quadraticCurveTo(ax - aw / 2, h * 0.7 - ah, ax, h * 0.7 - ah); x.quadraticCurveTo(ax + aw / 2, h * 0.7 - ah, ax + aw / 2, h * 0.7);
        x.lineTo(ax + aw * 0.3, h * 0.7); x.quadraticCurveTo(ax + aw * 0.3, h * 0.7 - ah * 0.7, ax, h * 0.7 - ah * 0.72); x.quadraticCurveTo(ax - aw * 0.3, h * 0.7 - ah * 0.7, ax - aw * 0.3, h * 0.7); x.closePath(); x.fill();
      }
      for (let k = 0; k < 20; k++) { const kx = r() * w; x.strokeStyle = 'rgba(10,50,60,.7)'; x.lineWidth = r.range(3, 7); x.beginPath(); x.moveTo(kx, h); x.quadraticCurveTo(kx + r.range(-30, 30), h * 0.6, kx + r.range(-20, 20), h * r.range(0.2, 0.5)); x.stroke(); }
    });

    const stones = bake(W, H * 0.6, dpr, (x, w, h) => {
      const top = ridge(x, w, h, { base: h * 0.55, amp: h * 0.2, seed: 72, oct: 5, sharp: 0.3, fill: vgrad(x, 0, h * 0.3, h, [[0, '#2E5A62'], [1, '#173A44']]) });
      for (let k = 0; k < 14; k++) {
        const sx = r() * w, sy = top(sx / w) + r.range(-10, 30), sw = r.range(40, 120), sh = sw * r.range(0.4, 0.8);
        x.fillStyle = r.pick(['#3A6870', '#2F5C64', '#456F74']);
        x.beginPath(); x.ellipse(sx, sy, sw / 2, sh / 2, r.range(-0.3, 0.3), 0, TAU); x.fill();
        x.fillStyle = 'rgba(170,230,220,.12)'; x.beginPath(); x.ellipse(sx - sw * 0.1, sy - sh * 0.2, sw * 0.35, sh * 0.22, 0, 0, TAU); x.fill();
      }
      speckle(x, 0, h * 0.4, w, h * 0.6, 1500, ['#1A3C44', '#5A8A88', '#7AA8A0'], 73, 0.8, 2.4, 0.4);
    });

    const near = bake(W, H * 0.45, dpr, (x, w, h) => {
      // rounded boulders instead of a jagged edge
      for (let k = 0; k < 9; k++) {
        const bx = (k / 8) * w + r.range(-30, 30), bw = r.range(w * 0.1, w * 0.2), bh = r.range(h * 0.3, h * 0.6);
        const g = x.createLinearGradient(0, h - bh, 0, h);
        g.addColorStop(0, '#3C6A6C'); g.addColorStop(0.25, '#24484E'); g.addColorStop(1, '#0E2830');
        x.fillStyle = g;
        x.beginPath(); x.ellipse(bx, h, bw, bh, 0, Math.PI, 0); x.fill();
        x.strokeStyle = 'rgba(190,240,230,.25)'; x.lineWidth = 2;
        x.beginPath(); x.ellipse(bx, h, bw, bh, 0, Math.PI * 1.15, Math.PI * 1.7); x.stroke();
      }
      for (let k = 0; k < 60; k++) { x.fillStyle = r.pick(['#4A7A78', '#6A9A90', '#2A5058', '#8AB0A0']); x.beginPath(); x.ellipse(r() * w, h * r.range(0.5, 1), r.range(4, 14), r.range(3, 8), 0, 0, TAU); x.fill(); }
      for (let k = 0; k < 10; k++) frond(x, r() * w, h * 0.6, r.range(40, 90), -Math.PI / 2 + r.range(-0.6, 0.6), r.pick(['#2F6B4F', '#3E7B5A', '#245A44']), r, 9, 0.18);
    });

    const fg = blurred(bake(W, H, 0.5, (x, w, h) => {
      for (let k = 0; k < 7; k++) {
        const fx = k % 2 ? w * r.range(0.82, 1.02) : w * r.range(-0.02, 0.16);
        frond(x, fx, h + 20, r.range(h * 0.35, h * 0.7), -Math.PI / 2 + r.range(-0.4, 0.4), r.pick(['#0E3A2E', '#124434', '#0A2E24']), r, 12, 0.14);
      }
    }), 10);

    const kelp = Array.from({ length: Math.round(SWIM.kelp * (mobile ? 0.6 : 1)) }, () => ({ x: r() * W, h: r.range(H * 0.4, H * 0.9), w: r.range(5, 11), ph: r() * TAU, c: r.pick(['#2F6B4F', '#3E7B3A', '#2A5E46', '#4A8A50']) }));
    const bubbles = field({ n: Math.round(SWIM.bubbles * pscale), seed: 11, box: [0, 0, W, H], vx: [-6, 6], vy: [-120, -50], size: [1.5, 6], life: [3, 7], color: '#DFFFFF', style: 'ring', wobble: 14, fadeIn: 0.1 });
    const snow = field({ n: Math.round(SWIM.snow * pscale), seed: 12, box: [0, 0, W, H], vx: [-3, 3], vy: [-4, 8], size: [0.5, 1.5], life: [6, 12], color: '#BFE8E8', style: 'dot', wobble: 4, alpha: 0.6 });
    fish = Array.from({ length: Math.round(SWIM.fish * (mobile ? 0.6 : 1)) }, () => ({ x: W * r.range(0.3, 0.7), y: H * r.range(0.4, 0.6), vx: r.range(-30, 30), vy: r.range(-10, 10), s: r.range(0.7, 1.2) }));
    L = { W, H, arches, stones, near, fg, kelp, bubbles, snow, caustics: causticFrames(mobile ? 10 : 16), scratch: null };
  }

  function update(s) {
    if (!L) return;
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
    ctx.drawImage(L.arches, a0.x, H * 0.3 + rise(0.08) + a0.y, W, L.arches.h);
    ctx.fillStyle = `rgba(${deep.map((v) => v | 0)},${0.22})`;
    ctx.fillRect(0, 0, W, H);

    /* stone with caustics, stronger near the surface */
    const a1 = push(s, 0.2);
    causticLayer(ctx, L.stones, H * 0.5 + rise(0.2) + a1.y, W, L.stones.h, t, 0.25 + sa * 0.6);

    /* kelp, swaying */
    const a2 = push(s, 0.4);
    const base = H * 1.02 + rise(0.4) + a2.y;
    for (const k of L.kelp) {
      // a tapering ribbon that ripples along its length, with leaf blades
      const spine = [];
      for (let j = 0; j <= 14; j++) {
        const u = j / 14;
        spine.push([k.x + a2.x + Math.sin(t * 0.9 + k.ph + u * 3) * 26 * u + Math.sin(t * 0.4 + k.ph) * 12 * u, base - k.h * u, (1 - u * 0.75) * k.w]);
      }
      const g = ctx.createLinearGradient(0, base, 0, base - k.h);
      g.addColorStop(0, '#173E2E'); g.addColorStop(0.6, k.c); g.addColorStop(1, '#7FC08A');
      ctx.fillStyle = g;
      ctx.beginPath();
      spine.forEach(([x, y, w], j) => (j ? ctx.lineTo(x - w, y) : ctx.moveTo(x - w, y)));
      for (let j = spine.length - 1; j >= 0; j--) { const [x, y, w] = spine[j]; ctx.lineTo(x + w + Math.sin(j * 1.3 + t * 2) * 1.5, y); }
      ctx.closePath(); ctx.fill();
      for (let j = 2; j < spine.length; j += 2) {
        const [lx, ly, w] = spine[j];
        const sd = j % 4 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.quadraticCurveTo(lx + sd * (w + 16), ly - 10 + Math.sin(t * 1.6 + j) * 4, lx + sd * (w + 28), ly - 2 + Math.sin(t * 1.6 + j) * 6);
        ctx.quadraticCurveTo(lx + sd * (w + 12), ly + 2, lx, ly + 4);
        ctx.fill();
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
      ctx.strokeStyle = 'rgba(200,250,240,.25)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, ts, ts * 0.55, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.restore();
    }

    /* the school of fish */
    const a3 = push(s, 0.7);
    for (const f of fish) {
      const ang = Math.atan2(f.vy, f.vx);
      const x = f.x + a3.x, y = f.y + rise(0.1) * 0.2 + a3.y, sz = 7 * f.s;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = '#B9D8E0';
      ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * 0.38, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-sz * 0.8, 0); ctx.lineTo(-sz * 1.5, -sz * 0.45); ctx.lineTo(-sz * 1.5, sz * 0.45); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-sz * 0.4, -sz * 0.12, sz * 1.0, sz * 0.12);
      ctx.restore();
    }
    ctx.drawImage(L.near, a3.x, H * 0.62 + rise(0.7) + a3.y, W, L.near.h);

    L.snow.draw(ctx, 0.8);
    L.bubbles.draw(ctx, 0.9);

    const a4 = push(s, 1.3);
    ctx.drawImage(L.fg, a4.x, rise(1.3) * 0.6 + a4.y, W, H);
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
