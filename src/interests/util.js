/* Small shared helpers: maths, colour, seeded noise, offscreen canvases. */

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => clamp((v - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const ease = (a, b, v) => smooth(inv(a, b, v));
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t) => t * t * t;
export const bell = (a, b, v) => { const t = inv(a, b, v); return Math.sin(t * Math.PI); };
/** framerate-independent approach: fraction to move this frame for a half-life-ish `sec` */
export const approach = (sec, dt) => 1 - Math.pow(0.0015, dt / sec);

/* ---------------- seeded random ---------------- */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  const r = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
  r.range = (a, b) => a + (b - a) * r();
  r.int = (a, b) => Math.floor(a + (b - a + 1) * r());
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.sign = () => (r() < 0.5 ? -1 : 1);
  return r;
}

/* ---------------- periodic 1-D noise ----------------
   Sum of sines with integer frequencies over [0, 1): wraps exactly, so a
   ridge drawn across a strip tiles seamlessly when the strip repeats. */
export function pnoise(seed, octaves = 5, rough = 0.55) {
  const r = rng(seed);
  const waves = [];
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const f = Math.round(Math.pow(2, o) * r.range(1, 1.6)) + o;
    waves.push([f, r() * TAU, amp]);
    total += amp;
    amp *= rough;
  }
  return (u) => {
    let v = 0;
    for (const [f, ph, a] of waves) v += Math.sin(u * f * TAU + ph) * a;
    return v / total; // −1..1
  };
}

/* 2-D value noise for textures */
export function noise2(seed = 1) {
  const r = rng(seed);
  const P = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  const V = Float32Array.from({ length: 256 }, () => r());
  const f = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = smooth(xf), v = smooth(yf);
    const a = V[P[(xi & 255) + P[yi & 255]]], b = V[P[((xi + 1) & 255) + P[yi & 255]]];
    const c = V[P[(xi & 255) + P[(yi + 1) & 255]]], d = V[P[((xi + 1) & 255) + P[(yi + 1) & 255]]];
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  };
  f.fbm = (x, y, o = 4) => { let s = 0, a = 0.5, n = 0; for (let i = 0; i < o; i++) { s += f(x, y) * a; n += a; x *= 2.03; y *= 2.03; a *= 0.5; } return s / n; };
  return f;
}

/* ---------------- colour ---------------- */
const hexCache = new Map();
export function hex2rgb(h) {
  let c = hexCache.get(h);
  if (c) return c;
  const s = h.replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((x) => x + x).join('') : s, 16);
  c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  hexCache.set(h, c);
  return c;
}
export const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const mixRGB = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const mix = (h1, h2, t, a = 1) => rgb(mixRGB(hex2rgb(h1), hex2rgb(h2), clamp(t)), a);
export const alpha = (h, a) => rgb(hex2rgb(h), a);
export function shade(h, k) { // k<0 darker, k>0 lighter
  const c = hex2rgb(h);
  return k < 0 ? rgb(c.map((v) => v * (1 + k))) : rgb(c.map((v) => v + (255 - v) * k));
}
/** keyframed colour track: [[p, '#hex'], …] → rgb array at p */
export function track(keys, p, col) {
  if (p <= keys[0][0]) return hex2rgb(keys[0][col]);
  for (let i = 1; i < keys.length; i++) {
    if (p <= keys[i][0]) {
      const t = smooth(inv(keys[i - 1][0], keys[i][0], p));
      return mixRGB(hex2rgb(keys[i - 1][col]), hex2rgb(keys[i][col]), t);
    }
  }
  return hex2rgb(keys[keys.length - 1][col]);
}
export function trackNum(keys, p, col) {
  if (p <= keys[0][0]) return keys[0][col];
  for (let i = 1; i < keys.length; i++) {
    if (p <= keys[i][0]) return lerp(keys[i - 1][col], keys[i][col], smooth(inv(keys[i - 1][0], keys[i][0], p)));
  }
  return keys[keys.length - 1][col];
}

/* ---------------- canvases ---------------- */
export function makeCanvas(w, h, dpr = 1) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * dpr));
  c.height = Math.max(1, Math.ceil(h * dpr));
  c.w = w; c.h = h; c.dpr = dpr;
  const x = c.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.x = x;
  return c;
}

/** Bake a layer: returns an offscreen canvas painted by fn(ctx, w, h). */
export function bake(w, h, dpr, fn) {
  const c = makeCanvas(w, h, dpr);
  fn(c.x, w, h);
  return c;
}

/** Downsample-upsample blur. Works in every browser (no ctx.filter needed)
 *  and approximates a gaussian well once it steps down in halves. */
export function blurred(src, radius) {
  if (radius < 0.6) return src;
  const steps = Math.max(1, Math.round(Math.log2(radius * 0.9)) + 1);
  let cur = src, w = src.width, h = src.height;
  const chain = [];
  for (let i = 0; i < steps; i++) {
    w = Math.max(2, Math.round(w / 2)); h = Math.max(2, Math.round(h / 2));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(cur, 0, 0, w, h);
    chain.push(c);
    cur = c;
  }
  const out = document.createElement('canvas');
  out.width = src.width; out.height = src.height;
  out.w = src.w; out.h = src.h; out.dpr = src.dpr;
  const ox = out.getContext('2d');
  ox.imageSmoothingQuality = 'high';
  // step back up through the chain for a smoother kernel
  for (let i = chain.length - 2; i >= 0; i--) {
    const c = chain[i];
    const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    x.drawImage(chain[i + 1], 0, 0, c.width, c.height);
  }
  ox.drawImage(chain[0], 0, 0, out.width, out.height);
  return out;
}

/** Horizontal motion-blur by squashing then stretching. */
export function smeared(src, k = 6) {
  const w = Math.max(2, Math.round(src.width / k));
  // squash in halves so the downsample averages instead of skipping columns
  let cur = src;
  while (cur.width / 2 > w) {
    const h2 = document.createElement('canvas');
    h2.width = Math.round(cur.width / 2); h2.height = src.height;
    const hx = h2.getContext('2d'); hx.imageSmoothingQuality = 'high';
    hx.drawImage(cur, 0, 0, h2.width, h2.height);
    cur = h2;
  }
  const a = document.createElement('canvas');
  a.width = w; a.height = src.height;
  const ax = a.getContext('2d'); ax.imageSmoothingQuality = 'high';
  ax.drawImage(cur, 0, 0, w, src.height);
  const out = document.createElement('canvas');
  out.width = src.width; out.height = src.height;
  out.w = src.w; out.h = src.h; out.dpr = src.dpr;
  const ox = out.getContext('2d');
  ox.imageSmoothingQuality = 'high';
  ox.drawImage(a, 0, 0, src.width, src.height);
  return out;
}

/** Re-tints a baked layer into a reusable scratch canvas: source-atop fill.
 *  Cached against the colour key so it only re-runs when the colour moves. */
export function tinter(src) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.w = src.w; c.h = src.h;
  const x = c.getContext('2d');
  let key = '';
  return (color, amount) => {
    const k = color + amount.toFixed(2);
    if (k === key) return c;
    key = k;
    x.globalCompositeOperation = 'copy';
    x.drawImage(src, 0, 0);
    if (amount > 0.004) {
      x.globalCompositeOperation = 'source-atop';
      x.globalAlpha = amount;
      x.fillStyle = color;
      x.fillRect(0, 0, c.width, c.height);
      x.globalAlpha = 1;
    }
    x.globalCompositeOperation = 'source-over';
    return c;
  };
}

/** Draw a baked strip repeating horizontally, offset by `ox` CSS px. */
export function drawTiled(ctx, img, ox, y, W, h = img.h) {
  const w = img.w;
  let x = -(((ox % w) + w) % w);
  for (; x < W; x += w) ctx.drawImage(img, x, y, w, h);
}

export const isMobile = () => window.innerWidth < 720;
