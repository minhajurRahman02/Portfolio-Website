/* 02 · Photography & Videography — "Rack Focus"
   A viewfinder over a dew-soaked meadow. Scroll racks focus from macro
   flora out to the valley, then zooms 24 → 85 mm. Each layer is baked
   sharp plus two blur levels; the focal plane crossfades between them,
   so you can watch focus travel through the scene. */
import { PHOTO } from '../config.js';
import { TAU, rng, clamp, lerp, ease, inv, bell, bake, blurred, approach } from '../util.js';
import { vgrad, glow, sunDisc, rays, ridge, treeClump, rr, haze, speckle } from '../paint.js';
import { field } from '../particles.js';
import { push } from '../depth.js';

const BLUR = [0, 5, 14];

export default function create() {
  let L = null;
  let fx = 0.56, fy = 0.52; // smoothed focus reticle

  function stack(c) { return [c, blurred(c, BLUR[1]), blurred(c, BLUR[2])]; }

  function build(env) {
    const { W, H, dpr, mobile } = env;
    const hz = H * 0.5;
    const r = rng(202);
    const d = Math.min(dpr, 1.25);

    const sky = bake(W, H, 1, (x, w, h) => {
      x.fillStyle = vgrad(x, 0, 0, h * 0.6, [[0, '#A9C9EA'], [0.55, '#D6E5F2'], [1, '#F6E6D2']]);
      x.fillRect(0, 0, w, h);
    });

    const mtn = bake(W, H * 0.3, d, (x, w, h) => {
      ridge(x, w, h, { base: h * 0.42, amp: h * 0.3, seed: 31, oct: 6, sharp: 0.4, fill: vgrad(x, 0, 0, h, [[0, '#C3CDE6'], [1, '#D2D9EB']]) });
      ridge(x, w, h, { base: h * 0.7, amp: h * 0.22, seed: 32, oct: 5, sharp: 0.3, fill: vgrad(x, 0, h * 0.3, h, [[0, '#A1B0D2'], [1, '#B9C3DE']]), rim: 'rgba(255,240,225,.5)' });
    });

    const lake = bake(W, H * 0.2, d, (x, w, h) => {
      x.fillStyle = vgrad(x, 0, h * 0.2, h, [[0, '#9DB8D6'], [0.5, '#5C8DB9'], [1, '#4C7BA6']]);
      x.fillRect(0, h * 0.22, w, h);
      for (let k = 0; k < 140; k++) {
        x.fillStyle = `rgba(255,250,235,${r.range(0.15, 0.55)})`;
        x.fillRect(r() * w, h * r.range(0.3, 0.95), r.range(6, 30), 1);
      }
      for (let px = 0; px < w; px += r.range(5, 12)) treeClump(x, px, h * 0.28, r.range(5, 10), r, '#4F6D63', '#5E7C6E', null);
      haze(x, w, h * 0.12, h * 0.28, '#E6ECF4', 0.55);
    });

    const meadow = bake(W, H * 0.34, d, (x, w, h) => {
      ridge(x, w, h, { base: h * 0.22, amp: h * 0.08, seed: 41, oct: 3, fill: vgrad(x, 0, 0, h, [[0, '#B5D184'], [1, '#93BC63']]), rim: 'rgba(255,250,220,.6)', rimW: 1.2 });
      for (let k = 0; k < 9; k++) {
        const tx = r() * w, ty = h * r.range(0.25, 0.5), s = r.range(14, 30);
        x.fillStyle = '#5A4632'; x.fillRect(tx - 2, ty - s * 0.4, 4, s * 0.5);
        treeClump(x, tx, ty - s * 0.3, s, r, '#4E7A44', '#628F4F', '#88B067');
      }
      for (let k = 0; k < (mobile ? 500 : 1200); k++) {
        x.fillStyle = r.pick(['#B394DD', '#A07CD0', '#C9AEEA', '#FFF4E2']);
        x.globalAlpha = r.range(0.4, 0.9);
        const yy = h * r.range(0.35, 1);
        x.fillRect(r() * w, yy, 1.4 + yy / h * 1.6, 1.4 + yy / h * 1.6);
      }
      x.globalAlpha = 1;
    });

    const nearH = H * 0.42;
    const near = bake(W, nearH, d, (x, w, h) => {
      x.fillStyle = vgrad(x, 0, h * 0.2, h, [[0, 'rgba(120,160,80,0)'], [0.5, '#7FA85A'], [1, '#5F8A44']]);
      x.fillRect(0, h * 0.3, w, h);
      for (let k = 0; k < w * (mobile ? 0.5 : 0.9); k++) {
        const gx = r() * w, base = h * r.range(0.6, 1.05), gh = h * r.range(0.15, 0.5);
        x.strokeStyle = r.pick(['#6E9B4C', '#8DB860', '#5A8640', '#A6C877']);
        x.lineWidth = r.range(1, 2.2);
        x.beginPath(); x.moveTo(gx, base); x.quadraticCurveTo(gx + r.range(-5, 5), base - gh * 0.5, gx + r.range(-9, 9), base - gh); x.stroke();
      }
      for (let k = 0; k < w * 0.05; k++) {
        const lx = r() * w, ly = h * r.range(0.25, 0.7), lh = r.range(14, 30);
        x.strokeStyle = '#6E8F52'; x.lineWidth = 1.2;
        x.beginPath(); x.moveTo(lx, ly + lh * 1.6); x.lineTo(lx, ly); x.stroke();
        for (let j = 0; j < 8; j++) { x.fillStyle = r.pick(['#B394DD', '#9C78CE', '#C7A9EE']); x.beginPath(); x.arc(lx + r.range(-2, 2), ly + j * lh / 8, 2.2, 0, TAU); x.fill(); }
      }
      for (let k = 0; k < w * 0.03; k++) {
        const dx = r() * w, dy = h * r.range(0.35, 0.8);
        x.fillStyle = '#FFFFFF';
        for (let j = 0; j < 9; j++) { const a = j / 9 * TAU; x.beginPath(); x.ellipse(dx + Math.cos(a) * 4, dy + Math.sin(a) * 4, 3.4, 1.4, a, 0, TAU); x.fill(); }
        x.fillStyle = '#FFC93C'; x.beginPath(); x.arc(dx, dy, 2.4, 0, TAU); x.fill();
      }
    });

    /* macro: huge stems, a lavender spike, a daisy and dew drops right at the lens */
    const dew = [];
    const macro = bake(W, H, d, (x, w, h) => {
      const stem = (sx, top, bend, wd, col) => {
        x.strokeStyle = col; x.lineWidth = wd; x.lineCap = 'round';
        x.beginPath(); x.moveTo(sx, h + 10); x.quadraticCurveTo(sx + bend * 0.4, (h + top) / 2, sx + bend, top); x.stroke();
        return [sx + bend, top];
      };
      const leaf = (lx, ly, len, ang, col) => {
        x.save(); x.translate(lx, ly); x.rotate(ang);
        x.fillStyle = col;
        x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len * 0.5, -len * 0.28, len, 0); x.quadraticCurveTo(len * 0.5, len * 0.22, 0, 0); x.fill();
        x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 0); x.lineTo(len * 0.9, 0); x.stroke();
        x.restore();
      };
      // left frame: lavender spike
      const [lx, ly] = stem(w * 0.08, h * 0.28, w * 0.04, 7, '#4F7A3E');
      for (let j = 0; j < 16; j++) {
        const yy = ly + j * h * 0.022, rad = 9 - j * 0.25;
        for (const sd of [-1, 1]) { x.fillStyle = j % 2 ? '#A985D9' : '#8C66C4'; x.beginPath(); x.ellipse(lx + sd * rad * 0.7, yy, rad, rad * 0.7, sd * 0.4, 0, TAU); x.fill(); }
      }
      leaf(w * 0.09, h * 0.75, w * 0.16, -0.5, '#5E8C47');
      leaf(w * 0.11, h * 0.86, w * 0.13, -2.6, '#4C7A3A');
      // right frame: daisy and grass blades
      const [dx2, dy2] = stem(w * 0.9, h * 0.42, -w * 0.06, 8, '#4F7A3E');
      for (let j = 0; j < 18; j++) {
        const a = j / 18 * TAU;
        x.fillStyle = j % 2 ? '#FFFFFF' : '#F4F1EA';
        x.beginPath(); x.ellipse(dx2 + Math.cos(a) * 30, dy2 + Math.sin(a) * 20, 26, 8, a, 0, TAU); x.fill();
      }
      x.fillStyle = '#F2B41F'; x.beginPath(); x.ellipse(dx2, dy2, 17, 12, 0, 0, TAU); x.fill();
      speckle(x, dx2 - 15, dy2 - 10, 30, 20, 120, ['#C98A12', '#FFD866'], 7, 1, 2.2, 0.8);
      for (let k = 0; k < 14; k++) {
        const bx = w * (r() < 0.5 ? r.range(0, 0.22) : r.range(0.74, 1));
        stem(bx, h * r.range(0.45, 0.8), r.range(-60, 60), r.range(3, 6), r.pick(['#5C8A44', '#6F9D52', '#4A773A']));
      }
      // dew drops
      for (let k = 0; k < 26; k++) {
        const ex = w * (r() < 0.5 ? r.range(0.02, 0.2) : r.range(0.78, 0.98)), ey = h * r.range(0.4, 0.95), er = r.range(3, 8);
        dew.push([ex, ey, er]);
        x.fillStyle = 'rgba(220,240,255,.35)'; x.beginPath(); x.arc(ex, ey, er, 0, TAU); x.fill();
        x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 1; x.beginPath(); x.arc(ex, ey, er, 0.2, 2.6); x.stroke();
        x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(ex - er * 0.35, ey - er * 0.4, er * 0.25, 0, TAU); x.fill();
      }
    });

    const motes = field({ n: Math.round(40 * env.pscale), seed: 9, box: [0, 0, W, H], vx: [-4, 6], vy: [-8, -2], size: [0.6, 1.6], life: [6, 12], color: '#FFF6DA', style: 'dot', wobble: 6, alpha: 0.7 });

    L = {
      W, H, hz, sky,
      layers: [
        { set: stack(mtn), y: hz - mtn.h * 0.85, d: PHOTO.focusLayers[1] },
        { set: stack(lake), y: hz - lake.h * 0.22, d: PHOTO.focusLayers[2] },
        { set: stack(meadow), y: hz + H * 0.08, d: PHOTO.focusLayers[3] },
        { set: stack(near), y: H - nearH, d: PHOTO.focusLayers[4] },
        { set: stack(macro), y: 0, d: PHOTO.focusLayers[5] },
      ],
      dew, motes,
    };
  }

  function drawFocus(ctx, set, b, x, y) {
    const w = set[0].w, h = set[0].h;
    if (b <= BLUR[1]) {
      const k = b / BLUR[1];
      if (k < 0.98) { ctx.drawImage(set[0], x, y, w, h); }
      if (k > 0.02) { ctx.globalAlpha = k; ctx.drawImage(set[1], x, y, w, h); ctx.globalAlpha = 1; }
    } else {
      const k = clamp((b - BLUR[1]) / (BLUR[2] - BLUR[1]));
      ctx.drawImage(set[1], x, y, w, h);
      if (k > 0.02) { ctx.globalAlpha = k; ctx.drawImage(set[2], x, y, w, h); ctx.globalAlpha = 1; }
    }
  }

  function focusAt(p) { return lerp(1.0, 0.2, ease(0.02, 0.6, p)); }
  function zoomAt(p) { return ease(0.6, 1, p); }

  function update(s) {
    if (!L) return;
    L.motes.update(s.dt);
    const k = approach(0.4, s.dt);
    const tx = s.ptr ? s.mx : 0.56, ty = s.ptr ? s.my : 0.52;
    fx += (tx - fx) * k; fy += (ty - fy) * k;
  }

  function draw(ctx, s) {
    if (!L) return;
    const { W, H, p, t } = s;
    // the cursor nudges the focal plane: lower on screen = nearer
    const f = clamp(focusAt(p) + (s.ptr ? (fy - 0.5) * 0.18 : 0), 0.15, 1);
    const z = zoomAt(p);
    const cx = W * 0.55, cy = H * 0.5;

    ctx.drawImage(L.sky, 0, 0, W, H);
    const sx = W * 0.22, sy = H * 0.18;
    sunDisc(ctx, sx, sy, Math.min(W, H) * 0.03, '#FFF8E4', '#FFE2B0', 0.9);
    rays(ctx, sx, sy, 0.85, 1.0, Math.max(W, H) * 1.1, '#FFF1D2', 0.07, 14, 4, t);

    for (const ly of L.layers) {
      const b = Math.abs(ly.d - f) * 22;
      // telephoto: far layers loom larger; near layers swell past the frame edges
      const zs = 1 + z * (ly.d < 0.7 ? lerp(1.4, 0.9, ly.d) : lerp(1.2, 2.4, (ly.d - 0.7) / 0.3));
      const pu = push(s, ly.d);
      ctx.save();
      ctx.translate(cx + pu.x, cy + pu.y + z * (ly.d > 0.7 ? H * 0.25 * (ly.d - 0.7) / 0.3 : 0));
      ctx.scale(zs, zs);
      ctx.translate(-cx, -cy);
      drawFocus(ctx, ly.set, b, 0, ly.y);
      ctx.restore();
    }

    /* six-sided bokeh from dew when the macro layer is out of focus */
    const bm = Math.abs(1 - f) * 22;
    if (bm > 2) {
      const zs = 1 + z * 2.4;
      ctx.globalCompositeOperation = 'lighter';
      const a = clamp((bm - 2) / 8) * (1 - z * 0.6);
      for (let k = 0; k < L.dew.length; k++) {
        const [dx, dy, dr] = L.dew[k];
        const x = cx + (dx - cx) * zs, y = cy + (dy - cy) * zs + z * H * 0.25;
        const R = dr + bm * 1.5 * zs;
        const tw = 0.7 + 0.3 * Math.sin(t * 1.3 + k);
        ctx.fillStyle = `rgba(242,250,255,${0.12 * a * tw})`;
        ctx.strokeStyle = `rgba(255,255,255,${0.12 * a * tw})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + 0.26; i ? ctx.lineTo(x + Math.cos(an) * R, y + Math.sin(an) * R) : ctx.moveTo(x + Math.cos(an) * R, y + Math.sin(an) * R); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // lake glints bloom while the lake is soft
    const bl = Math.abs(PHOTO.focusLayers[2] - f) * 22;
    if (bl > 3) {
      const a = clamp((bl - 3) / 10) * 0.5;
      for (let k = 0; k < 9; k++) glow(ctx, W * (0.15 + k * 0.09 + Math.sin(k * 3.1) * 0.03), L.hz + H * 0.03 + (k % 3) * 6, 6 + bl, '#FFF6E0', a * (0.6 + 0.4 * Math.sin(t * 2 + k)));
    }

    /* butterfly drifting over the near flowers; blurred with a shadow trick when soft */
    const bt = t * 0.25;
    const bx = W * (0.62 + Math.sin(bt) * 0.12), by = H * (0.62 + Math.sin(bt * 1.7) * 0.05);
    const bb = Math.abs(0.8 - f) * 22;
    butterfly(ctx, bx, by, Math.min(W, H) * 0.018 * (1 + z), Math.sin(t * 14), bb);

    L.motes.draw(ctx, 0.8);
    hud(ctx, s, f, z);
  }

  function butterfly(ctx, x, y, s, flap, blur) {
    ctx.save();
    // shadow offsets ignore the transform, so the offset is scaled to device pixels
    if (blur > 1.5) { const k = ctx.getTransform().a; ctx.shadowColor = 'rgba(255,170,90,.9)'; ctx.shadowBlur = blur * k; ctx.shadowOffsetX = 10000 * k; ctx.translate(-10000, 0); }
    ctx.translate(x, y);
    const k = Math.abs(flap) * 0.8 + 0.2;
    ctx.fillStyle = '#FF9A4A';
    for (const sd of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(sd * s * 0.6 * k, -s * 0.2, s * 0.7 * k, s * 0.55, sd * 0.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sd * s * 0.45 * k, s * 0.4, s * 0.45 * k, s * 0.38, -sd * 0.5, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#2A1C14'; ctx.fillRect(-s * 0.06, -s * 0.5, s * 0.12, s * 1.1);
    ctx.restore();
  }

  function hud(ctx, s, f, z) {
    const { W, H, t } = s;
    const a = 1 - s.sheet;
    if (a <= 0.01) return;
    const m = Math.min(W, H) * 0.06;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    const L2 = Math.min(W, H) * 0.06;
    for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
      ctx.beginPath(); ctx.moveTo(x, y + sy * L2); ctx.lineTo(x, y); ctx.lineTo(x + sx * L2, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
    for (const u of [1 / 3, 2 / 3]) {
      ctx.beginPath(); ctx.moveTo(m + (W - 2 * m) * u, m); ctx.lineTo(m + (W - 2 * m) * u, H - m); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(m, m + (H - 2 * m) * u); ctx.lineTo(W - m, m + (H - 2 * m) * u); ctx.stroke();
    }
    // AF points, lit near the reticle
    const rx = fx * W, ry = fy * H;
    for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) {
      const px = W * (0.22 + i * 0.07), py = H * (0.3 + j * 0.1);
      const near = Math.hypot(px - rx, py - ry) < Math.min(W, H) * 0.09;
      ctx.strokeStyle = near ? 'rgba(255,181,71,.95)' : 'rgba(255,255,255,.12)';
      ctx.lineWidth = near ? 1.6 : 1;
      ctx.strokeRect(px - 7, py - 5, 14, 10);
    }
    ctx.strokeStyle = 'rgba(255,181,71,.95)'; ctx.lineWidth = 1.6;
    const R = 22 + Math.sin(t * 4) * 1.5;
    ctx.beginPath(); ctx.arc(rx, ry, R, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx - R - 8, ry); ctx.lineTo(rx - R + 6, ry); ctx.moveTo(rx + R - 6, ry); ctx.lineTo(rx + R + 8, ry); ctx.moveTo(rx, ry - R - 8); ctx.lineTo(rx, ry - R + 6); ctx.moveTo(rx, ry + R - 6); ctx.lineTo(rx, ry + R + 8); ctx.stroke();

    const fs = Math.max(10, Math.min(13, W / 80));
    ctx.font = `600 ${fs}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textBaseline = 'middle';
    // REC + timecode
    const blink = Math.sin(t * 5) > 0;
    ctx.fillStyle = blink ? '#FF4D45' : 'rgba(255,77,69,.25)';
    ctx.beginPath(); ctx.arc(m + 12, m + 26, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    const fr = Math.floor(t * 24);
    const tc = `${String(Math.floor(fr / 86400) % 24).padStart(2, '0')}:${String(Math.floor(fr / 1440) % 60).padStart(2, '0')}:${String(Math.floor(fr / 24) % 60).padStart(2, '0')}:${String(fr % 24).padStart(2, '0')}`;
    ctx.fillText(`REC  ${tc}`, m + 24, m + 26);
    ctx.textAlign = 'right';
    ctx.fillText('4K  24p   ▮▮▮▯', W - m - 6, m + 26);
    // exposure readout
    const mm = Math.round(lerp(24, 85, z));
    const fst = lerp(1.8, 8, ease(0, 1, s.p)).toFixed(1);
    const sh = Math.round(lerp(250, 60, ease(0, 1, s.p)));
    const dist = f > 0.9 ? '0.3m' : f > 0.6 ? '1.2m' : f > 0.4 ? '8m' : f > 0.28 ? '40m' : '∞';
    ctx.textAlign = 'left';
    const y = H - m - 18;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    rr(ctx, m + 2, y - 15, W - 2 * m - 4, 30, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    const cells = [`${mm}mm`, `f/${fst}`, `1/${sh}`, 'ISO 100', `AF ${dist}`];
    const cw = (W - 2 * m) / (W < 600 ? 5.2 : 7);
    cells.forEach((c, i) => { if (W < 520 && i === 3) return; ctx.fillStyle = i === 1 ? '#FFB547' : 'rgba(255,255,255,.92)'; ctx.fillText(c, m + 14 + i * cw, y); });
    if (W >= 600) {
      // exposure meter
      const ex = W - m - 14 - cw * 1.6, ew = cw * 1.5;
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1;
      for (let k = 0; k <= 8; k++) { const px = ex + ew * k / 8; ctx.beginPath(); ctx.moveTo(px, y - (k % 4 === 0 ? 6 : 3)); ctx.lineTo(px, y + (k % 4 === 0 ? 6 : 3)); ctx.stroke(); }
      const mk = ex + ew * (0.5 + Math.sin(t * 0.8) * 0.06);
      ctx.fillStyle = '#FFB547'; ctx.beginPath(); ctx.moveTo(mk, y - 9); ctx.lineTo(mk - 4, y - 14); ctx.lineTo(mk + 4, y - 14); ctx.fill();
    }
    ctx.restore();
  }

  return {
    build, update, draw,
    dispose() { L = null; },
    crane(s) {
      const u = inv(0.12, 0.58, s.p);
      if (u <= 0 || u >= 1) return null;
      return { x: lerp(1.06, -0.06, u) * s.W, y: s.H * (0.24 + Math.sin(u * Math.PI) * -0.06), size: Math.min(s.W, s.H) * 0.035, flap: Math.sin(s.t * 8), dir: -1, rot: 0.05 };
    },
  };
}
