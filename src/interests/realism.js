/* =====================================================================
   REALISM — a small painting toolkit for the scenes that are meant to read
   as painted landscapes rather than flat vector shapes.

   - tileable 2-D noise (period in x), so painted strips repeat seamlessly
     when drawTiled() scrolls them;
   - a per-pixel painter (ImageData), for surfaces whose colour depends on
     light, slope and texture at every point: rock, grass, cloud, ballast;
   - foliage painted as hundreds of small lit dabs instead of a few circles;
   - a multiply tint for time of day that keeps the shading underneath,
     where a flat source-atop fill turned everything into one-colour cut-outs.
   ===================================================================== */
import { TAU, clamp, lerp, rng, makeCanvas, newCanvas, hex2rgb, rgb, blurred } from './util.js';

/* ---------------- tileable value noise ----------------
   Lattice hashed with x wrapped to `px` cells, so f(x + px, y) === f(x, y).
   fbm doubles the period with the frequency, so every octave tiles too. */
export function tnoise(seed = 1) {
  const r = rng(seed);
  const N = 1024;
  const V = Float32Array.from({ length: N }, () => r());
  const h = (i, j) => {
    let k = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
    k = Math.imul(k ^ (k >>> 13), 1274126177);
    return V[(k ^ (k >>> 16)) & (N - 1)];
  };
  const f = (x, y, px = 1 << 20) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px;
    const a = h(x0, yi), b = h(x1, yi), c = h(x0, yi + 1), d = h(x1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  /** fractal sum, 0..1. `px` is the period of the FIRST octave in cells. */
  f.fbm = (x, y, px, oct = 5, gain = 0.5) => {
    let s = 0, a = 0.5, n = 0, p = px;
    for (let i = 0; i < oct; i++) {
      s += f(x, y, p) * a; n += a;
      x *= 2; y *= 2; p *= 2; a *= gain;
    }
    return s / n;
  };
  /** ridged fractal (sharp crests, eroded gullies), 0..1 */
  f.ridged = (x, y, px, oct = 5) => {
    let s = 0, a = 0.5, n = 0, p = px, w = 1;
    for (let i = 0; i < oct; i++) {
      let v = 1 - Math.abs(f(x, y, p) * 2 - 1);
      v *= v * w;
      w = clamp(v * 1.6);
      s += v * a; n += a;
      x *= 2; y *= 2; p *= 2; a *= 0.5;
    }
    return s / n;
  };
  return f;
}

/* ---------------- per-pixel painter ----------------
   Paints a canvas of CSS size w×h at `scale` device px per CSS px.
   fn(x, y, out) gets CSS coordinates and writes [r, g, b, a] (0..255, a 0..1)
   into out; leave out[3] = 0 for transparent. The canvas keeps the
   makeCanvas() transform, so further vector work can be drawn on top. */
export function paintPixels(w, h, scale, fn) {
  const c = makeCanvas(w, h, scale);
  const X = c.width, Y = c.height;
  const img = c.x.createImageData(X, Y);
  const d = img.data;
  const out = [0, 0, 0, 0];
  const k = 1 / scale;
  let i = 0;
  for (let py = 0; py < Y; py++) {
    const y = (py + 0.5) * k;
    for (let px = 0; px < X; px++, i += 4) {
      out[3] = 0;
      fn((px + 0.5) * k, y, out);
      const a = out[3];
      if (a <= 0) continue;
      d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2];
      d[i + 3] = a >= 1 ? 255 : a * 255;
    }
  }
  c.x.putImageData(img, 0, 0);
  return c;
}

/* colour helpers that work on [r,g,b] arrays without allocating */
export const C = (h) => hex2rgb(h);
export function mixInto(out, a, b, t) {
  out[0] = a[0] + (b[0] - a[0]) * t;
  out[1] = a[1] + (b[1] - a[1]) * t;
  out[2] = a[2] + (b[2] - a[2]) * t;
  return out;
}
/** three-way ramp: dark → mid → light at t in 0..1 */
export function ramp3(out, d, m, l, t) {
  return t < 0.5 ? mixInto(out, d, m, t * 2) : mixInto(out, m, l, (t - 0.5) * 2);
}
export const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

/* ---------------- foliage ----------------
   A tree crown as a lit volume: a soft dark mass, then many small leaf dabs
   whose colour comes from where they sit on an imagined sphere relative to
   the light (upper left), with jitter so it never looks like a gradient.
   `shape` 0 = round, 1 = tall/poplar, 2 = wide/spreading. */
export function tree(ctx, x, y, s, r, pal, { trunk = true, shadow = true, shape = 0, density = 1 } = {}) {
  const rx = s * (shape === 1 ? 0.45 : shape === 2 ? 1.25 : 0.85);
  const ry = s * (shape === 1 ? 1.35 : shape === 2 ? 0.7 : 0.9);
  const cy = y - ry - s * (trunk ? 0.45 : 0.05);
  if (shadow) {
    ctx.fillStyle = 'rgba(20,32,14,.28)';
    ctx.beginPath(); ctx.ellipse(x + s * 0.35, y + 0.5, rx * 1.05, Math.max(1, s * 0.16), 0, 0, TAU); ctx.fill();
  }
  if (trunk) {
    const tw = Math.max(1, s * 0.12);
    ctx.fillStyle = pal.trunk || '#3E3024';
    ctx.beginPath();
    ctx.moveTo(x - tw, y); ctx.lineTo(x - tw * 0.6, cy + ry * 0.4); ctx.lineTo(x + tw * 0.6, cy + ry * 0.4); ctx.lineTo(x + tw, y);
    ctx.fill();
  }
  // clusters: the crown is several lumps, which is what reads as foliage
  const lumps = [];
  const nl = shape === 1 ? 4 : 5 + Math.floor(r() * 4);
  for (let i = 0; i < nl; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * 0.55;
    lumps.push([x + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d * 0.9 - (shape === 1 ? (i / nl - 0.5) * ry : 0), (0.45 + r() * 0.35)]);
  }
  ctx.fillStyle = pal.deep;
  for (const [lx, ly, k] of lumps) { ctx.beginPath(); ctx.ellipse(lx, ly, rx * k, ry * k * 0.92, 0, 0, TAU); ctx.fill(); }
  const n = Math.round(Math.min(900, (rx * ry) * 1.9 * density) + 12);
  const dab = Math.max(0.6, s * 0.075);
  const lx0 = -0.62, ly0 = -0.78; // light direction (upper left)
  for (let i = 0; i < n; i++) {
    const L = lumps[i % lumps.length];
    const a = r() * TAU, d = Math.pow(r(), 0.6);
    const ux = Math.cos(a) * d, uy = Math.sin(a) * d;
    const px = L[0] + ux * rx * L[2], py = L[1] + uy * ry * L[2] * 0.92;
    // sphere normal of the lump at this point → lambert term
    const nz = Math.sqrt(Math.max(0, 1 - ux * ux - uy * uy));
    let lit = clamp(0.35 + (ux * lx0 + uy * ly0) * 0.55 + nz * 0.25 + (r() - 0.5) * 0.35);
    // lower lumps are shaded by the ones above
    lit *= clamp(1.15 - (py - (cy - ry)) / (ry * 2.2));
    ctx.fillStyle = lit < 0.33 ? pal.dark : lit < 0.62 ? pal.mid : lit < 0.86 ? pal.light : pal.hi;
    ctx.beginPath();
    ctx.ellipse(px, py, dab * (0.7 + r() * 0.8), dab * (0.5 + r() * 0.6), r() * TAU, 0, TAU);
    ctx.fill();
  }
}

export const FOLIAGE = {
  oak: { deep: '#1E3519', dark: '#2C4A22', mid: '#3F6330', light: '#5E8443', hi: '#88A85E', trunk: '#3A2D22' },
  pale: { deep: '#2A4220', dark: '#3A5A2B', mid: '#557A3B', light: '#7C9E52', hi: '#A9C274', trunk: '#4A3A2A' },
  hedge: { deep: '#1A2E16', dark: '#263F1E', mid: '#365629', light: '#4E7238', hi: '#6F914C' },
  far: { deep: '#3E5A3E', dark: '#4C6A48', mid: '#5C7A55', light: '#728E66', hi: '#8EA67D', trunk: '#4B4A40' },
};

/* ---------------- time-of-day tint that keeps the shading ----------------
   multiply by a colour faded from white by `amount`, then clip back to the
   layer's own alpha. Dusk warms and darkens the light while every shadow,
   ridge and leaf stays readable; night is dark blue, not a flat silhouette. */
export function mulTinter(src) {
  const c = newCanvas(src.width, src.height);
  c.w = src.w; c.h = src.h;
  const x = c.getContext('2d');
  let key = '';
  return (col, amount) => {
    const f = [lerp(255, col[0], amount), lerp(255, col[1], amount), lerp(255, col[2], amount)];
    const k = `${f[0] | 0},${f[1] | 0},${f[2] | 0}`;
    if (k === key) return c;
    key = k;
    x.globalCompositeOperation = 'copy';
    x.drawImage(src, 0, 0);
    if (amount > 0.004) {
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = rgb(f);
      x.fillRect(0, 0, c.width, c.height);
      x.globalCompositeOperation = 'destination-in';
      x.drawImage(src, 0, 0);
    }
    x.globalCompositeOperation = 'source-over';
    return c;
  };
}

/* ---------------- volumetric cumulus ----------------
   Density = a few gaussian lobes (the cloud's shape) eroded by fbm, with a
   flattened base. Lighting marches a few steps toward the light: the more
   cloud in between, the darker the point (self-shadowing), and thin edges
   facing the light get a silver rim. Baked neutral; the scene tints it. */
export function cumulus(seed, w, h, scale = 0.8) {
  const r = rng(seed);
  const nz = tnoise(seed * 7 + 1);
  const lobes = [];
  const n = 10 + Math.floor(r() * 8);
  for (let i = 0; i < n; i++) {
    const u = 0.14 + r() * 0.72;
    const hump = Math.pow(Math.sin(u * Math.PI), 1.4);
    lobes.push([u * w, h * (0.74 - hump * (0.2 + r() * 0.28)), w * (0.05 + r() * 0.05) * (0.7 + hump * 0.7), h * (0.12 + r() * 0.1) * (0.7 + hump * 0.6)]);
  }
  const base = h * 0.8;
  const GW = Math.ceil(w * scale), GH = Math.ceil(h * scale);
  const D = new Float32Array(GW * GH);
  for (let gy = 0; gy < GH; gy++) {
    for (let gx = 0; gx < GW; gx++) {
      const x = gx / scale, y = gy / scale;
      let s = 0;
      for (const [lx, ly, ax, ay] of lobes) {
        const dx = (x - lx) / ax, dy = (y - ly) / ay;
        const q = dx * dx + dy * dy;
        if (q < 9) s += Math.exp(-q * 1.2);                     // beyond 3σ adds nothing
      }
      if (s < 0.05) continue;
      // billows: low-frequency erosion carves the outline into cauliflower
      // lumps, high frequency frays the edges into wisps
      const e = nz.fbm(x / 30, y / 30, 1 << 16, 3);
      const f = nz.fbm(x / 7 + 50, y / 7, 1 << 16, 3);
      let d = s * (0.55 + e * 0.8) - 0.5 + (f - 0.5) * 0.35;
      d *= 1 - sstep(base - h * 0.08, base + h * 0.05, y);          // flat-ish base
      D[gy * GW + gx] = clamp(d * 1.6);
    }
  }
  const lit = C('#FFFFFF'), core = C('#F0F3F8'), shade = C('#C9D2E1'), deep = C('#A1ADC2');
  const o = [0, 0, 0];
  const step = Math.max(1, Math.round(3 * scale));
  return paintPixels(w, h, scale, (x, y, out) => {
    const gx = Math.min(GW - 1, (x * scale) | 0), gy = Math.min(GH - 1, (y * scale) | 0);
    const d = D[gy * GW + gx];
    if (d <= 0.01) return;
    // march toward the light (up, slightly left): cloud in between shades this point
    let occ = 0;
    for (let k = 1; k <= 6; k++) {
      const sx = gx - k * step * 0.45, sy = gy - k * step;
      if (sx < 0 || sy < 0) break;
      occ += D[(sy | 0) * GW + (sx | 0)];
    }
    const T = Math.exp(-occ * 0.55);
    const under = sstep(h * 0.5, base, y);                           // bellies are greyer
    ramp3(o, deep, shade, core, clamp(0.3 + T * 0.75 - under * 0.3));
    if (T > 0.75) mixInto(o, o, lit, (T - 0.75) * 4);
    if (d < 0.3 && T > 0.55) mixInto(o, o, lit, (0.3 - d) * 2);    // silver lining
    out[0] = o[0]; out[1] = o[1]; out[2] = o[2];
    out[3] = clamp(d * 1.6) * (0.75 + T * 0.25);
  });
}

/* ---------------- post-pass over pixels already drawn ----------------
   Vector shapes give the forms; a pass over their pixels adds what vectors
   cannot: grain, wear, light falloff, bounce light. fn(x, y, px) gets CSS
   coordinates and the pixel [r, g, b, a] (0..255) to change in place.
   Transparent pixels are skipped unless `all`. */
export function postPixels(c, fn, all = false) {
  const X = c.width, Y = c.height;
  const k = (c.w || X) / X;
  const img = c.getContext('2d').getImageData(0, 0, X, Y);
  const d = img.data;
  const px = [0, 0, 0, 0];
  for (let py = 0, i = 0; py < Y; py++) {
    const y = (py + 0.5) * k;
    for (let qx = 0; qx < X; qx++, i += 4) {
      if (!all && d[i + 3] === 0) continue;
      px[0] = d[i]; px[1] = d[i + 1]; px[2] = d[i + 2]; px[3] = d[i + 3];
      fn((qx + 0.5) * k, y, px);
      d[i] = px[0]; d[i + 1] = px[1]; d[i + 2] = px[2]; d[i + 3] = px[3];
    }
  }
  const x = c.getContext('2d');
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.putImageData(img, 0, 0); x.restore();
  return c;
}

/** multiply a pixel's colour by k (scalar or [r,g,b]) */
export function mulPx(px, k) {
  if (typeof k === 'number') { px[0] *= k; px[1] *= k; px[2] *= k; }
  else { px[0] *= k[0]; px[1] *= k[1]; px[2] *= k[2]; }
  if (px[0] > 255) px[0] = 255; if (px[1] > 255) px[1] = 255; if (px[2] > 255) px[2] = 255;
}
/** blend a pixel toward colour c by t */
export function towardPx(px, c, t) {
  px[0] += (c[0] - px[0]) * t; px[1] += (c[1] - px[1]) * t; px[2] += (c[2] - px[2]) * t;
}

/** Grain: brightness varies with fbm at two scales, as paint, paper, plaster
 *  and fabric do. amt ≈ 0.1–0.3. */
export function grain(c, seed = 1, amt = 0.16, size = 3, fine = 0.08) {
  const nz = tnoise(seed);
  const B = 1 << 20;
  return postPixels(c, (x, y, px) => {
    const g = (nz.fbm(x / (size * 8), y / (size * 8), B, 3) - 0.5) * amt + (nz(x / size + 91, y / size, B) - 0.5) * fine;
    mulPx(px, 1 + g);
  });
}

/** Draw shapes with only their soft shadow (the shape itself is moved far
 *  off-canvas). Contact and cast shadows are what seat objects in a room. */
export function softShadow(ctx, blur, color, ox, oy, draw) {
  ctx.save();
  const m = ctx.getTransform();
  const k = m.a;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * k;
  ctx.shadowOffsetX = 20000 * k + ox * k;
  ctx.shadowOffsetY = oy * k;
  ctx.translate(-20000, 0);
  draw(ctx);
  ctx.restore();
}

/* ---------------- ridgelines and faceted ranges ----------------
   A non-tiling ridge profile (tops in CSS px for every x), and a range
   painted from it with the same face lighting as Traveling's mountains:
   every summit splits into a sunlit and a shadowed face, rock ribs run down
   the fall line, snow keeps to high sunlit ground, haze fills the foot. */
export function profile(w, seed, base, amp, k = 5, sharp = 0.6) {
  const nz = tnoise(seed);
  const B = 1 << 20;
  const top = new Float32Array(Math.ceil(w) + 2);
  for (let x = 0; x < top.length; x++) {
    const u = x / w;
    const ridge = 1 - Math.abs(nz(u * k, 0.3, B) * 2 - 1);
    const rest = nz.fbm(u * k * 2, 3.3, B, 5);
    top[x] = base - Math.pow(ridge * sharp + rest * (1 - sharp), 1.5) * amp;
  }
  return top;
}

export function range(w, h, scale, top, o) {
  const {
    seed = 5, light = -1, rock = ['#4E5A71', '#79859B', '#B9C2D1'], snow = null, snowLine = 0.35,
    haze = '#C9D4E4', hazeTop = 0.2, hazeFoot = 0.75, forest = null, forestAt = 0.6, rib = 1,
  } = o;
  const dt = tnoise(seed), sn = tnoise(seed + 3);
  const B = 1 << 20;
  const rD = C(rock[0]), rM = C(rock[1]), rL = C(rock[2]);
  const sS = snow ? C(snow[0]) : null, sL = snow ? C(snow[1]) : null;
  const hz = C(haze);
  const fD = forest ? C(forest[0]) : null, fM = forest ? C(forest[1]) : null;
  const at = (x) => top[Math.max(0, Math.min(top.length - 1, Math.round(x)))];
  let minTop = Infinity; for (const v of top) minTop = Math.min(minTop, v);
  const q = [0, 0, 0], g = [0, 0, 0];
  return paintPixels(w, h, scale, (x, y, out) => {
    const t = at(x), d = y - t;
    if (d < 0) return;
    const win = 5 + d * 0.9;
    const macro = (at(x - win) - at(x + win)) / (2 * win) * -light;
    const side = clamp(macro * 3, -1, 1);
    const X = x + d * side * 0.85, v = d / 26;
    const dl = dt.ridged((X - 1.2) / 16, v, B, 4), dr = dt.ridged((X + 1.2) / 16, v, B, 4);
    const big = sn.fbm(X / 60, d / 70, B, 3);
    const lk = clamp(0.5 + macro * 2.1 + (dl - dr) * 2.2 * rib * -light + (big - 0.5) * 0.3);
    ramp3(q, rD, rM, rL, lk);
    if (snow) {
      const tall = clamp((h * snowLine - t) / (h * 0.3));
      const sd = h * (0.015 + tall * 0.12) * (0.5 + big * 0.8 + (dl - 0.4) * 0.7) * (0.5 + lk * 0.7);
      if (d < sd) { mixInto(g, sS, sL, clamp(lk * 1.3 - 0.15)); mixInto(q, q, g, clamp((sd - d) / 4)); }
    }
    if (forest) {
      const f = sn.fbm(x / 9, y / 7, B, 3);
      const fo = sstep(h * forestAt - 8, h * forestAt + 10, y + (f - 0.5) * 30 - (t - minTop) * 0.25);
      if (fo > 0) {
        // conifers: vertical speckle of lit and shaded crowns
        const tr = dt(x / 1.6, y / 3.2, B);
        ramp3(g, fD, fD, fM, clamp(lk * 0.8 + (tr - 0.5) * 0.9));
        mixInto(q, q, g, fo * 0.92);
      }
    }
    const depth = (y - t) / (h - minTop + 1);
    mixInto(q, q, hz, clamp(hazeTop + depth * 0.15 + sstep(h * hazeFoot, h, y) * 0.6));
    out[0] = q[0]; out[1] = q[1]; out[2] = q[2]; out[3] = clamp(d * 1.6);
  });
}

/* ---------------- wood ----------------
   Grain as stretched noise with growth rings (a slow sine through warped
   noise), the way planks and veneer show it. Returns 0..1. */
export function woodAt(nz, x, y, along = 'x', ring = 1) {
  const B = 1 << 20;
  const a = along === 'x' ? x : y, b = along === 'x' ? y : x;
  const w = nz.fbm(a / 160, b / 14, B, 4);
  // growth rings: near-parallel lines along the board, gently warped
  const rings = 0.5 + 0.5 * Math.sin(b * 0.9 * ring + w * 7);
  const late = Math.pow(rings, 6);                     // thin dark latewood lines
  const fib = nz(a / 40, b * 1.4, B);                  // fibres, long and fine
  const fig = nz.fbm(a / 300, b / 40, B, 3);           // slow colour drift
  return clamp(0.62 - late * 0.4 + (fib - 0.5) * 0.22 + (fig - 0.5) * 0.5);
}

/** Rim light: the band of a shape's top edge `d` px deep (the shape minus
 *  itself moved down), tinted, softened and laid back on the shape. Light
 *  from above catching every upper edge — rock lips, shoulders, leaves. */
export function rimLight(c, color, d = 2, soft = 1, a = 0.6, dx = 0) {
  const t = newCanvas(c.width, c.height);
  const x = t.getContext('2d');
  const k = c.width / (c.w || c.width);
  x.drawImage(c, 0, 0);
  x.globalCompositeOperation = 'destination-out';
  x.drawImage(c, dx * k, d * k);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, t.width, t.height);
  const src = soft > 0.6 ? blurred(Object.assign(t, { w: c.w, h: c.h }), soft * k) : t;
  const cx = c.getContext('2d');
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0);
  cx.globalCompositeOperation = 'source-atop';
  cx.globalAlpha = a;
  cx.drawImage(src, 0, 0);
  cx.restore();
  return c;
}

/* ---------------- boulders ----------------
   Rocks as a height field: every blob is an ellipsoid [cx, cy, rx, ry, rz]
   (rz is how far it bulges toward the viewer), roughened with fbm. Normals
   from the field's slope give real form lighting — tops lit, undersides in
   shadow, crevices dark where two stones meet. o.colour(n, x, y, out) can
   recolour (algae on the tops, sand below); otherwise a rock ramp is used. */
export function boulders(w, h, scale, blobs, o = {}) {
  const { seed = 9, rough = 0.6, light = [-0.35, -0.8, 0.5], rock = ['#1A2A30', '#3C5A60', '#7FA2A0'], colour = null, detail = 10 } = o;
  const nz = tnoise(seed);
  const GW = Math.ceil(w * scale), GH = Math.ceil(h * scale);
  const Z = new Float32Array(GW * GH).fill(-1);
  for (const [cx, cy, rx, ry, rz] of blobs) {
    const x0 = Math.max(0, Math.floor((cx - rx) * scale)), x1 = Math.min(GW - 1, Math.ceil((cx + rx) * scale));
    const y0 = Math.max(0, Math.floor((cy - ry) * scale)), y1 = Math.min(GH - 1, Math.ceil((cy + ry) * scale));
    for (let gy = y0; gy <= y1; gy++) {
      const y = gy / scale, dy = (y - cy) / ry;
      for (let gx = x0; gx <= x1; gx++) {
        const x = gx / scale, dx = (x - cx) / rx;
        let q = 1 - dx * dx - dy * dy;
        if (q <= 0) continue;
        q = Math.sqrt(q);
        const n = nz.fbm(x / detail, y / detail, 1 << 20, 5) - 0.5;
        const z = q * rz + n * rz * rough * q + rz * 0.15;
        const i = gy * GW + gx;
        if (z > Z[i]) Z[i] = z;
      }
    }
  }
  let L = light; const ll = Math.hypot(L[0], L[1], L[2]); L = [L[0] / ll, L[1] / ll, L[2] / ll];
  const rD = C(rock[0]), rM = C(rock[1]), rL = C(rock[2]);
  const out3 = [0, 0, 0], N = [0, 0, 0];
  return paintPixels(w, h, scale, (x, y, out) => {
    const gx = Math.min(GW - 1, (x * scale) | 0), gy = Math.min(GH - 1, (y * scale) | 0);
    const i = gy * GW + gx;
    const z = Z[i];
    if (z < 0) return;
    const ml = !(gx > 0 && Z[i - 1] >= 0), mr = !(gx < GW - 1 && Z[i + 1] >= 0);
    const mu = !(gy > 0 && Z[i - GW] >= 0), md = !(gy < GH - 1 && Z[i + GW] >= 0);
    const zl = ml ? z - 2 : Z[i - 1], zr = mr ? z - 2 : Z[i + 1], zu = mu ? z - 2 : Z[i - GW], zd = md ? z - 2 : Z[i + GW];
    const sx = (zr - zl) * scale * 0.5, sy = (zd - zu) * scale * 0.5;
    const nl = Math.hypot(sx, sy, 1);
    N[0] = -sx / nl; N[1] = -sy / nl; N[2] = 1 / nl;
    const lam = clamp(N[0] * L[0] + N[1] * L[1] + N[2] * L[2]);
    // crevices: lower than the neighbourhood
    const cav = clamp(1 - Math.max(0, ((zl + zr + zu + zd) / 4 - z)) * 0.6);
    const sh = clamp(lam * 0.85 + 0.12) * cav;
    if (colour) colour(N, x, y, out3, sh, z);
    else ramp3(out3, rD, rM, rL, sh);
    out[0] = out3[0]; out[1] = out3[1]; out[2] = out3[2];
    out[3] = (ml || mr || mu || md) ? 0.6 : 1;
  });
}
