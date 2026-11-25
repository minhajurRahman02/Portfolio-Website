/* 02 · Photography & Videography — "Rack Focus"
   A viewfinder over a dew-soaked meadow. Scroll racks focus from macro
   flora out to the valley, then zooms 24 → 85 mm. Each layer is baked
   sharp plus two blur levels; the focal plane crossfades between them,
   so you can watch focus travel through the scene. */
import { PHOTO } from '../config.js';
import { TAU, clamp, lerp, ease, inv, approach } from '../util.js';
import { vgrad, glow, sunDisc, rays, rr } from '../paint.js';
import { baked } from '../bakery.js';
import { field } from '../particles.js';
import { push } from '../depth.js';

const BLUR = [0, 5, 14];

export default function create() {
  let L = null;
  let fx = 0.56, fy = 0.52; // smoothed focus reticle

  function build(env) {
    const { W, H } = env;
    const motes = field({ n: Math.round(40 * env.pscale), seed: 9, box: [0, 0, W, H], vx: [-4, 6], vy: [-8, -2], size: [0.6, 1.6], life: [6, 12], color: '#FFF6DA', style: 'dot', wobble: 6, alpha: 0.7 });
    L = { W, H, hz: H * 0.5, env, motes, ready: false, layers: [], dew: [] };
    attach();
  }

  /** the painted layers arrive from the worker (bakery.js) */
  function attach() {
    const P = baked('photography', L.env);
    if (!P) return;
    L.sky = P.sky;
    L.layers = P.layers.map((l) => ({ set: l.set, y: l.y, d: PHOTO.focusLayers[l.i] }));
    L.dew = P.dew;
    L.ready = true;
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
    if (!L.ready) attach();
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

    if (L.ready) ctx.drawImage(L.sky, 0, 0, W, L.sky.h);
    else {
      // still painting: the morning gradient and a plain meadow for a moment
      ctx.fillStyle = vgrad(ctx, 0, 0, H, [[0, '#8FB6E0'], [0.42, '#C9DDEF'], [0.5, '#F5E4CF'], [0.52, '#8FB070'], [1, '#4E7A38']]);
      ctx.fillRect(0, 0, W, H);
    }
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
