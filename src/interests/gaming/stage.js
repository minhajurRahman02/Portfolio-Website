/* Mission 4 backdrops and playfield, baked as pixel strips at load.
   Every layer shares one 216-px-tall pixel grid; the strips tile
   horizontally and scroll at their own depth. */
import { rng } from '../util.js';
import { C, pcanvas, pline, pdisc, outline } from './sprites.js';
import { text } from './font.js';

export const H = 216;
export const GROUND = 188;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const dither = (x, y, t) => BAYER[(y & 3) * 4 + (x & 3)] < t * 16;

const SKY = ['#1e1433', '#3a1d45', '#62284f', '#93354f', '#c64c46', '#e8703d', '#ff9a4a', '#ffc46e'];

/** Push a whole strip back in depth: a flat wash over its opaque pixels. */
function depthTint(x, w, col) {
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = col;
  x.fillRect(0, 0, w, H);
  x.globalCompositeOperation = 'source-over';
}

/* ------------------------------------------------------------- level map */
export function makeLevel(levelW) {
  const PITS = [[930, 1004]];
  const SLABS = [[1176, 1424, 170]];
  const BOSS_X = levelW - 64;
  const ground = (x) => {
    for (const [a, b] of PITS) if (x > a && x < b) return null;
    for (const [a, b, y] of SLABS) if (x >= a && x <= b) return y;
    return GROUND;
  };
  /* jumps the hero takes, keyed to x: [x0, x1, apex height] */
  const JUMPS = [[528, 604, 30], [912, 1022, 34], [1150, 1186, 26], [1418, 1452, 14], [2026, 2094, 30], [2380, 2420, 16]];
  return { PITS, SLABS, ground, JUMPS, BOSS_X, levelW };
}

/* ------------------------------------------------------------- sky */
export function bakeSky(w, h) {
  const c = pcanvas(w, h);
  const im = c.x.createImageData(w, h);
  const cols = SKY.map(hx);
  const horizon = h - 70;
  const sx = Math.round(w * 0.66), sy = horizon - 22, sr = 17;
  const sun = hx('#fff1b8'), sunEdge = hx('#ffd27a');
  for (let y = 0; y < h; y++) {
    const u = Math.min(1, Math.max(0, (y - (h - 216)) / horizon)) * (cols.length - 1);
    const i = Math.min(cols.length - 2, Math.floor(u));
    const f = u - i;
    for (let x = 0; x < w; x++) {
      let col = dither(x, y, f) ? cols[i + 1] : cols[i];
      const d = Math.hypot(x - sx, (y - sy) * 1.05);
      if (d < sr) col = d > sr - 2 ? sunEdge : sun;
      else if (d < sr + 22) { const t = 1 - (d - sr) / 22; if (dither(x, y, t * 0.7)) col = cols[cols.length - 1]; }
      // horizontal cloud streaks across the sun
      if ((Math.abs(y - (sy + 6)) < 1 || Math.abs(y - (sy - 4)) < 1 || Math.abs(y - (sy + 12)) < 2) && Math.abs(x - sx) < 70 - Math.abs(y - sy) * 2 && ((x * 7 + y * 3) % 23) > 4) col = cols[3];
      const k = (y * w + x) * 4;
      im.data[k] = col[0]; im.data[k + 1] = col[1]; im.data[k + 2] = col[2]; im.data[k + 3] = 255;
    }
  }
  c.x.putImageData(im, 0, 0);
  return { c, sun: [sx, sy] };
}

/* ------------------------------------------------------------- clouds */
export function bakeClouds() {
  const w = 480, h = 120;
  const c = pcanvas(w, h);
  const im = c.x.createImageData(w, h);
  const r = rng(71);
  const blobs = [];
  for (let k = 0; k < 9; k++) {
    const cx = r() * w, cy = r.range(30, 90), n = r.int(4, 7);
    for (let j = 0; j < n; j++) blobs.push([cx + r.range(-30, 30), cy + r.range(-8, 6), r.range(8, 18)]);
  }
  const lit = hx('#ff9a5c'), mid = hx('#c25a4f'), dark = hx('#7a3a52');
  const B = new Float32Array(w * h).fill(-1), BY = new Float32Array(w * h);
  // splat each blob over its own bounding box (wrapping), keeping the strongest
  for (const [bx, cy, br] of blobs) {
    for (let y = Math.max(0, Math.floor(cy - br)); y < Math.min(h, Math.ceil(cy + br)); y++) {
      for (let xx = Math.floor(bx - br); xx < Math.ceil(bx + br); xx++) {
        const d = Math.hypot(xx - bx, (y - cy) * 1.6);
        if (d >= br) continue;
        const k = y * w + ((xx % w) + w) % w;
        const v = 1 - d / br;
        if (v > B[k]) { B[k] = v; BY[k] = (y - cy) / br; }
      }
    }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const best = B[y * w + x], by = BY[y * w + x];
    if (best < 0) continue;
    if (best < 0.12 && !dither(x, y, best / 0.12)) continue;
    const col = by < -0.25 ? lit : by < 0.3 ? (dither(x, y, (by + 0.25) / 0.55) ? mid : lit) : (dither(x, y, (by - 0.3) / 0.7) ? dark : mid);
    const k = (y * w + x) * 4;
    im.data[k] = col[0]; im.data[k + 1] = col[1]; im.data[k + 2] = col[2]; im.data[k + 3] = 255;
  }
  c.x.putImageData(im, 0, 0);
  return c;
}

/* ------------------------------------------------------------- far megastructures */
export function bakeMega() {
  const w = 640, c = pcanvas(w, H), x = c.x, r = rng(81);
  const base = 158;
  x.fillStyle = '#4a2d52';
  // a broken arcology dome
  for (let yy = 0; yy < 38; yy++) { const ww = Math.round(Math.sqrt(1 - (yy / 38) ** 2) * 70); x.fillRect(420 - ww, base - yy, ww * 2, 1); }
  x.fillStyle = '#3d2547';
  for (let k = 0; k < 7; k++) x.fillRect(360 + k * 18, base - 30 + Math.abs(k - 3) * 4, 2, 30);
  // towers with jagged, broken crowns
  let px = 0;
  while (px < w) {
    const tw = r.int(14, 34), th = r.int(40, 104);
    if (px > 340 && px < 500) { px += tw; continue; }
    x.fillStyle = '#3f2849';
    x.fillRect(px, base - th, tw, H);
    for (let k = 0; k < tw; k += 2) { const j = r.int(0, 10); x.fillRect(px + k, base - th - j, 2, j); }
    x.fillStyle = '#56355c';
    x.fillRect(px, base - th, 1, th);
    x.fillStyle = '#6b4067';
    for (let wy = base - th + 6; wy < base; wy += 5) for (let wx = px + 3; wx < px + tw - 2; wx += 4) if (r() < 0.35) x.fillRect(wx, wy, 1, 2);
    x.fillStyle = '#ffc46e';
    for (let k = 0; k < 2; k++) if (r() < 0.4) x.fillRect(px + r.int(2, tw - 3), base - r.int(10, th - 4), 1, 1);
    px += tw + r.int(2, 14);
  }
  // collapsed sky bridge
  x.fillStyle = '#3f2849';
  pline(x, 120, base - 70, 200, base - 58, 4, '#3f2849');
  pline(x, 200, base - 58, 214, base - 30, 3, '#3f2849');
  // haze at the foot
  for (let y = base - 22; y < H; y++) for (let xx = 0; xx < w; xx++) if (dither(xx, y, (y - (base - 22)) / 40)) { x.fillStyle = '#93354f'; x.fillRect(xx, y, 1, 1); }
  return c;
}

/* ------------------------------------------------------------- distant city ruins */
export function bakeCity() {
  const w = 560, c = pcanvas(w, H), x = c.x, r = rng(91);
  const base = 176, beacons = [];
  let px = 0;
  while (px < w) {
    const bw = r.int(12, 30), bh = r.int(22, 64);
    x.fillStyle = '#2a2140';
    x.fillRect(px, base - bh, bw, H);
    if (r() < 0.5) { const cut = r.int(4, 12); x.clearRect(px + bw - cut, base - bh, cut, r.int(4, 14)); }
    x.fillStyle = '#e8703d';
    x.fillRect(px + bw - 1, base - bh + 2, 1, bh - 2);
    x.fillStyle = '#3d3058';
    for (let wy = base - bh + 4; wy < base; wy += 4) for (let wx = px + 2; wx < px + bw - 2; wx += 3) if (r() < 0.45) x.fillRect(wx, wy, 1, 2);
    if (r() < 0.35) {
      x.fillStyle = '#2a2140'; x.fillRect(px + (bw >> 1), base - bh - 12, 1, 12);
      beacons.push([px + (bw >> 1), base - bh - 13, r() * 6]);
    }
    px += bw + r.int(1, 8);
  }
  for (let y = base - 10; y < H; y++) for (let xx = 0; xx < w; xx++) if (dither(xx, y, (y - (base - 10)) / 30)) { x.fillStyle = '#62284f'; x.fillRect(xx, y, 1, 1); }
  return { c, beacons };
}

/* ------------------------------------------------------------- mid jungle */
export function bakeJungle() {
  const w = 720, c = pcanvas(w, H), x = c.x, r = rng(101);
  const base = 186;
  // cracked cooling towers
  for (const tx of [120, 470]) {
    const tw = 54, th = 96;
    for (let yy = 0; yy < th; yy++) {
      const u = yy / th;
      const half = Math.round(tw / 2 * (0.62 + 0.55 * (u - 0.45) ** 2 * 3));
      x.fillStyle = yy % 9 === 0 ? '#4b5a5a' : '#5d6c68';
      x.fillRect(tx - half, base - th + yy, half * 2, 1);
      x.fillStyle = '#3b4848'; x.fillRect(tx - half, base - th + yy, 3, 1);
      x.fillStyle = '#7c8a82'; x.fillRect(tx + half - 2, base - th + yy, 1, 1);
    }
    x.clearRect(tx - 6, base - th - 1, 22, 8);
    pline(x, tx + 4, base - th + 10, tx - 8, base - th + 40, 1, '#2c3636');
    pline(x, tx - 8, base - th + 40, tx + 2, base - th + 62, 1, '#2c3636');
    // moss on the rim
    x.fillStyle = C.jg2; for (let k = -20; k < 20; k += 2) if (r() < 0.7) x.fillRect(tx + k, base - th + r.int(0, 5), 2, r.int(2, 8));
  }
  // canopy masses
  for (let k = 0; k < 26; k++) {
    const cx = r() * w, cy = base - r.range(10, 60), rad = r.int(10, 22);
    pdisc(x, cx, cy, rad, C.jg1);
    pdisc(x, cx - 3, cy - 4, rad - 5, '#2a5e33');
    for (let j = 0; j < rad * 2; j++) { x.fillStyle = C.jg2; x.fillRect(Math.round(cx - rad * 0.6 + r() * rad), Math.round(cy - rad * 0.7 + r() * rad * 0.5), 2, 1); }
  }
  // giant ferns
  for (let k = 0; k < 14; k++) {
    const fx = r() * w, fy = base;
    for (let a = -1.3; a <= 1.3; a += 0.32) {
      const len = r.int(18, 34);
      const ex = fx + Math.sin(a) * len, ey = fy - Math.cos(a) * len * 0.9;
      pline(x, fx, fy, ex, ey, 1, C.jg2);
      for (let j = 3; j < len; j += 3) {
        const u = j / len, px = fx + Math.sin(a) * j, py = fy - Math.cos(a) * j * 0.9;
        x.fillStyle = u > 0.6 ? C.jg3 : C.jg2;
        x.fillRect(Math.round(px - 2), Math.round(py), 2, 1);
        x.fillRect(Math.round(px + 1), Math.round(py), 2, 1);
      }
    }
  }
  // hanging vines
  for (let k = 0; k < 18; k++) { const vx = r() * w, vy = r.range(40, 110), L = r.int(20, 60); pline(x, vx, vy, vx + r.int(-3, 3), vy + L, 1, C.jg1); }
  x.fillStyle = C.jg1; x.fillRect(0, base, w, H);
  depthTint(x, w, 'rgba(98,40,79,.22)');
  return c;
}

/* ------------------------------------------------------------- near machinery */
export function bakeNear() {
  const w = 800, c = pcanvas(w, H), x = c.x, r = rng(111);
  const base = 196;
  const pipe = (x0, y0, x1, th) => {
    x.fillStyle = C.steel1; x.fillRect(x0, y0, x1 - x0, th);
    x.fillStyle = C.steel2; x.fillRect(x0, y0 + 1, x1 - x0, 1);
    x.fillStyle = C.steel0; x.fillRect(x0, y0 + th - 2, x1 - x0, 2);
    for (let k = x0; k < x1; k += 26) { x.fillStyle = C.steel0; x.fillRect(k, y0 - 1, 3, th + 2); }
    for (let k = 0; k < (x1 - x0) / 30; k++) { x.fillStyle = r() < 0.5 ? C.rust1 : C.rust0; x.fillRect(x0 + r() * (x1 - x0), y0 + r.int(2, th - 3), r.int(3, 9), r.int(1, 3)); }
  };
  // a rusted storage tank
  const tk0 = '#3e2622', tk1 = '#5e3328', tk2 = '#8a4a34';
  x.fillStyle = tk0; x.fillRect(40, 122, 70, base - 122);
  x.fillStyle = tk1; x.fillRect(43, 122, 64, base - 122);
  x.fillStyle = tk2; x.fillRect(47, 124, 3, base - 126);
  for (let y = 130; y < base; y += 12) { x.fillStyle = tk0; x.fillRect(40, y, 70, 2); }
  for (let yy = 0; yy < 8; yy++) { const ww = Math.round(Math.sqrt(1 - (yy / 8) ** 2) * 35); x.fillStyle = tk1; x.fillRect(75 - ww, 122 - yy, ww * 2, 1); }
  pline(x, 52, 122, 52, 100, 1, C.steel0); pline(x, 52, 100, 130, 100, 1, C.steel0);
  // lattice girder tower
  for (let y = 40; y < base; y += 12) {
    pline(x, 300, y, 330, y + 12, 1, C.steel0); pline(x, 330, y, 300, y + 12, 1, C.steel0);
  }
  x.fillStyle = C.steel1; x.fillRect(298, 40, 3, base - 40); x.fillRect(329, 40, 3, base - 40);
  // pipes
  pipe(130, 132, 300, 9);
  pipe(332, 120, 500, 7);
  pipe(520, 140, 800, 10);
  x.fillStyle = C.steel1; x.fillRect(600, 60, 8, 82); x.fillStyle = C.steel2; x.fillRect(601, 60, 1, 82);
  // waterfall gap: left clear and marked; animated live
  x.fillStyle = '#26323c'; x.fillRect(492, 50, 24, base - 50);
  x.fillStyle = C.steel0; x.fillRect(488, 46, 32, 6);
  // vines draped over everything
  for (let k = 0; k < 30; k++) {
    const vx = r() * w, vy = r.range(40, 140), L = r.int(16, 54);
    let px = vx, py = vy;
    for (let j = 0; j < L; j += 2) { const nx = px + Math.sin(j * 0.3 + k) * 1.2; pline(x, px, py, nx, py + 2, 1, j % 6 ? C.jg2 : C.jg3); px = nx; py += 2; }
  }
  // big leaves at the base
  for (let k = 0; k < 22; k++) {
    const lx = r() * w, ly = base - r.int(0, 10), L = r.int(10, 22), a = r.range(-1.2, 1.2);
    pline(x, lx, ly, lx + Math.sin(a) * L, ly - Math.cos(a) * L, 3, C.jg2);
    pline(x, lx, ly, lx + Math.sin(a) * L * 0.8, ly - Math.cos(a) * L * 0.8, 1, C.jg3);
  }
  x.fillStyle = C.jg1; x.fillRect(0, base, w, H);
  depthTint(x, w, 'rgba(34,16,44,.3)');
  return { c, falls: [494, 52, 20, base - 52] };
}

/* ------------------------------------------------------------- playfield */
export function bakePlayfield(level) {
  const { levelW, ground, PITS, SLABS } = level;
  const c = pcanvas(levelW, H);
  const x = c.x;
  const r = rng(121);
  // ground columns
  for (let px = 0; px < levelW; px++) {
    const g = ground(px);
    if (g === null) continue;
    if (g !== GROUND) continue; // slabs drawn separately
    x.fillStyle = C.dirt1; x.fillRect(px, g, 1, H - g);
    x.fillStyle = C.jg3; x.fillRect(px, g, 1, 2);
    x.fillStyle = C.jg2; x.fillRect(px, g + 2, 1, 1);
    if (r() < 0.3) { x.fillStyle = C.jg4; x.fillRect(px, g - r.int(1, 3), 1, r.int(1, 3)); }
    if (r() < 0.12) { x.fillStyle = C.jg3; x.fillRect(px, g + 3, 1, r.int(1, 4)); }
  }
  for (let k = 0; k < levelW * 0.4; k++) { x.fillStyle = r() < 0.5 ? C.dirt2 : C.dirt0; const px = r() * levelW; if (ground(px) === GROUND) x.fillRect(px, GROUND + r.int(5, 26), r.int(1, 3), r.int(1, 2)); }
  for (let px = 0; px < levelW; px += 16) if (ground(px) === GROUND) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(px, GROUND + 6, 1, 22); }
  // pit with water
  for (const [a, b] of PITS) {
    x.fillStyle = C.dirt0; x.fillRect(a, GROUND, 2, H); x.fillRect(b - 2, GROUND, 2, H);
    x.fillStyle = '#1b5568'; x.fillRect(a + 2, 204, b - a - 4, H);
  }
  // steel slab platform
  for (const [a, b, y] of SLABS) {
    x.fillStyle = C.steel0; x.fillRect(a, y, b - a, 8);
    x.fillStyle = C.steel1; x.fillRect(a, y, b - a, 2);
    x.fillStyle = C.steel2; x.fillRect(a, y, b - a, 1);
    for (let k = a; k < b; k += 8) { x.fillStyle = (k / 8) % 2 ? C.gold : C.ink; x.fillRect(k, y + 4, 4, 3); }
    for (let k = a + 10; k < b; k += 40) { x.fillStyle = C.steel0; x.fillRect(k, y + 8, 6, GROUND - y - 8); x.fillStyle = C.steel1; x.fillRect(k, y + 8, 1, GROUND - y - 8); }
    for (let k = a + 4; k < b; k += 12) { x.fillStyle = C.steel2; x.fillRect(k, y + 2, 1, 1); }
  }
  const crate = (cx, cy) => {
    x.fillStyle = '#7a4a24'; x.fillRect(cx, cy, 16, 16);
    x.fillStyle = '#9c6432'; x.fillRect(cx + 1, cy + 1, 14, 14);
    pline(x, cx + 2, cy + 2, cx + 13, cy + 13, 2, '#5a3418');
    pline(x, cx + 13, cy + 2, cx + 2, cy + 13, 2, '#5a3418');
    x.fillStyle = '#5a3418'; x.fillRect(cx, cy, 16, 1); x.fillRect(cx, cy + 15, 16, 1); x.fillRect(cx, cy, 1, 16); x.fillRect(cx + 15, cy, 1, 16);
  };
  const barrel = (bx, by) => {
    x.fillStyle = C.rust0; x.fillRect(bx, by - 14, 10, 14);
    x.fillStyle = '#a8342a'; x.fillRect(bx + 1, by - 14, 8, 14);
    x.fillStyle = C.rust2; x.fillRect(bx + 2, by - 13, 1, 12);
    x.fillStyle = C.rust0; x.fillRect(bx, by - 10, 10, 1); x.fillRect(bx, by - 4, 10, 1);
    x.fillStyle = C.gold; x.fillRect(bx + 4, by - 8, 2, 2);
  };
  crate(556, GROUND - 16); crate(556, GROUND - 32); crate(572, GROUND - 16);
  crate(2046, GROUND - 16); crate(2062, GROUND - 16); crate(2054, GROUND - 32);
  [380, 1106, 1124, 2214, 2480].forEach((bx) => barrel(bx, GROUND));
  // mission sign
  x.fillStyle = '#5a3418'; x.fillRect(64, GROUND - 26, 3, 26);
  x.fillStyle = '#9c6432'; x.fillRect(48, GROUND - 40, 46, 16);
  x.fillStyle = '#7a4a24'; x.fillRect(48, GROUND - 26, 46, 2);
  text(x, 'MIS 4', 52, GROUND - 36, '#fff1b8', 1, '#5a3418');
  // ruined wall with the arcade
  x.fillStyle = '#4a4458'; x.fillRect(704, GROUND - 58, 126, 58);
  for (let k = 0; k < 126; k += 3) x.clearRect(704 + k, GROUND - 58, 3, r.int(0, 12));
  x.fillStyle = '#5d5670'; for (let yy = GROUND - 50; yy < GROUND; yy += 8) x.fillRect(704, yy, 126, 1);
  x.fillStyle = '#3a3448'; for (let yy = GROUND - 50; yy < GROUND; yy += 8) for (let k = 704 + ((yy / 8) % 2) * 8; k < 830; k += 16) x.fillRect(k, yy, 1, 8);
  // arcade cabinet (screen lit live)
  x.fillStyle = '#3a1d5a'; x.fillRect(780, GROUND - 40, 22, 40);
  x.fillStyle = '#5a2d8a'; x.fillRect(782, GROUND - 40, 18, 6);
  x.fillStyle = '#141020'; x.fillRect(783, GROUND - 31, 16, 12);
  x.fillStyle = '#2a1a40'; x.fillRect(780, GROUND - 17, 22, 3);
  x.fillStyle = C.red; x.fillRect(786, GROUND - 16, 2, 1); x.fillStyle = C.gold; x.fillRect(792, GROUND - 16, 2, 1);
  // car wreck
  x.fillStyle = '#5a3a2a'; x.fillRect(1880, GROUND - 14, 56, 10);
  x.fillStyle = '#7a4a34'; x.fillRect(1892, GROUND - 24, 32, 11);
  x.fillStyle = '#26323c'; x.fillRect(1896, GROUND - 22, 11, 7); x.fillRect(1910, GROUND - 22, 11, 7);
  x.fillStyle = C.ink; pdisc(x, 1892, GROUND - 3, 4, C.ink); pdisc(x, 1924, GROUND - 3, 4, C.ink);
  x.fillStyle = C.jg2; for (let k = 0; k < 20; k++) x.fillRect(1882 + r() * 52, GROUND - 16 - r.int(0, 10), 2, 2);
  // fossil skull half-buried near the ambush
  x.fillStyle = '#d9cfb4'; x.fillRect(1612, GROUND - 9, 22, 9); x.fillRect(1630, GROUND - 6, 10, 6);
  x.fillStyle = '#5a4a3a'; x.fillRect(1618, GROUND - 7, 4, 3); for (let k = 0; k < 5; k++) x.fillRect(1631 + k * 2, GROUND - 2, 1, 2);
  // fern clump the raptor bursts out of
  for (let a = -1.4; a <= 1.4; a += 0.22) {
    const L = 30 + Math.cos(a) * 10;
    pline(x, 1790, GROUND, 1790 + Math.sin(a) * L, GROUND - Math.cos(a) * L, 2, a > 0 ? C.jg3 : C.jg2);
  }
  // broken lamp posts
  for (const lx of [1500, 2300]) {
    x.fillStyle = C.steel0; x.fillRect(lx, GROUND - 54, 3, 54);
    pline(x, lx + 1, GROUND - 54, lx + 12, GROUND - 60, 2, C.steel0);
    x.fillStyle = '#26323c'; x.fillRect(lx + 10, GROUND - 60, 6, 3);
  }
  // arena: hazard-striped concrete
  const a0 = levelW - 300;
  x.fillStyle = '#6a6a72'; x.fillRect(a0, GROUND, 300, 3);
  for (let k = a0; k < levelW; k += 10) { x.fillStyle = (k / 10) % 2 ? C.gold : C.ink; x.fillRect(k, GROUND + 3, 5, 2); }
  x.fillStyle = '#4a4458'; x.fillRect(a0 - 10, GROUND - 30, 12, 30); x.fillRect(levelW - 8, GROUND - 70, 8, 70);
  // puddles reflecting the sunset
  for (const pxp of [300, 1300, 2160, 2600]) { if (ground(pxp) !== GROUND) continue; x.fillStyle = '#e8703d'; x.fillRect(pxp, GROUND + 1, 18, 1); x.fillStyle = '#ffc46e'; x.fillRect(pxp + 4, GROUND + 1, 6, 1); }
  return c;
}

/* ------------------------------------------------------------- foreground framing */
export function bakeFG() {
  const w = 900, c = pcanvas(w, H), x = c.x, r = rng(131);
  for (let k = 0; k < 7; k++) {
    const lx = r() * w, L = r.int(24, 56);
    // hanging leaf clusters from the top edge
    for (let j = 0; j < 6; j++) {
      const a = r.range(-0.6, 0.6), ll = r.int(12, L);
      pline(x, lx + j * 3, -2, lx + j * 3 + Math.sin(a) * ll, Math.cos(a) * ll, 4, C.jg0);
      pline(x, lx + j * 3, -2, lx + j * 3 + Math.sin(a) * ll * 0.8, Math.cos(a) * ll * 0.8, 1, C.jg1);
    }
  }
  for (let k = 0; k < 9; k++) {
    const gx = r() * w;
    for (let j = 0; j < 8; j++) { const a = r.range(-0.9, 0.9), L = r.int(8, 20); pline(x, gx, H + 2, gx + Math.sin(a) * L, H - Math.cos(a) * L, 3, C.jg0); }
  }
  return c;
}
