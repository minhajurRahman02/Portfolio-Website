/* Painting for 01 · Traveling. Every function here only needs a canvas, so
   the whole set runs inside a Web Worker (traveling.worker.js) and never
   blocks a frame on the page; it also runs on the main thread as a fallback
   where workers cannot draw (no OffscreenCanvas). */
import { TAU, rng, clamp, hex2rgb, rgb, bake, smeared, blurred } from '../util.js';
import { vgrad, rr } from '../paint.js';
import { tnoise, paintPixels, C, mixInto, ramp3, sstep, tree, FOLIAGE, cumulus } from '../realism.js';

/* A noise cell size that divides the strip width exactly, so every texture
   repeats with the strip: [cell size in px, cells across the strip]. */
const grid = (w, size) => { const n = Math.max(1, Math.round(w / size)); return [w / n, n]; };

const FARM_WALL = ['#E8DECB', '#D9CDB4', '#EFE7D6'];
const FARM_ROOF = ['#8E4A36', '#6E5A4E', '#9A5B3F'];

/* Mountains seen from the side. What makes a range read as real is its
   faces: every summit splits into a sunlit face and a shadowed one, and the
   split runs down from the peak. That comes from the slope of the ridge
   profile itself, measured over a window that widens with depth below the
   crest; rock detail (ridged noise along the fall line) rides on top, snow
   holds to the high, sunlit ground, forest and valley mist take the foot. */
function paintFar(farW, farH, scale) {
  const nA = tnoise(11), nB = tnoise(12), dt = tnoise(14), sn = tnoise(15);
  const topA = new Float32Array(farW + 1), topB = new Float32Array(farW + 1);
  // a peak profile: one sharp ridge octave for the summits, fbm for the rest
  const peaks = (nz, u, k, y0) => {
    const ridge = 1 - Math.abs(nz(u * k, y0, k) * 2 - 1);
    const rest = nz.fbm(u * k * 2, y0 + 3, k * 2, 5);
    return Math.pow(ridge * 0.62 + rest * 0.38, 1.6);
  };
  for (let x = 0; x <= farW; x++) {
    const u = x / farW;
    topA[x] = farH * (0.56 - peaks(nA, u, 7, 0.3) * 0.56);
    topB[x] = farH * (0.8 - peaks(nB, u, 10, 4.1) * 0.6);
  }
  const at = (arr, x) => arr[((Math.round(x) % farW) + farW) % farW];
  const [c2, n2] = grid(farW, 16);
  const [c3, n3] = grid(farW, 60);
  const hazeA = C('#C9D4E4'), hazeB = C('#B6C4D8');
  const rockD = C('#4E5A71'), rockM = C('#79859B'), rockL = C('#B9C2D1');
  const snowS = C('#A9B9D3'), snowL = C('#FBFCFE');
  const forD = C('#30444B'), forM = C('#4A5E61');
  const o = [0, 0, 0], q = [0, 0, 0];

  function face(x, y, arr, contrast, dst) {
    const top = at(arr, x), d = y - top;
    const w = 5 + d * 0.9;
    const macro = (at(arr, x - w) - at(arr, x + w)) / (2 * w);          // >0: faces the light (left)
    // rock ribs run down the fall line: diagonal, away from the summit
    const side = clamp(macro * 3, -1, 1);
    const X = x + d * side * 0.85, v = d / 26;
    const dl = dt.ridged((X - 1.2) / c2, v, n2, 4), dr = dt.ridged((X + 1.2) / c2, v, n2, 4);
    const big = sn.fbm(X / c3, d / 70, n3, 3);
    const lk = clamp(0.5 + macro * 2.1 + (dl - dr) * 2.2 * contrast + (big - 0.5) * 0.3);
    ramp3(dst, rockD, rockM, rockL, lk);
    // snow: deeper on tall peaks and on sunlit faces, fingering down the gullies
    const tall = clamp((farH * 0.46 - top) / (farH * 0.3));
    const sd = farH * (0.02 + tall * 0.18) * (0.55 + big * 0.7 + (dl - 0.4) * 0.6) * (0.6 + lk * 0.6);
    if (d < sd) {
      mixInto(q, snowS, snowL, clamp(lk * 1.3 - 0.15));
      mixInto(dst, dst, q, clamp((sd - d) / 5));
    }
    return lk;
  }

  return paintPixels(farW, farH, scale, (x, y, out) => {
    const xi = x | 0;
    const tA = topA[xi], tB = topB[xi];
    if (y >= tB) {
      const lk = face(x, y, topB, 1, o);
      const depth = (y - tB) / (farH - tB + 1);
      const f = sn.fbm(x / c2, y / 10, n2, 3);
      const forest = sstep(farH * 0.64, farH * 0.76, y + (f - 0.5) * 24);
      if (forest > 0) { ramp3(q, forD, forD, forM, clamp(lk)); mixInto(o, o, q, forest * 0.8); }
      mixInto(o, o, hazeB, clamp(0.3 + depth * 0.18 + sstep(farH * 0.74, farH, y) * 0.55));
      const edge = clamp((y - tB) * 1.6);
      if (edge < 1 && y >= tA) { face(x, y, topA, 0.6, q); mixInto(q, q, hazeA, 0.6); mixInto(o, q, o, edge); }
      out[0] = o[0]; out[1] = o[1]; out[2] = o[2]; out[3] = y >= tA ? 1 : edge;
    } else if (y >= tA) {
      face(x, y, topA, 0.6, o);
      mixInto(o, o, hazeA, clamp(0.56 + (y - tA) / farH * 0.5));
      out[0] = o[0]; out[1] = o[1]; out[2] = o[2]; out[3] = clamp((y - tA) * 1.6);
    }
  });
}

function paintHills(hillW, hillH, scale, r) {
  const n = tnoise(21), m = tnoise(22);
  const top = new Float32Array(hillW + 2), top2 = new Float32Array(hillW + 2);
  for (let x = 0; x <= hillW + 1; x++) {
    const u = x / hillW;
    top[x] = hillH * (0.44 - (n.fbm(u * 5, 0.5, 5, 4) - 0.5) * 0.55);
    top2[x] = hillH * (0.8 - (n.fbm(u * 8, 7.3, 8, 3) - 0.5) * 0.36);
  }
  // the hills are farmland: a patchwork of fields, each its own green, with
  // dark hedges where two meet. Patches come from quantised, warped noise,
  // squashed vertically because the slope is seen at a glancing angle.
  const tones = ['#6E8F4A', '#87A057', '#5F7F3E', '#A1A35F', '#7A9A4D', '#93A85E', '#58783B', '#B2AE6A'].map(C);
  const hedge = C('#2F4A26'), crestC = C('#DCE9BC'), shadeC = C('#33502A');
  const o = [0, 0, 0];
  const [gc, gn] = grid(hillW, 3);
  // fields as real farmland: rows of quadrilateral plots with straight,
  // slightly slanted boundaries, each row its own depth. Plot edges repeat
  // with the strip, so the patchwork tiles.
  const hash = (a, b) => { let k = Math.imul(a, 73856093) ^ Math.imul(b, 19349663); k = Math.imul(k ^ (k >>> 13), 1274126177); return ((k ^ (k >>> 16)) >>> 0) / 4294967296; };
  const ROWS = [];
  for (let j = 0, d = 0; j < 40; j++) {
    const h = 10 + hash(j, 1) * 16, cells = Math.max(6, Math.round(hillW / (60 + hash(j, 2) * 90)));
    const edges = [];
    for (let k = 0; k < cells; k++) edges.push(((k + 0.15 + hash(j, k + 9) * 0.7) / cells) * hillW);
    ROWS.push({ d0: d, d1: d + h, slant: (hash(j, 3) - 0.5) * 1.2, edges });
    d += h;
  }
  const bin = (x, d) => {
    let j = 0;
    while (j < ROWS.length - 1 && d >= ROWS[j].d1) j++;
    const R = ROWS[j];
    const xs = (((x - (d - R.d0) * R.slant) % hillW) + hillW) % hillW;
    let k = 0;
    while (k < R.edges.length && xs >= R.edges[k]) k++;
    return j * 64 + (k % R.edges.length);
  };
  const c = paintPixels(hillW, hillH, scale, (x, y, out) => {
    const xi = x | 0;
    const t1 = top[xi], t2 = top2[xi];
    if (y < t1) return;
    const near = y >= t2;
    const T = near ? t2 : t1, arr = near ? top2 : top;
    const d = (y - T) * 0.9 + (near ? 300 : 0);                          // separate patch sets per shoulder
    const slope = (arr[Math.max(0, xi - 3)] - arr[Math.min(hillW, xi + 3)]) / 6; // + faces the light
    const below = (y - T) / hillH;
    const b0 = bin(x, d);
    const tone = tones[Math.floor(hash(b0, 5) * tones.length)];
    const grain = n.fbm(x / gc, y / 2, gn, 2);
    const l = clamp(0.62 + slope * 1.6 - below * 0.5 + (grain - 0.5) * 0.25);
    mixInto(o, shadeC, tone, clamp(l * 1.25));
    if (l > 0.8) mixInto(o, o, crestC, (l - 0.8) * 0.9);
    // hedge where the patch changes to the right or below
    if (y - T > 2 && (bin(x + 1.3, d) !== b0 || bin(x, d + 1.1) !== b0)) mixInto(o, o, hedge, 0.62);
    if (y - T < 1.6) mixInto(o, o, crestC, 0.35 * (1 - (y - T) / 1.6));   // crest catching the light
    out[0] = o[0]; out[1] = o[1]; out[2] = o[2]; out[3] = clamp((y - T) * 1.4);
  });
  // tree lines and copses along the crest, farmhouses on the slope
  const x = c.x;
  // nothing is drawn across the strip's seam, so it repeats cleanly
  for (let px = 12; px < hillW - 12; px += r.range(5, 14)) {
    if (r() < 0.5) {
      const copse = r() < 0.18 ? r.int(3, 7) : 1;
      for (let k = 0; k < copse; k++) {
        const tx = px + k * r.range(3, 6);
        if (tx > hillW - 10) break;
        tree(x, tx, top[tx | 0] + r.range(1, 4), r.range(3.5, 7.5), r, r() < 0.4 ? FOLIAGE.far : FOLIAGE.oak, { shadow: false, shape: r() < 0.15 ? 1 : 0, trunk: false, density: 0.8 });
      }
    }
  }
  for (let k = 0; k < 5; k++) {
    const px = 40 + r() * (hillW - 120);
    const gy = top[px | 0] + hillH * r.range(0.14, 0.3);
    farmhouse(x, px, gy, r.range(8, 13), r);
    tree(x, px + r.range(20, 30), gy + 1, r.range(6, 9), r, FOLIAGE.oak, { shape: 0 });
  }
  // the nearer shoulder's crest gets its own hedge line
  for (let px = 8; px < hillW - 8; px += r.range(3, 6)) {
    if (r() < 0.32) tree(x, px, top2[px | 0] + 2, r.range(2.5, 4.5), r, FOLIAGE.hedge, { shadow: false, trunk: false, shape: 2, density: 0.9 });
  }
  return c;
}

function farmhouse(x, px, gy, s, r) {
  const w = s * 1.7, h = s, d = s * 0.55;
  const wall = r.pick(FARM_WALL), roof = r.pick(FARM_ROOF);
  // shadow side (gable end, facing away from the light)
  x.fillStyle = 'rgba(30,40,20,.3)';
  x.beginPath(); x.ellipse(px + w * 0.7, gy + 1, w * 0.75, s * 0.18, 0, 0, TAU); x.fill();
  x.fillStyle = shadeHex(wall, -0.22);
  x.beginPath(); x.moveTo(px + w, gy); x.lineTo(px + w + d, gy - d * 0.35); x.lineTo(px + w + d, gy - h - d * 0.35); x.lineTo(px + w + d * 0.5, gy - h * 1.55 - d * 0.18); x.lineTo(px + w, gy - h); x.closePath(); x.fill();
  // lit front wall with a soft vertical falloff
  x.fillStyle = vgrad(x, 0, gy - h, gy, [[0, wall], [1, shadeHex(wall, -0.1)]]);
  x.fillRect(px, gy - h, w, h);
  // roof plane with tile rows
  x.fillStyle = vgrad(x, 0, gy - h * 1.55, gy - h, [[0, shadeHex(roof, 0.12)], [1, shadeHex(roof, -0.15)]]);
  x.beginPath(); x.moveTo(px - 1.5, gy - h); x.lineTo(px + d * 0.5, gy - h * 1.55 - d * 0.18); x.lineTo(px + w + d * 0.5, gy - h * 1.55 - d * 0.18); x.lineTo(px + w + 1.5, gy - h); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 0.5;
  for (let k = 1; k < 4; k++) { const yy = gy - h - (h * 0.55 + d * 0.18) * (k / 4); x.beginPath(); x.moveTo(px + d * 0.5 * (k / 4), yy); x.lineTo(px + w + d * 0.5 * (k / 4), yy); x.stroke(); }
  // windows and door
  x.fillStyle = '#3A3F44';
  for (let k = 0; k < 2; k++) x.fillRect(px + w * (0.18 + k * 0.48), gy - h * 0.72, s * 0.24, s * 0.24);
  x.fillStyle = '#4E3B2C'; x.fillRect(px + w * 0.44, gy - h * 0.55, s * 0.22, h * 0.55);
  // chimney
  x.fillStyle = shadeHex(wall, -0.3); x.fillRect(px + w * 0.72, gy - h * 1.72, s * 0.18, h * 0.42);
}

function shadeHex(h, k) {
  const c = hex2rgb(h);
  return rgb(k < 0 ? c.map((v) => v * (1 + k)) : c.map((v) => v + (255 - v) * k));
}

function paintFields(fW, fH, scale, r) {
  const n = tnoise(31), m = tnoise(32);
  // patches: [start, end, kind]
  const kinds = ['wheat', 'pasture', 'plough', 'rape', 'pasture', 'hay', 'wheat', 'pasture'];
  const patches = [];
  let px = 0;
  while (px < fW) {
    const w = r.range(70, 210);
    patches.push([px, Math.min(fW, px + w), r.pick(kinds), r() * 0.6 - 0.3]);
    px += w;
  }
  const P = {
    wheat: [C('#9C7F3C'), C('#C9A85A'), C('#E4CB82')],
    hay: [C('#8F8A45'), C('#B5AE63'), C('#D3CC86')],
    pasture: [C('#3F6A30'), C('#62904A'), C('#8CB668')],
    plough: [C('#4E3B2C'), C('#6E5640'), C('#8A7257')],
    rape: [C('#8E9A2A'), C('#D3C53A'), C('#F1E36A')],
  };
  const o = [0, 0, 0];
  const [tc, tn] = grid(fW, 40), [fc, fn2] = grid(fW, 2.5);
  const find = (x) => { for (const p of patches) if (x < p[1]) return p; return patches[patches.length - 1]; };
  const c = paintPixels(fW, fH, scale, (x, y, out) => {
    const p = find(x);
    const pal = P[p[2]];
    // rows recede: closer together and fainter toward the top (farther away)
    const depth = y / fH;
    const rowF = 0.55 + (1 - depth) * 1.8;
    const rows = 0.5 + 0.5 * Math.sin((y * rowF + x * p[3]) * 1.1);
    const tex = n.fbm(x / tc, y / 12, tn, 4);
    const fine = m.fbm(x / fc, y / 1.6, fn2, 2);
    let l = 0.5 + (tex - 0.5) * 0.7 + (fine - 0.5) * 0.3;
    if (p[2] === 'plough') l += (rows - 0.5) * 0.5;
    else if (p[2] !== 'pasture') l += (rows - 0.5) * 0.22;
    l += depth * 0.08 - 0.04;
    ramp3(o, pal[0], pal[1], pal[2], clamp(l));
    out[0] = o[0]; out[1] = o[1]; out[2] = o[2]; out[3] = 1;
  });
  const x = c.x;
  // hedgerows along the patch boundaries, slanted with perspective
  const H5 = FOLIAGE.hedge;
  for (const [a] of patches) {
    if (a === 0) continue;
    for (let y = fH * 0.08; y < fH; y += 0.9) {
      const k = 0.6 + y / fH, hx = a + (y - fH * 0.5) * 0.18;
      x.fillStyle = H5.deep; x.beginPath(); x.ellipse(hx, y, 2.6 * k, 1.6 * k, 0, 0, TAU); x.fill();
      for (let d = 0; d < 3; d++) {
        const lit = r();
        x.fillStyle = lit < 0.4 ? H5.dark : lit < 0.75 ? H5.mid : lit < 0.93 ? H5.light : H5.hi;
        x.beginPath(); x.arc(hx + r.range(-2, 1.4) * k, y - r.range(0, 1.8) * k, r.range(0.5, 1.1) * k, 0, TAU); x.fill();
      }
    }
  }
  // lone field trees with their shadows
  for (let k = 0; k < 8; k++) {
    const tx = 20 + r() * (fW - 40), ty = fH * r.range(0.35, 0.75);
    tree(x, tx, ty, r.range(7, 12) * (0.6 + ty / fH * 0.6), r, r() < 0.5 ? FOLIAGE.oak : FOLIAGE.pale, { shape: r() < 0.2 ? 2 : 0 });
  }
  // round bales on the hay and wheat patches
  for (const [a, b, kind] of patches) {
    if (kind !== 'hay' && kind !== 'wheat') continue;
    const nb = r.int(2, 6);
    for (let k = 0; k < nb; k++) {
      const bx = r.range(a + 10, b - 10), by = fH * r.range(0.35, 0.92);
      const s = 2.4 + by / fH * 3.2;
      x.fillStyle = 'rgba(40,30,10,.3)';
      x.beginPath(); x.ellipse(bx + s * 0.6, by + s * 0.55, s * 1.3, s * 0.35, 0, 0, TAU); x.fill();
      const g = x.createRadialGradient(bx - s * 0.4, by - s * 0.4, s * 0.1, bx, by, s * 1.1);
      g.addColorStop(0, '#E8D08A'); g.addColorStop(0.6, '#BE9C52'); g.addColorStop(1, '#7E6230');
      x.fillStyle = g;
      x.beginPath(); x.ellipse(bx, by, s * 1.05, s, 0, 0, TAU); x.fill();
    }
  }
  // the top edge softens into the hills
  x.globalCompositeOperation = 'destination-out';
  x.fillStyle = vgrad(x, 0, 0, fH * 0.22, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]);
  x.fillRect(0, 0, fW, fH * 0.22);
  x.globalCompositeOperation = 'source-over';
  return c;
}

function paintEmbankment(w, h, scale) {
  // 480 px tile: every noise period divides it
  const n = tnoise(41), m = tnoise(42), g = tnoise(43);
  const vg = h * 0.2;                        // verge ends here
  const railTop = h * 0.215;
  const balD = C('#625B52'), balM = C('#877F74'), balL = C('#ABA394');
  const grD = C('#3F6132'), grM = C('#628A47'), grL = C('#93B56A');
  const soD = C('#4A5A33'), soM = C('#66773F');
  const o = [0, 0, 0];
  const c = paintPixels(w, h, scale, (x, y, out) => {
    const edge = vg + (g.fbm(x / 12, 0.5, 40, 3) - 0.5) * 6;
    if (y < edge) {
      const t = g.fbm(x / 2, y / 3, 240, 3);
      ramp3(o, grD, grM, grL, clamp(0.35 + (t - 0.5) * 1.2 + (1 - y / edge) * 0.35));
    } else {
      // ballast: stones are noise cells; the gaps between them sit in shadow
      const s1 = n(x / 3.2, y / 3.2, 150), s2 = m(x / 1.6, y / 1.6, 300);
      const stone = s1 * 0.75 + s2 * 0.25;
      // each stone lit on its upper-left: compare with the cell a little up-left
      const up = n((x - 0.9) / 3.2, (y - 0.9) / 3.2, 150);
      const lit = clamp(0.42 + (up - s1) * 0.9 + (stone - 0.5) * 0.55 - (y - edge) / h * 0.3);
      ramp3(o, balD, balM, balL, lit);
      if (stone < 0.3) mixInto(o, o, C('#3A3530'), (0.3 - stone) * 1.6);
      if (y - edge < 10) mixInto(o, o, C('#6A5240'), (1 - (y - edge) / 10) * 0.28); // rust washed off the rail
      // the lower bank greens over with weeds
      const weeds = sstep(h * 0.62, h * 0.9, y + (g.fbm(x / 10, y / 10, 48, 3) - 0.5) * 30);
      if (weeds > 0) { mixInto(o, o, g(x / 3, y / 3, 160) > 0.5 ? soM : soD, weeds); }
    }
    out[0] = o[0]; out[1] = o[1]; out[2] = o[2]; out[3] = 1;
  });
  const x = c.x;
  // concrete sleepers, ends in sunlight
  for (let sx = 2; sx < w; sx += 24) {
    x.fillStyle = vgrad(x, 0, railTop + 2, railTop + 7, [[0, '#B4AEA4'], [1, '#77716A']]);
    x.fillRect(sx, railTop + 2.2, 15, 4.6);
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(sx, railTop + 6.8, 15, 1.2);
    x.fillStyle = '#2B2E31'; x.fillRect(sx + 3, railTop + 1.4, 2, 1.6); x.fillRect(sx + 10, railTop + 1.4, 2, 1.6);
  }
  // the rail: polished head, darker web, foot
  x.fillStyle = vgrad(x, 0, railTop - 1, railTop + 2.6, [[0, '#F2F4F6'], [0.35, '#B9BFC6'], [1, '#5E646B']]);
  x.fillRect(0, railTop - 1, w, 2.6);
  x.fillStyle = '#4A4F55'; x.fillRect(0, railTop + 1.6, w, 1.1);
  x.fillStyle = '#6B5F52'; x.fillRect(0, railTop + 2.7, w, 0.9); // rust on the foot
  // verge tufts
  const r = rng(44);
  for (let k = 0; k < 140; k++) {
    const gx = r() * w, gy = vg * r.range(0.1, 1.05);
    x.strokeStyle = r.pick(['#4F7838', '#7AA352', '#3E6330', '#9BBF6E']);
    x.lineWidth = r.range(0.5, 1.1);
    x.beginPath(); x.moveTo(gx, gy + 2); x.quadraticCurveTo(gx + r.range(-1.5, 1.5), gy - 2, gx + r.range(-3, 3), gy - r.range(2, 6)); x.stroke();
  }
  return c;
}

function paintTrain(carW, carH, gap, wins, nWin, dpr) {
  const trW = carW * 2 + gap + 30, trH = carH + 26;
  const train = bake(trW, trH, Math.max(dpr, 1.5), (x) => {
    for (let c = 0; c < 2; c++) {
      const ox = c * (carW + gap);
      const front = c === 1;
      const body = () => {
        x.beginPath();
        if (front) {
          x.moveTo(ox + 6, 8); x.lineTo(ox + carW - 18, 8);
          x.quadraticCurveTo(ox + carW + 16, 10, ox + carW + 18, carH * 0.62);
          x.lineTo(ox + carW + 18, carH + 4); x.lineTo(ox + 6, carH + 4);
          x.quadraticCurveTo(ox, carH + 4, ox, carH - 2); x.lineTo(ox, 14); x.quadraticCurveTo(ox, 8, ox + 6, 8);
        } else rr(x, ox, 8, carW, carH - 4, 7);
        x.closePath();
      };
      // roof: curved, lit from above, with a rain gutter
      x.fillStyle = vgrad(x, 0, 1, 11, [[0, '#B5BAC0'], [0.6, '#8C9298'], [1, '#62676D']]);
      rr(x, ox + 3, 2, carW - (front ? 20 : 6), 10, 5); x.fill();
      // roof units (air-con, vents) with lit tops and shadowed sides
      for (let v = 0; v < 2; v++) {
        const ux = ox + carW * (0.26 + v * 0.36), uw = carW * 0.16;
        x.fillStyle = vgrad(x, 0, -2, 4, [[0, '#C9CDD2'], [1, '#7D838A']]);
        rr(x, ux, -2, uw, 6, 2); x.fill();
        x.fillStyle = 'rgba(0,0,0,.25)';
        for (let g = 2; g < uw - 2; g += 3) x.fillRect(ux + g, 0, 1, 3);
      }
      x.save(); body(); x.clip();
      // body: a cylinder lit from above — bright shoulder, soft belly shadow
      x.fillStyle = vgrad(x, 0, 8, carH * 0.62, [[0, '#CFC7B4'], [0.07, '#FBF6E9'], [0.2, '#F1E9D6'], [0.7, '#E5DBC3'], [1, '#D6CBB1']]);
      x.fillRect(ox - 2, 0, carW + 24, carH * 0.62);
      x.fillStyle = vgrad(x, 0, carH * 0.62, carH + 6, [[0, '#356B5C'], [0.35, '#2B5A4D'], [1, '#183A31']]);
      x.fillRect(ox - 2, carH * 0.62, carW + 24, carH * 0.5);
      // livery stripe with a chrome pinline
      x.fillStyle = vgrad(x, 0, carH * 0.6, carH * 0.6 + 4, [[0, '#E06A4F'], [1, '#A63F2C']]);
      x.fillRect(ox - 2, carH * 0.6, carW + 24, 4);
      x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(ox - 2, carH * 0.6 + 4, carW + 24, 0.8);
      // specular streak along the shoulder, and the sky reflected in the skirt
      x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(ox - 2, 10.5, carW + 24, 1.4);
      x.fillStyle = 'rgba(160,200,230,.12)'; x.fillRect(ox - 2, carH * 0.66, carW + 24, carH * 0.06);
      // window band glazing
      const wy = carH * 0.22, wh = carH * 0.3;
      x.fillStyle = vgrad(x, 0, wy - 3, wy + wh + 3, [[0, '#1B2422'], [1, '#2A3532']]);
      x.fillRect(ox + carW * 0.17, wy - 3, carW * 0.66, wh + 6);
      // panel seams: dark groove + lit lip
      for (let k = 0; k <= 6; k++) {
        const sx = ox + carW * (0.05 + k * 0.15);
        x.fillStyle = 'rgba(60,55,45,.28)'; x.fillRect(sx, 9, 0.8, carH);
        x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(sx + 0.8, 9, 0.6, carH);
      }
      // doors: framed, with tall windows and a handrail
      for (const dx of [0.11, 0.89]) {
        const dw = carW * 0.06, dX = ox + carW * dx - dw / 2;
        x.fillStyle = 'rgba(40,40,35,.35)'; x.fillRect(dX - 1, carH * 0.16, dw + 2, carH * 0.86);
        x.fillStyle = vgrad(x, 0, carH * 0.16, carH, [[0, '#F2EADA'], [0.6, '#E2D7BF'], [0.62, '#2E5E50'], [1, '#1D4036']]);
        x.fillRect(dX, carH * 0.17, dw, carH * 0.85);
        x.fillStyle = vgrad(x, 0, carH * 0.22, carH * 0.52, [[0, '#2C3A3A'], [1, '#151D1C']]);
        rr(x, dX + dw * 0.18, carH * 0.22, dw * 0.64, carH * 0.3, 2); x.fill();
        x.fillStyle = 'rgba(255,255,255,.16)'; x.fillRect(dX + dw * 0.22, carH * 0.23, dw * 0.12, carH * 0.27);
        x.fillStyle = '#9AA0A6'; x.fillRect(dX + dw + 1.5, carH * 0.42, 1.2, carH * 0.3);
      }
      // ambient occlusion where the body curves under
      x.fillStyle = vgrad(x, 0, carH * 0.82, carH + 6, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.35)']]);
      x.fillRect(ox - 2, carH * 0.82, carW + 24, carH * 0.3);
      x.restore();
      // window frames (glass is filled live); record their rects
      for (let k = 0; k < nWin; k++) {
        const wx = ox + carW * 0.2 + k * (carW * 0.6 / nWin) + 3;
        const ww = carW * 0.6 / nWin - 6;
        wins.push({ x: wx, y: wy, w: ww, h: wh, k: c * nWin + k });
        x.fillStyle = '#121816';
        rr(x, wx - 2, wy - 2, ww + 4, wh + 4, 4.5); x.fill();
        x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 0.8;
        rr(x, wx - 2, wy - 2, ww + 4, wh + 4, 4.5); x.stroke();
      }
      if (front) {
        // cab: raked windscreen, wiper, headlights, destination blind
        x.fillStyle = vgrad(x, 0, carH * 0.18, carH * 0.52, [[0, '#2E3C40'], [1, '#141B1C']]);
        x.beginPath(); x.moveTo(ox + carW - 8, carH * 0.18); x.lineTo(ox + carW + 7, carH * 0.2); x.lineTo(ox + carW + 14, carH * 0.52); x.lineTo(ox + carW - 8, carH * 0.52); x.fill();
        x.fillStyle = 'rgba(255,255,255,.22)';
        x.beginPath(); x.moveTo(ox + carW - 4, carH * 0.2); x.lineTo(ox + carW + 2, carH * 0.2); x.lineTo(ox + carW + 6, carH * 0.5); x.lineTo(ox + carW + 1, carH * 0.5); x.fill();
        x.strokeStyle = '#2A2C2E'; x.lineWidth = 1;
        x.beginPath(); x.moveTo(ox + carW + 6, carH * 0.5); x.lineTo(ox + carW + 1, carH * 0.3); x.stroke();
        x.fillStyle = '#101414'; rr(x, ox + carW - 40, carH * 0.08 + 2, carW * 0.075, 6, 1.5); x.fill();
        x.fillStyle = '#F2B23A'; x.font = `600 ${Math.max(4, carH * 0.05)}px system-ui`; x.fillText('LOCAL', ox + carW - 38.5, carH * 0.08 + 6.6);
        for (const hy of [0.72, 0.8]) {
          const g = x.createRadialGradient(ox + carW + 15, carH * hy, 0.4, ox + carW + 15, carH * hy, 3.2);
          g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, '#E9E4D2'); g.addColorStop(1, '#7D7C74');
          x.fillStyle = g; x.beginPath(); x.arc(ox + carW + 15, carH * hy, 2.8, 0, TAU); x.fill();
        }
        x.fillStyle = '#2B2D30'; x.fillRect(ox + carW + 6, carH * 0.92, 14, 6); // coupler head
      }
      // car number
      x.fillStyle = 'rgba(240,235,220,.75)'; x.font = `600 ${Math.max(4, carH * 0.055)}px system-ui`;
      x.fillText(front ? '2106' : '2105', ox + carW * 0.07, carH * 0.86);
      // underframe equipment between the bogies
      x.fillStyle = vgrad(x, 0, carH + 2, carH + 9, [[0, '#3A3D41'], [1, '#1E2023']]);
      x.fillRect(ox + carW * 0.32, carH + 3, carW * 0.36, 6);
      x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(ox + carW * 0.32, carH + 3, carW * 0.36, 0.8);
      // bogies: frame, springs, wheels with rims and hubs
      for (const bx of [0.18, 0.82]) {
        const cx = ox + carW * bx;
        x.fillStyle = vgrad(x, 0, carH + 3, carH + 11, [[0, '#3A3C40'], [1, '#18191B']]);
        rr(x, cx - 23, carH + 3, 46, 8, 2); x.fill();
        x.strokeStyle = '#55595E'; x.lineWidth = 0.9;
        for (const sx of [-6, 6]) { x.beginPath(); for (let k = 0; k <= 5; k++) x.lineTo(cx + sx + (k % 2 ? 1.6 : -1.6), carH + 3.5 + k * 1.1); x.stroke(); }
        for (const wx of [-13, 13]) {
          const g = x.createRadialGradient(cx + wx - 1.5, carH + 10.5, 0.5, cx + wx, carH + 12, 7);
          g.addColorStop(0, '#5E6268'); g.addColorStop(0.55, '#2B2D30'); g.addColorStop(0.85, '#1A1B1D'); g.addColorStop(1, '#8A8F95');
          x.fillStyle = g; x.beginPath(); x.arc(cx + wx, carH + 12, 6.6, 0, TAU); x.fill();
          x.fillStyle = '#6E7379'; x.beginPath(); x.arc(cx + wx, carH + 12, 1.6, 0, TAU); x.fill();
        }
      }
    }
    // gangway bellows between the cars
    x.fillStyle = '#1F2224'; x.fillRect(carW - 1, carH * 0.15, gap + 2, carH * 0.8);
    x.fillStyle = 'rgba(255,255,255,.12)';
    for (let k = 0; k < 4; k++) x.fillRect(carW + k * (gap / 4), carH * 0.15, 0.7, carH * 0.8);
  });
  return { train, trW, trH };
}

function paintPole(H, topY) {
  const h = Math.round(H - topY + 12), w = 96;
  return bake(w, h, 1.5, (x) => {
    const cx = w / 2;
    const r = rng(71);
    // tapered wooden pole, rounded by light from the left
    const g = x.createLinearGradient(cx - 6, 0, cx + 6, 0);
    g.addColorStop(0, '#6A5442'); g.addColorStop(0.35, '#4C3B2E'); g.addColorStop(1, '#231A14');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(cx - 3.6, 0); x.lineTo(cx + 3.6, 0); x.lineTo(cx + 5.6, h); x.lineTo(cx - 5.6, h); x.fill();
    x.strokeStyle = 'rgba(20,14,10,.35)'; x.lineWidth = 0.5;
    for (let k = 0; k < 9; k++) { const gx = cx + r.range(-3, 3); x.beginPath(); x.moveTo(gx, r() * h * 0.3); x.lineTo(gx + r.range(-0.6, 0.6), h * r.range(0.5, 1)); x.stroke(); }
    // crossarm, its brace and three glass insulators
    x.fillStyle = vgrad(x, 0, 6, 12, [[0, '#6E5845'], [1, '#2E241C']]);
    x.fillRect(cx - 42, 6, 84, 5.5);
    x.strokeStyle = '#2A2019'; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(cx - 26, 11); x.lineTo(cx - 2, 26); x.moveTo(cx + 26, 11); x.lineTo(cx + 2, 26); x.stroke();
    for (let k = 0; k < 3; k++) {
      const ix = cx - 31 + k * 30;
      const ig = x.createLinearGradient(ix - 2.5, 0, ix + 2.5, 0);
      ig.addColorStop(0, '#CFE8E2'); ig.addColorStop(0.5, '#7FB3A9'); ig.addColorStop(1, '#3F6A63');
      x.fillStyle = ig;
      x.beginPath(); x.moveTo(ix - 2.6, 6); x.lineTo(ix - 1.6, 1); x.quadraticCurveTo(ix, -0.6, ix + 1.6, 1); x.lineTo(ix + 2.6, 6); x.fill();
    }
  });
}

function paintGrass(gW, gH, dpr, mobile) {
  const raw = bake(gW, gH, dpr, (x, w, h) => {
    const r = rng(51);
    x.fillStyle = vgrad(x, 0, h * 0.45, h, [[0, 'rgba(60,96,44,0)'], [0.35, '#3F6A31'], [1, '#2C4C24']]);
    x.fillRect(0, 0, w, h);
    const blade = (bx, base, bh, bw, lean, c0, c1) => {
      for (const ox of [0, -w, w]) {
        const X = bx + ox;
        if (X < -40 || X > w + 40) continue;
        const g = x.createLinearGradient(0, base, 0, base - bh);
        g.addColorStop(0, c0); g.addColorStop(1, c1);
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(X - bw, base);
        x.quadraticCurveTo(X - bw * 0.4 + lean * 0.4, base - bh * 0.55, X + lean, base - bh);
        x.quadraticCurveTo(X + bw * 0.4 + lean * 0.4, base - bh * 0.55, X + bw, base);
        x.fill();
      }
    };
    // three depths of grass: back (dim), middle, front (tall, lit tips)
    const passes = [
      [w * 0.6, [0.5, 0.8], [0.15, 0.4], [0.6, 1.4], ['#2E4E26', '#5C7F45']],
      [w * 0.7, [0.62, 0.95], [0.25, 0.6], [0.9, 1.9], ['#30542A', '#77A055']],
      [w * 0.4, [0.8, 1.08], [0.35, 0.9], [1.2, 2.6], ['#2A4A23', '#9CC06C']],
    ];
    for (const [n, by, bh, bw, [c0, c1]] of passes) {
      for (let k = 0; k < n; k++) {
        const base = h * r.range(by[0], by[1]);
        const tip = r() < 0.18 ? '#C9C27A' : c1;            // a few dry, sunlit blades
        blade(r() * w, base, h * r.range(bh[0], bh[1]), r.range(bw[0], bw[1]), r.range(-14, 14), c0, tip);
      }
    }
    // seed heads and wildflowers
    for (let k = 0; k < w * 0.05; k++) {
      const fx = r() * w, fy = h * r.range(0.2, 0.75), s = r.range(1.4, 3.2);
      const kind = r();
      if (kind < 0.45) {        // daisy: white petals, yellow heart, petals darker on the shadow side
        x.fillStyle = '#F4F1E6';
        for (let p = 0; p < 8; p++) { const a = p / 8 * TAU; x.beginPath(); x.ellipse(fx + Math.cos(a) * s * 0.8, fy + Math.sin(a) * s * 0.45, s * 0.55, s * 0.22, a, 0, TAU); x.fill(); }
        x.fillStyle = '#E2B53A'; x.beginPath(); x.arc(fx, fy, s * 0.38, 0, TAU); x.fill();
      } else if (kind < 0.75) { // knapweed / clover heads
        x.fillStyle = r() < 0.5 ? '#9B6FC0' : '#C77BA8';
        for (let p = 0; p < 7; p++) { x.beginPath(); x.arc(fx + r.range(-s, s) * 0.5, fy + r.range(-s, s) * 0.4, s * 0.35, 0, TAU); x.fill(); }
      } else {                  // buttercup
        x.fillStyle = '#F2C230'; x.beginPath(); x.arc(fx, fy, s * 0.6, 0, TAU); x.fill();
        x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.arc(fx - s * 0.2, fy - s * 0.2, s * 0.2, 0, TAU); x.fill();
      }
    }
  });
  // motion blur along the direction of travel, plus a little depth of field
  return smeared(blurred(raw, 1.4), mobile ? 3.5 : 5);
}

/** Paints every layer for a W×H viewport. Returns plain canvases plus the
 *  geometry the scene needs (train size, window rects, pole top). */
export function paintAll({ W, H, dpr, mobile }) {
  const key = `${W}x${H}x${dpr}`;
  const r = rng(101);
  // painted surfaces are soft, so a desktop paints them near CSS resolution;
  // a phone has few CSS pixels but a dense screen, so it paints at device
  // resolution or the ridgelines step visibly
  const sc = mobile ? Math.max(1, dpr) : Math.min(dpr, 1.1);
  const t0 = performance.now();
  const clouds = [];
  const nC = mobile ? 5 : 8;
  for (let i = 0; i < nC; i++) {
    const cw = Math.round(W * r.range(0.2, 0.38) * (mobile ? 1.6 : 1));
    const ch = Math.round(cw * r.range(0.36, 0.5));
    clouds.push({ spr: cumulus(200 + i, cw, ch, 0.42), x: r() * W * 2.2, y: H * r.range(0.04, 0.32), d: r.range(0.03, 0.08) });
  }
  const farW = Math.round(Math.max(W * 1.4, 1000)), farH = Math.round(H * 0.36);
  const hillW = Math.round(W * 1.6), hillH = Math.round(H * 0.3);
  const fW = Math.round(W * 1.8), fH = Math.round(H * 0.2);
  const eH = Math.round(H * 0.16);
  const carW = Math.round(clamp(W * 0.29, 230, 470));
  const carH = Math.round(carW * 0.26);
  const nWin = 6;
  const wins = [];
  const tr = paintTrain(carW, carH, 8, wins, nWin, dpr);
  const topY = H * 0.14;
  const T = {};
  const time = (k, fn) => { const a = performance.now(); const v = fn(); T[k] = Math.round(performance.now() - a); return v; };
  const out = {
    key, clouds, carW, carH, nWin, wins, topY, ...tr,
    far: time('far', () => paintFar(farW, farH, sc * (mobile ? 0.9 : 0.75))),
    hills: time('hills', () => paintHills(hillW, hillH, sc, rng(22))),
    fields: time('fields', () => paintFields(fW, fH, sc, rng(33))),
    emb: time('emb', () => paintEmbankment(480, eH, Math.max(1, sc))),
    pole: time('pole', () => paintPole(H, topY)),
    grass: time('grass', () => paintGrass(Math.round(W * 1.3), Math.round(H * 0.24), dpr, mobile)),
  };
  T.total = Math.round(performance.now() - t0);
  out.times = T;
  return out;
}
