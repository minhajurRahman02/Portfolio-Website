/* Painterly helpers shared by the illustrated scenes. Every function draws
   into the context it is given in CSS pixels. Most are used while baking
   layers; the cheap ones (glow, rays, stars, grass) also run per frame. */
import { TAU, rng, pnoise, hex2rgb, rgb, alpha, mix, lerp, clamp, makeCanvas, blurred } from './util.js';

export function vgrad(ctx, x0, y0, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x0, y1);
  for (const [o, c] of stops) g.addColorStop(clamp(o), c);
  return g;
}

export function fillSky(ctx, W, H, stops) {
  ctx.fillStyle = vgrad(ctx, 0, 0, H, stops);
  ctx.fillRect(0, 0, W, H);
}

/** Soft radial light. `lighter` by default so overlapping glows bloom. */
export function glow(ctx, x, y, r, color, a = 1, op = 'lighter') {
  if (a <= 0.003 || r <= 0) return;
  const c = typeof color === 'string' ? hex2rgb(color) : color;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgb(c, a));
  g.addColorStop(0.25, rgb(c, a * 0.45));
  g.addColorStop(0.6, rgb(c, a * 0.12));
  g.addColorStop(1, rgb(c, 0));
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = op;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalCompositeOperation = prev;
}

/** A sun or moon: hard-ish disc wrapped in layered bloom. */
export function sunDisc(ctx, x, y, r, core, halo, a = 1) {
  glow(ctx, x, y, r * 14, halo, 0.22 * a);
  glow(ctx, x, y, r * 5, halo, 0.45 * a);
  glow(ctx, x, y, r * 2.2, core, 0.8 * a);
  ctx.globalAlpha = a;
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}

/** God rays fanning from a point. Each ray is a gradient-filled wedge. */
export function rays(ctx, x, y, angle, spread, len, color, a, n = 7, seed = 3, t = 0) {
  if (a <= 0.004) return;
  const r = rng(seed);
  const c = hex2rgb(color);
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const off = (i / (n - 1) - 0.5) * spread + Math.sin(t * 0.3 + i * 1.7) * spread * 0.04;
    const w = r.range(0.01, 0.045) + Math.sin(t * 0.5 + i) * 0.006;
    const ang = angle + off;
    const L = len * r.range(0.6, 1);
    const g = ctx.createLinearGradient(x, y, x + Math.cos(ang) * L, y + Math.sin(ang) * L);
    const aa = a * r.range(0.4, 1) * (0.75 + 0.25 * Math.sin(t * 0.7 + i * 2.1));
    g.addColorStop(0, rgb(c, aa));
    g.addColorStop(0.5, rgb(c, aa * 0.35));
    g.addColorStop(1, rgb(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang - w) * L, y + Math.sin(ang - w) * L);
    ctx.lineTo(x + Math.cos(ang + w) * L, y + Math.sin(ang + w) * L);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = prev;
}

/** Silhouette ridge across the full width of a strip. `top` returns the
 *  ridge y at u ∈ [0,1). Fill is a vertical gradient so the ridge reads
 *  hazier at its crest (light scattering) and denser at its foot. */
export function ridge(ctx, w, h, { base, amp, seed, oct = 5, rough = 0.5, top, fill, rim, rimW = 1.4, sharp = 0 }) {
  const n = pnoise(seed, oct, rough);
  const yAt = top || ((u) => {
    let v = n(u);
    if (sharp) v = Math.sign(v) * Math.pow(Math.abs(v), 1 - sharp * 0.5);
    return base - v * amp;
  });
  const pts = [];
  const step = Math.max(2, w / 260);
  for (let x = 0; x <= w + 0.1; x += step) pts.push([x, yAt(x / w)]);
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (rim) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 0.6) : ctx.moveTo(x, y + 0.6)));
    ctx.strokeStyle = rim;
    ctx.lineWidth = rimW;
    ctx.stroke();
  }
  return yAt;
}

/** A cumulus cloud baked to its own canvas: overlapping lobes lit from
 *  `light` (radians), shaded underneath, then softened. */
export function cloudSprite(seed, w, h, { lit = '#FFFFFF', shade = '#B9C6DE', core = '#E7EDF7', soft = 3 } = {}) {
  const r = rng(seed);
  const c = makeCanvas(w, h, 1);
  const x = c.x;
  const lobes = [];
  const n = r.int(9, 15);
  for (let i = 0; i < n; i++) {
    const u = r.range(0.14, 0.86);
    const hump = Math.sin(u * Math.PI);
    const rad = h * r.range(0.14, 0.24) * (0.6 + hump * 0.6);
    lobes.push([u * w, h * 0.8 - hump * h * r.range(0.12, 0.3), rad]);
  }
  // a soft, flat-ish base made of small lobes (no hard rectangle)
  for (let u = 0.16; u <= 0.84; u += 0.07) lobes.push([u * w, h * 0.8, h * 0.12 * (0.7 + Math.sin(u * Math.PI) * 0.5)]);
  // shade pass
  x.fillStyle = shade;
  for (const [cx, cy, rr] of lobes) { x.beginPath(); x.arc(cx, cy, rr, 0, TAU); x.fill(); }
  // core and highlight passes, offset up toward the light
  for (const [col, dy, k] of [[core, -0.06, 0.92], [lit, -0.13, 0.78]]) {
    x.fillStyle = col;
    for (const [cx, cy, rr] of lobes) { x.beginPath(); x.arc(cx - rr * 0.05, cy + rr * dy * 2, rr * k, 0, TAU); x.fill(); }
  }
  // underside darkening for volume
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = vgrad(x, 0, h * 0.45, h, [[0, 'rgba(0,0,0,0)'], [1, alpha(shade, 0.85)]]);
  x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'source-over';
  return soft ? blurred(c, soft) : c;
}

/** Tree clump: a dark mass with a lit top edge — reads as foliage at any scale. */
export function treeClump(ctx, x, y, s, r, dark, mid, light) {
  const n = 5 + Math.floor(r() * 4);
  const blobs = [];
  for (let i = 0; i < n; i++) {
    blobs.push([x + r.range(-0.6, 0.6) * s, y - r.range(0.2, 1.1) * s, s * r.range(0.35, 0.6)]);
  }
  ctx.fillStyle = dark;
  for (const [bx, by, br] of blobs) { ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill(); }
  ctx.fillStyle = mid;
  for (const [bx, by, br] of blobs) { ctx.beginPath(); ctx.arc(bx - br * 0.15, by - br * 0.18, br * 0.72, 0, TAU); ctx.fill(); }
  if (light) {
    ctx.fillStyle = light;
    for (const [bx, by, br] of blobs) { ctx.beginPath(); ctx.arc(bx - br * 0.3, by - br * 0.38, br * 0.38, 0, TAU); ctx.fill(); }
  }
}

/** Grass blades drawn live so they can sway. `blades` from makeBlades. */
export function makeBlades(seed, n, W, y0, y1, hMin, hMax) {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({
    x: r() * W, y: lerp(y0, y1, r()), h: r.range(hMin, hMax),
    w: r.range(1.2, 3.2), ph: r() * TAU, k: r.range(0.6, 1.4), c: r(),
  }));
}
export function drawBlades(ctx, blades, sway, colorFn, ox = 0, W = Infinity) {
  for (const b of blades) {
    let x = b.x + ox;
    if (W !== Infinity) x = ((x % W) + W) % W;
    const s = sway(b) * b.h;
    ctx.fillStyle = colorFn(b);
    ctx.beginPath();
    ctx.moveTo(x - b.w, b.y);
    ctx.quadraticCurveTo(x - b.w * 0.3 + s * 0.4, b.y - b.h * 0.55, x + s, b.y - b.h);
    ctx.quadraticCurveTo(x + b.w * 0.3 + s * 0.4, b.y - b.h * 0.55, x + b.w, b.y);
    ctx.closePath();
    ctx.fill();
  }
}

/** Starfield list + twinkle draw. */
export function makeStars(seed, n, W, H, yMax = 1) {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({
    x: r() * W, y: Math.pow(r(), 1.4) * H * yMax, s: Math.pow(r(), 3) * 1.7 + 0.35,
    ph: r() * TAU, f: r.range(0.6, 2.2), warm: r() < 0.18,
  }));
}
export function drawStars(ctx, stars, t, a, ox = 0, oy = 0) {
  if (a <= 0.01) return;
  for (const s of stars) {
    const tw = 0.55 + 0.45 * Math.sin(t * s.f + s.ph);
    ctx.globalAlpha = clamp(a * tw);
    ctx.fillStyle = s.warm ? '#FFE9C4' : '#EAF1FF';
    const x = s.x + ox, y = s.y + oy;
    if (s.s > 1.4) {
      ctx.fillRect(x - s.s * 1.6, y - 0.3, s.s * 3.2, 0.6);
      ctx.fillRect(x - 0.3, y - s.s * 1.6, 0.6, s.s * 3.2);
    }
    ctx.beginPath(); ctx.arc(x, y, s.s * 0.6, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Rounded rectangle path. */
export function rr(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

/** Speckle texture (stone, wood, chalk) over whatever is already drawn. */
export function speckle(ctx, x0, y0, w, h, n, colors, seed, sMin = 0.5, sMax = 1.6, a = 0.25) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = a * r();
    ctx.fillStyle = r.pick(colors);
    const s = r.range(sMin, sMax);
    ctx.fillRect(x0 + r() * w, y0 + r() * h, s, s);
  }
  ctx.globalAlpha = 1;
}

/** Horizontal haze band: atmospheric perspective between depth layers. */
export function haze(ctx, W, y, h, color, a) {
  if (a <= 0.004) return;
  ctx.fillStyle = vgrad(ctx, 0, y, y + h, [[0, alpha(color, 0)], [0.5, alpha(color, a)], [1, alpha(color, 0)]]);
  ctx.fillRect(0, y, W, h);
}

/** Leafy frond for foreground framing (big, soft, close to the lens). */
export function frond(ctx, x, y, len, ang, color, r, leaves = 14, width = 0.16) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, len * 0.012);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * 0.08, len, len * 0.05); ctx.stroke();
  ctx.fillStyle = color;
  for (let i = 1; i < leaves; i++) {
    const u = i / leaves;
    const px = len * u, py = -len * 0.08 * Math.sin(u * Math.PI) + len * 0.05 * u * u;
    const L = len * width * (1 - u * 0.6) * r.range(0.8, 1.2);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + L * 0.5, py + sd * L * 0.55, px + L * 0.9, py + sd * L * 0.95);
      ctx.quadraticCurveTo(px + L * 0.2, py + sd * L * 0.3, px, py);
      ctx.fill();
    }
  }
  ctx.restore();
}

export { mix, alpha, rgb, hex2rgb };
