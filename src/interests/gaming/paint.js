/* Painting for 04 · Gaming — still pixel art, lit like a real place.
   The stage strips keep their one shared pixel grid, but every strip goes
   through a lighting pass at that grid: each shape gets volume from its own
   silhouette (a bevel from the distance to its edge), a warm rim where it
   faces the low sun on the right, a cool shadow band on the far side,
   ambient occlusion where it meets the ground, and surface grain — all
   quantised with an ordered dither so it stays crisp pixel art. The clouds
   are re-made as volumetric sunset cumulus, crushed to a few dithered tones.
   Runs in the painting worker (bakery.js); the scene starts on the flat
   strips and swaps these in when they land. */
import { GAME } from '../config.js';
import { tnoise, cumulus } from '../realism.js';
import { pcanvas } from './sprites.js';
import { makeLevel, bakeMega, bakeCity, bakeJungle, bakeNear, bakePlayfield, bakeFG } from './stage.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const B = 1 << 20;

/**
 * Light a pixel strip. light: unit vector toward the light in screen space
 * (x right, y down). rim/shade are [r,g,b]; depth is how many pixels the
 * bevel reaches in; tex is grain strength; ground is the y below which
 * occlusion darkens toward; haze fades toward a colour with height.
 */
export function relight(c, o = {}) {
  const {
    light = [0.72, -0.69], rim = hx('#ffb46a'), rimA = 0.6, shade = hx('#1a1030'), shadeA = 0.45,
    depth = 4, tex = 0.12, texSize = 3, seed = 7, ground = null, aoA = 0.35, aoH = 18, haze = null, hazeA = 0,
  } = o;
  const w = c.width, h = c.height;
  const x = c.getContext('2d');
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  // chamfer distance to the nearest clear pixel, capped at depth + 1
  const D = new Float32Array(w * h);
  const cap = depth + 1;
  for (let i = 0; i < w * h; i++) D[i] = d[i * 4 + 3] > 0 ? cap : 0;
  const k1 = 1, k2 = 1.414;
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const i = y * w + xx; if (!D[i]) continue;
    let v = D[i];
    if (xx > 0) v = Math.min(v, D[i - 1] + k1); else v = Math.min(v, k1);
    if (y > 0) { v = Math.min(v, D[i - w] + k1); if (xx > 0) v = Math.min(v, D[i - w - 1] + k2); if (xx < w - 1) v = Math.min(v, D[i - w + 1] + k2); } else v = Math.min(v, k1);
    D[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let xx = w - 1; xx >= 0; xx--) {
    const i = y * w + xx; if (!D[i]) continue;
    let v = D[i];
    if (xx < w - 1) v = Math.min(v, D[i + 1] + k1); else v = Math.min(v, k1);
    if (y < h - 1) { v = Math.min(v, D[i + w] + k1); if (xx < w - 1) v = Math.min(v, D[i + w + 1] + k2); if (xx > 0) v = Math.min(v, D[i + w - 1] + k2); }
    D[i] = v;
  }
  const nz = tnoise(seed);
  const at = (xx, y) => (xx < 0 || y < 0 || xx >= w || y >= h ? 0 : D[y * w + xx]);
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const i = y * w + xx, q = i * 4;
    if (!d[q + 3]) continue;
    const dist = D[i];
    let r = d[q], g = d[q + 1], b = d[q + 2];
    const th = bay(xx, y);
    if (dist <= depth) {
      // outward normal: down the distance gradient
      const gx = at(xx + 1, y) - at(xx - 1, y), gy = at(xx, y + 1) - at(xx, y - 1);
      const gl = Math.hypot(gx, gy) || 1;
      const nx = -gx / gl, ny = -gy / gl;
      const ndl = nx * light[0] + ny * light[1];
      const edge = 1 - (dist - 1) / depth;            // 1 at the edge, 0 at depth
      if (ndl > 0.15) {
        const t = ndl * edge * rimA;
        // full rim on the outermost pixel, dithered inside it
        const a = dist <= 1.01 ? t : (th < t * 0.9 ? t * 0.7 : 0);
        r += (rim[0] - r) * a; g += (rim[1] - g) * a; b += (rim[2] - b) * a;
      } else if (ndl < -0.15) {
        const t = -ndl * edge * shadeA;
        const a = th < t * 1.4 ? t : t * 0.35;
        r += (shade[0] - r) * a; g += (shade[1] - g) * a; b += (shade[2] - b) * a;
      }
    }
    // grain in three dithered steps, so it reads as texture not noise
    if (tex > 0) {
      const n = nz.fbm(xx / texSize, y / texSize, B, 3) - 0.5 + (nz(xx * 0.9, y * 0.9, B) - 0.5) * 0.5;
      const step = n > 0.16 ? 1 : n < -0.16 ? -1 : 0;
      const m = 1 + step * tex;
      r *= m; g *= m; b *= m;
    }
    if (ground != null && y > ground - aoH) {
      const t = Math.min(1, (y - (ground - aoH)) / aoH) * aoA;
      if (th < t * 1.6) { r *= 1 - t; g *= 1 - t; b *= 1 - t * 0.7; }
    }
    if (haze && hazeA > 0) {
      const t = hazeA * (1 - y / h);
      if (th < t * 1.8) { r += (haze[0] - r) * t; g += (haze[1] - g) * t; b += (haze[2] - b) * t; }
    }
    d[q] = r > 255 ? 255 : r; d[q + 1] = g > 255 ? 255 : g; d[q + 2] = b > 255 ? 255 : b;
  }
  x.putImageData(img, 0, 0);
  return c;
}

/* sunset cumulus as pixel art: a volumetric cloud crushed to five tones
   (lit rose-gold top, peach, mauve, violet belly, deep plum) with Bayer
   dithering between neighbours */
function pixelClouds() {
  const w = 480, h = 120;
  const c = pcanvas(w, h);
  const tones = ['#4a2648', '#6e3456', '#a64e5c', '#e27e62', '#ffc890'].map(hx);
  const spots = [[20, 30, 130, 52], [170, 52, 110, 40], [300, 24, 150, 58], [410, 64, 90, 34], [90, 78, 80, 28]];
  for (const [i, [cx, cy, cw, ch]] of spots.entries()) {
    const src = cumulus(3100 + i, cw, ch, 1);
    const s = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
    const im = c.x.getImageData(0, 0, w, h);
    const d = im.data;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const si = (y * src.width + x) * 4;
      const a = s[si + 3] / 255;
      if (a < 0.08) continue;
      const tx = (cx + x) % w, ty = cy + y;
      if (ty >= h) continue;
      const th = bay(tx, ty);
      if (a < 0.35 && th > a / 0.35) continue;                 // dithered, ragged edge
      // brightness from the cloud's own shading, lit more toward the top
      const lum = (s[si] + s[si + 1] + s[si + 2]) / (3 * 255);
      const v = Math.min(0.999, Math.max(0, (lum - 0.55) / 0.45 * 0.8 + (1 - y / ch) * 0.35));
      const f = v * (tones.length - 1);
      const k = Math.floor(f);
      const col = th < f - k ? tones[Math.min(tones.length - 1, k + 1)] : tones[k];
      const q = (ty * w + tx) * 4;
      d[q] = col[0]; d[q + 1] = col[1]; d[q + 2] = col[2]; d[q + 3] = 255;
    }
    c.x.putImageData(im, 0, 0);
  }
  return c;
}

export default function paint() {
  const level = makeLevel(GAME.levelW);
  const city = bakeCity();
  const near = bakeNear();
  const sun = [0.72, -0.69];
  return {
    clouds: pixelClouds(),
    mega: relight(bakeMega(), { light: sun, rim: hx('#ff9a5c'), rimA: 0.55, shade: hx('#2a1838'), shadeA: 0.3, depth: 3, tex: 0.08, seed: 11, haze: hx('#93354f'), hazeA: 0.12 }),
    city: relight(city.c, { light: sun, rim: hx('#ffb46a'), rimA: 0.5, shade: hx('#160e26'), shadeA: 0.35, depth: 3, tex: 0.1, seed: 12 }),
    beacons: city.beacons,
    jungle: relight(bakeJungle(), { light: sun, rim: hx('#ffc070'), rimA: 0.55, shade: hx('#0a1a18'), shadeA: 0.5, depth: 5, tex: 0.1, texSize: 3, seed: 13, ground: 186, aoA: 0.3 }),
    near: relight(near.c, { light: sun, rim: hx('#ffb870'), rimA: 0.6, shade: hx('#0c0a16'), shadeA: 0.5, depth: 5, tex: 0.12, texSize: 3, seed: 14, ground: 196, aoA: 0.35 }),
    falls: near.falls,
    play: relight(bakePlayfield(level), { light: sun, rim: hx('#ffc890'), rimA: 0.5, shade: hx('#0c0810'), shadeA: 0.5, depth: 4, tex: 0.12, texSize: 3, seed: 15 }),
    fg: relight(bakeFG(), { light: sun, rim: hx('#5a8a3a'), rimA: 0.4, shade: hx('#040a06'), shadeA: 0.4, depth: 3, tex: 0.1, seed: 16 }),
  };
}
