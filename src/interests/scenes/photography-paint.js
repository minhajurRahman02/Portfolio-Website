/* Painting for 02 · Photography — "Rack Focus". A morning valley under a
   low sun (upper left): a far snow range, a forested mid range, a still
   lake holding their reflection, a lupine meadow with oaks, deep grass,
   and macro flora right at the lens. Each layer comes back sharp plus two
   blur levels, so the focal plane can travel through the scene. */
import { TAU, rng, clamp, blurred, makeCanvas } from '../util.js';
import { vgrad } from '../paint.js';
import { tnoise, paintPixels, C, mixInto, ramp3, sstep, tree, FOLIAGE, profile, range, postPixels, mulPx, towardPx, softShadow } from '../realism.js';

const BLUR = [0, 5, 14];
const B = 1 << 20;
const stack = (c) => [c, blurred(c, BLUR[1]), blurred(c, BLUR[2])];

function paintSky(W, H) {
  const nz = tnoise(201);
  const top = C('#8FB6E0'), mid = C('#C9DDEF'), low = C('#F5E4CF'), warm = C('#FFE7C2'), wisp = C('#FFFFFF');
  const sx = W * 0.22, sy = H * 0.18;
  const o = [0, 0, 0];
  return paintPixels(W, H, 0.5, (x, y, out) => {
    const v = y / (H * 0.6);
    ramp3(o, top, mid, low, clamp(v * 1.05));
    // forward scattering around the low sun
    const d = Math.hypot(x - sx, (y - sy) * 1.3) / Math.max(W, H);
    mixInto(o, o, warm, clamp(0.55 - d * 1.4) * 0.8);
    // thin cirrus, stretched along the wind
    const c = nz.fbm(x / 260 + y / 900, y / 26, B, 5);
    const cir = sstep(0.55, 0.78, c) * (1 - v * 0.6) * 0.5;
    mixInto(o, o, wisp, cir);
    out[0] = o[0]; out[1] = o[1]; out[2] = o[2]; out[3] = 1;
  });
}

/* far snow range + nearer forested ridge, one strip */
function paintMountains(W, h, sc) {
  const far = range(W, h, sc, profile(W, 31, h * 0.52, h * 0.44, 6, 0.65), {
    seed: 33, rock: ['#5E6C8C', '#8592B0', '#B8C1D6'], snow: ['#B9C6DE', '#F6F8FD'], snowLine: 0.3,
    haze: '#C8D5E8', hazeTop: 0.36, hazeFoot: 0.55, rib: 0.55,
  });
  const nearTop = profile(W, 37, h * 0.9, h * 0.5, 4, 0.3);
  const mid = range(W, h, sc, nearTop, {
    seed: 38, rock: ['#4D6170', '#6F8496', '#9DB0BE'], haze: '#B5C6D9', hazeTop: 0.32, hazeFoot: 0.86,
    forest: ['#2C4A45', '#4A6B5E'], forestAt: 0.5, rib: 0.45,
  });
  const c = makeCanvas(W, h, sc);
  c.x.drawImage(far, 0, 0, W, h);
  c.x.drawImage(mid, 0, 0, W, h);
  return { c, nearTop };
}

/* the lake: shoreline trees, the range mirrored (rippled, darker, bluer),
   glitter under the sun */
function paintLake(W, lh, mtn, mtnH, sc, mobile) {
  const r = rng(206);
  const shore = lh * 0.22;
  const c = makeCanvas(W, lh, sc);
  const x = c.x;
  // water body: deeper blue toward the viewer
  x.fillStyle = vgrad(x, 0, shore, lh, [[0, '#B3C8DE'], [0.35, '#7FA3C4'], [1, '#4E7BA3']]);
  x.fillRect(0, shore, W, lh - shore);
  // the mirror image of the range, squashed a little
  x.save();
  x.beginPath(); x.rect(0, shore, W, lh - shore); x.clip();
  x.globalAlpha = 0.62;
  x.translate(0, shore);
  x.scale(1, -0.9);
  x.drawImage(mtn, 0, -mtnH * 0.85, W, mtnH);
  x.restore();
  // a far shore treeline and its reflection
  const trees = [];
  for (let px = -6; px < W + 6; px += r.range(2.5, 6)) trees.push([px, r.range(3, 7.5), r() < 0.3 ? 1 : 0]);
  const tl = makeCanvas(W, shore + 2, sc);
  for (const [px, s, shape] of trees) tree(tl.x, px, shore + 1, s, r, FOLIAGE.far, { shadow: false, trunk: false, shape, density: 0.7 });
  x.save(); x.globalAlpha = 0.55; x.translate(0, shore * 2 + 1); x.scale(1, -1); x.drawImage(tl, 0, 0, W, shore + 2); x.restore();
  x.drawImage(tl, 0, 0, W, shore + 2);
  // ripples: displace each row sideways and darken the troughs
  const nz = tnoise(207);
  const src = makeCanvas(W, lh, sc);
  src.x.drawImage(c, 0, 0, W, lh);
  const sd = src.x.getImageData(0, 0, src.width, src.height).data;
  const SW = src.width;
  const sky = C('#DCE7F2'), deep = C('#3F6D96');
  postPixels(c, (px0, py, px) => {
    if (py < shore + 0.5) return;
    const u = (py - shore) / (lh - shore);
    const wave = nz.fbm(px0 / 60, py / (1.2 + u * 3), B, 3) - 0.5;
    const dx = wave * (4 + u * 26);
    const sxp = Math.max(0, Math.min(SW - 1, Math.floor((px0 + dx) * sc)));
    const i = (Math.min(src.height - 1, Math.floor(py * sc)) * SW + sxp) * 4;
    px[0] = sd[i]; px[1] = sd[i + 1]; px[2] = sd[i + 2];
    // fresnel: the far water reflects sky, the near water shows its depth
    towardPx(px, sky, clamp(0.28 - u * 0.4) + Math.max(0, wave) * 0.25 * (1 - u));
    towardPx(px, deep, u * 0.35);
    mulPx(px, 0.94 + wave * 0.16);
  });
  // glitter under the sun and calm streaks
  for (let k = 0; k < (mobile ? 90 : 220); k++) {
    const gx = W * clamp(0.22 + (r() - 0.5) * 0.5 * (0.4 + r())), gy = shore + (lh - shore) * Math.pow(r(), 1.6);
    x.fillStyle = `rgba(255,250,232,${r.range(0.25, 0.85)})`;
    x.fillRect(gx, gy, r.range(2, 10) * (1 + (gy - shore) / lh), 0.8);
  }
  for (let k = 0; k < 9; k++) {
    const gy = shore + 3 + (lh - shore) * Math.pow(r(), 1.3) * 0.8;
    x.fillStyle = 'rgba(225,236,246,.22)';
    x.fillRect(0, gy, W, r.range(0.6, 1.6));
  }
  // morning mist lying on the water
  x.fillStyle = vgrad(x, 0, shore - lh * 0.12, shore + lh * 0.2, [[0, 'rgba(238,242,248,0)'], [0.45, 'rgba(238,242,248,.55)'], [1, 'rgba(238,242,248,0)']]);
  x.fillRect(0, shore - lh * 0.12, W, lh * 0.32);
  return c;
}

/* the meadow across the water: a rolling bank with drifts of lupine and
   lavender, oaks casting long shadows away from the sun */
function paintMeadow(W, h, sc, mobile) {
  const r = rng(208);
  const nz = tnoise(209), fl = tnoise(210);
  const top = new Float32Array(Math.ceil(W) + 2);
  for (let i = 0; i < top.length; i++) top[i] = h * (0.2 + (nz.fbm(i / W * 3, 0.5, B, 4) - 0.5) * 0.18);
  const gD = C('#4F7536'), gM = C('#7FA352'), gL = C('#B9D184'), gHi = C('#E3E7B0');
  const lav = C('#9A7CCB'), lavL = C('#C2AAE8'), wh = C('#F4F0E4');
  const o = [0, 0, 0], q = [0, 0, 0];
  const c = paintPixels(W, h, sc, (x, y, out) => {
    const t = top[x | 0];
    if (y < t) return;
    const d = (y - t) / (h - t);
    const slope = (top[Math.max(0, (x | 0) - 6)] - top[Math.min(top.length - 1, (x | 0) + 6)]) / 12;
    const tuft = nz(x / 1.4, y / 3.5, B), mott = nz.fbm(x / 40, y / 14, B, 4);
    const lk = clamp(0.55 + slope * 3 + (mott - 0.5) * 0.5 + (tuft - 0.5) * 0.35 * (0.4 + d) - d * 0.1);
    ramp3(o, gD, gM, gL, lk);
    if (y - t < 1.5) mixInto(o, o, gHi, 0.6);
    // drifts of flowers: denser low on the bank, dots grow toward the viewer
    const drift = sstep(0.52, 0.72, fl.fbm(x / 110, y / 30, B, 4));
    if (drift > 0) {
      const dot = fl(x / (1.1 + d * 1.6), y / (1.1 + d * 1.6) + 40, B);
      if (dot > 0.62 - drift * 0.12) { ramp3(q, lav, lav, lavL, clamp((dot - 0.6) * 3 + lk * 0.4)); mixInto(o, o, q, drift * 0.95); }
    }
    if (fl(x / 1.3 + 400, y / 1.3, B) > 0.93 - d * 0.03) mixInto(o, o, wh, 0.7);
    out[0] = o[0]; out[1] = o[1]; out[2] = o[2]; out[3] = clamp((y - t) * 1.5);
  });
  // oaks with long shadows to the lower right
  const x = c.x;
  for (let k = 0; k < (mobile ? 6 : 11); k++) {
    const tx = r() * W, ty = top[tx | 0] + h * r.range(0.06, 0.32), s = r.range(12, 26) * (0.7 + (ty / h));
    x.fillStyle = 'rgba(30,50,20,.28)';
    x.beginPath(); x.ellipse(tx + s * 1.6, ty + s * 0.12, s * 1.9, s * 0.22, 0.05, 0, TAU); x.fill();
    tree(x, tx, ty, s, r, r() < 0.5 ? FOLIAGE.oak : FOLIAGE.pale, { shadow: false, shape: r() < 0.25 ? 2 : 0 });
  }
  // a hedge of smaller trees along the crest
  for (let px = 0; px < W; px += r.range(4, 12)) if (r() < 0.45) tree(x, px, top[px | 0] + 2, r.range(3.5, 7), r, FOLIAGE.far, { shadow: false, trunk: false, density: 0.8 });
  return c;
}

/* deep grass below the lens: a painted bed, then blades lit at their tips,
   lupine spikes and daisies whose petals turn toward the light */
function paintNear(W, h, sc, mobile) {
  const r = rng(211);
  const nz = tnoise(212);
  const gD = C('#2F4F24'), gM = C('#5F8A42'), gL = C('#9CC26A');
  const o = [0, 0, 0];
  const c = paintPixels(W, h, sc, (x, y, out) => {
    const v = y / h;
    if (v < 0.28) return;
    const n = nz.fbm(x / 6, y / 30, B, 4);
    ramp3(o, gD, gM, gL, clamp(0.25 + n * 0.7 - (v - 0.3) * 0.5));
    out[0] = o[0]; out[1] = o[1]; out[2] = o[2]; out[3] = sstep(0.28, 0.5, v);
  });
  const x = c.x;
  const blade = (bx, base, bh, lean, wd, dark, light) => {
    const tx = bx + lean, ty = base - bh;
    const g = x.createLinearGradient(bx, base, tx, ty);
    g.addColorStop(0, dark); g.addColorStop(0.7, light); g.addColorStop(1, '#DDE9A8');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(bx - wd, base);
    x.quadraticCurveTo(bx + lean * 0.3 - wd * 0.4, base - bh * 0.55, tx, ty);
    x.quadraticCurveTo(bx + lean * 0.3 + wd * 0.4, base - bh * 0.55, bx + wd, base);
    x.fill();
  };
  const n = Math.round(W * (mobile ? 0.9 : 1.5));
  for (let k = 0; k < n; k++) {
    const bx = r() * W, base = h * r.range(0.62, 1.06), bh = h * r.range(0.14, 0.5) * (0.6 + base / h * 0.5);
    const shade = r();
    blade(bx, base, bh, r.range(-14, 10), r.range(0.8, 2.2), shade < 0.5 ? '#21391A' : '#2E4D22', shade < 0.3 ? '#4E7A38' : shade < 0.7 ? '#6E9B4C' : '#8DB860');
  }
  // lupine spikes: florets lit from the left, smaller toward the tip
  for (let k = 0; k < W * 0.05; k++) {
    const lx = r() * W, ly = h * r.range(0.25, 0.62), lh = r.range(16, 34) * (0.7 + ly / h);
    x.strokeStyle = '#4E6E3A'; x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(lx, ly + lh * 1.6); x.quadraticCurveTo(lx + 2, ly + lh * 0.6, lx, ly); x.stroke();
    for (let j = 0; j < 12; j++) {
      const yy = ly + j * lh / 12, rad = 1.2 + j / 12 * 1.8;
      for (const sd of [-1, 1]) {
        x.fillStyle = sd < 0 ? (j % 2 ? '#C7ABEE' : '#B394DD') : (j % 2 ? '#8E6CC0' : '#7A5AAE');
        x.beginPath(); x.ellipse(lx + sd * rad * 0.6, yy, rad, rad * 0.75, sd * 0.4, 0, TAU); x.fill();
      }
    }
  }
  // daisies, petals tilted in perspective, a shaded disc
  for (let k = 0; k < W * 0.03; k++) {
    const dx = r() * W, dy = h * r.range(0.35, 0.82), s = r.range(3, 5.5) * (0.7 + dy / h * 0.6), tilt = r.range(0.45, 0.8);
    x.strokeStyle = '#5A7E40'; x.lineWidth = 1; x.beginPath(); x.moveTo(dx, dy); x.lineTo(dx + r.range(-3, 3), dy + s * 6); x.stroke();
    for (let j = 0; j < 12; j++) {
      const a = j / 12 * TAU;
      const lit = 0.5 - Math.cos(a) * 0.3 - Math.sin(a) * 0.2;
      x.fillStyle = lit > 0.55 ? '#FFFFFF' : lit > 0.35 ? '#F1EEE6' : '#D9D6CF';
      x.beginPath(); x.ellipse(dx + Math.cos(a) * s, dy + Math.sin(a) * s * tilt, s * 0.95, s * 0.32, Math.atan2(Math.sin(a) * tilt, Math.cos(a)), 0, TAU); x.fill();
    }
    const g = x.createRadialGradient(dx - s * 0.2, dy - s * 0.2, 0, dx, dy, s * 0.5);
    g.addColorStop(0, '#FFD866'); g.addColorStop(1, '#C98A12');
    x.fillStyle = g; x.beginPath(); x.ellipse(dx, dy, s * 0.45, s * 0.45 * tilt, 0, 0, TAU); x.fill();
  }
  return c;
}

/* macro flora framing the lens */
function paintMacro(W, H, sc, dew) {
  const r = rng(213);
  const c = makeCanvas(W, H, sc);
  const x = c.x;
  const U = Math.min(W, H) / 800;
  const stem = (sx, top, bend, wd, col, hi) => {
    const g = x.createLinearGradient(sx - wd, 0, sx + wd, 0);
    g.addColorStop(0, hi); g.addColorStop(0.5, col); g.addColorStop(1, '#22381A');
    x.strokeStyle = g; x.lineWidth = wd; x.lineCap = 'round';
    x.beginPath(); x.moveTo(sx, H + 10); x.quadraticCurveTo(sx + bend * 0.4, (H + top) / 2, sx + bend, top); x.stroke();
    return [sx + bend, top];
  };
  /* a long blade with a midrib and a lit edge */
  const leaf = (lx, ly, len, ang, wid, col, lit) => {
    x.save(); x.translate(lx, ly); x.rotate(ang);
    const g = x.createLinearGradient(0, -len * wid, 0, len * wid);
    g.addColorStop(0, lit); g.addColorStop(0.5, col); g.addColorStop(1, '#1F3418');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len * 0.45, -len * wid, len, 0); x.quadraticCurveTo(len * 0.45, len * wid * 0.8, 0, 0); x.fill();
    x.strokeStyle = 'rgba(230,250,200,.35)'; x.lineWidth = 1.2 * U;
    x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len * 0.45, -len * wid * 0.08, len * 0.95, 0); x.stroke();
    x.restore();
  };
  // back blades first, darker
  for (let k = 0; k < 16; k++) {
    const bx = W * (r() < 0.5 ? r.range(-0.02, 0.22) : r.range(0.74, 1.02));
    stem(bx, H * r.range(0.4, 0.8), r.range(-70, 70) * U, r.range(4, 9) * U, r.pick(['#4A7038', '#5C8444', '#3E6230']), '#8FB86A');
  }
  // lavender spike, left: whorls of florets, each one a small lit bud
  const [lx, ly] = stem(W * 0.08, H * 0.26, W * 0.04, 7 * U, '#4F7A3E', '#93BE74');
  // florets in loose whorls: small, many, each a lit bud on a grey calyx,
  // with gaps between the whorls lower down and a tapering tip
  const spike = H * 0.38;
  for (let j = 0; j < 15; j++) {
    const u = j / 14;
    const yy = ly + Math.pow(u, 1.15) * spike;
    const rad = (5 + u * 10) * U;
    const nF = 9 + Math.round(u * 13);
    for (let f = 0; f < nF; f++) {
      const a = r() * TAU;
      const fx = lx + Math.cos(a) * rad * r.range(0.2, 1) + (u * 6 - 3) * U, fy = yy + Math.sin(a) * rad * 0.45 + r.range(-3, 3) * U;
      const front = Math.sin(a) > 0;                // nearer side of the whorl
      const lit = clamp(0.55 - Math.cos(a) * 0.4 + (r() - 0.5) * 0.35);
      const fr = r.range(3.8, 6.2) * U * (0.65 + u * 0.45);
      x.fillStyle = front ? '#6F7A78' : '#4E5856';
      x.beginPath(); x.ellipse(fx, fy + fr * 0.5, fr * 0.6, fr * 0.8, 0, 0, TAU); x.fill();
      const g = x.createRadialGradient(fx - fr * 0.3, fy - fr * 0.3, 0, fx, fy, fr);
      g.addColorStop(0, lit > 0.6 ? '#E2D2F6' : '#B89BE0'); g.addColorStop(0.6, lit > 0.45 ? '#9474C8' : '#6E4FA2'); g.addColorStop(1, '#46306E');
      x.fillStyle = g;
      x.beginPath(); x.ellipse(fx, fy, fr, fr * 0.8, r.range(-0.6, 0.6), 0, TAU); x.fill();
    }
  }
  leaf(W * 0.09, H * 0.75, W * 0.17, -0.5, 0.12, '#5E8C47', '#9CC67A');
  leaf(W * 0.11, H * 0.86, W * 0.14, -2.6, 0.12, '#4C7A3A', '#86B266');
  // daisy, right: petals shaded by their angle to the light, a domed disc
  const [dx2, dy2] = stem(W * 0.9, H * 0.42, -W * 0.06, 8 * U, '#4F7A3E', '#93BE74');
  const PR = 34 * U;
  softShadow(x, 14 * U, 'rgba(20,40,10,.35)', 6 * U, 8 * U, () => { x.beginPath(); x.ellipse(dx2, dy2, PR * 1.6, PR * 1.1, 0, 0, TAU); x.fillStyle = '#000'; x.fill(); });
  for (let j = 0; j < 22; j++) {
    const a = j / 22 * TAU + r.range(-0.05, 0.05);
    const lit = clamp(0.62 - Math.cos(a) * 0.25 - Math.sin(a) * 0.2);
    const px = dx2 + Math.cos(a) * PR * 0.95, py = dy2 + Math.sin(a) * PR * 0.66;
    const g = x.createLinearGradient(dx2, dy2, px + Math.cos(a) * PR * 0.6, py + Math.sin(a) * PR * 0.4);
    g.addColorStop(0, '#CFCBC2'); g.addColorStop(0.35, lit > 0.6 ? '#FFFFFF' : '#F2EFE8'); g.addColorStop(1, lit > 0.5 ? '#F7F5EF' : '#DCD8D0');
    x.fillStyle = g;
    x.beginPath(); x.ellipse(px, py, PR * 0.8, PR * 0.22, Math.atan2(Math.sin(a) * 0.66, Math.cos(a)), 0, TAU); x.fill();
    x.strokeStyle = 'rgba(160,150,140,.25)'; x.lineWidth = 0.8 * U;
    x.beginPath(); x.moveTo(dx2 + Math.cos(a) * PR * 0.4, dy2 + Math.sin(a) * PR * 0.28); x.lineTo(px + Math.cos(a) * PR * 0.6, py + Math.sin(a) * PR * 0.4); x.stroke();
  }
  const dg = x.createRadialGradient(dx2 - PR * 0.15, dy2 - PR * 0.15, PR * 0.05, dx2, dy2, PR * 0.55);
  dg.addColorStop(0, '#FFE27A'); dg.addColorStop(0.6, '#F2B41F'); dg.addColorStop(1, '#A86C0C');
  x.fillStyle = dg; x.beginPath(); x.ellipse(dx2, dy2, PR * 0.52, PR * 0.4, 0, 0, TAU); x.fill();
  // florets of the disc in a phyllotaxis spiral
  for (let k = 0; k < 140; k++) {
    const a = k * 2.39996, d = Math.sqrt(k / 140) * PR * 0.48;
    const fx = dx2 + Math.cos(a) * d, fy = dy2 + Math.sin(a) * d * 0.77;
    x.fillStyle = k % 3 ? 'rgba(150,90,10,.45)' : 'rgba(255,230,140,.5)';
    x.beginPath(); x.arc(fx, fy, 1.1 * U, 0, TAU); x.fill();
  }
  // foreground blades over everything, the nearest ones
  for (let k = 0; k < 8; k++) {
    const bx = W * (r() < 0.5 ? r.range(0, 0.16) : r.range(0.82, 1));
    stem(bx, H * r.range(0.5, 0.85), r.range(-60, 60) * U, r.range(5, 10) * U, r.pick(['#5C8A44', '#6F9D52', '#4A773A']), '#A8D282');
  }
  // dew: each drop a tiny inverted lens — dark rim, bright lower crescent, highlight
  for (let k = 0; k < 28; k++) {
    const ex = W * (r() < 0.5 ? r.range(0.02, 0.2) : r.range(0.78, 0.98)), ey = H * r.range(0.4, 0.95), er = r.range(3, 9) * U;
    dew.push([ex, ey, er]);
    softShadow(x, er * 0.8, 'rgba(10,30,10,.35)', er * 0.25, er * 0.45, () => { x.beginPath(); x.arc(ex, ey, er, 0, TAU); x.fill(); });
    const g = x.createRadialGradient(ex, ey + er * 0.35, er * 0.1, ex, ey, er);
    g.addColorStop(0, 'rgba(240,250,235,.7)'); g.addColorStop(0.55, 'rgba(150,190,130,.35)'); g.addColorStop(1, 'rgba(40,70,30,.55)');
    x.fillStyle = g; x.beginPath(); x.arc(ex, ey, er, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.ellipse(ex - er * 0.38, ey - er * 0.42, er * 0.26, er * 0.18, -0.6, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,255,255,.4)'; x.beginPath(); x.arc(ex + er * 0.3, ey + er * 0.45, er * 0.12, 0, TAU); x.fill();
  }
  return c;
}

export default function paint({ W, H, dpr, mobile }) {
  const sc = mobile ? Math.max(1, dpr) : Math.min(dpr, 1.1);
  const d = Math.min(dpr, 1.25);
  const hz = H * 0.5;
  const mtnH = Math.round(H * 0.3), lakeH = Math.round(H * 0.2), medH = Math.round(H * 0.34), nearH = Math.round(H * 0.42);
  const sky = paintSky(W, H);
  const { c: mtn } = paintMountains(W, mtnH, sc * (mobile ? 0.9 : 0.8));
  const lake = paintLake(W, lakeH, mtn, mtnH, sc, mobile);
  const meadow = paintMeadow(W, medH, sc, mobile);
  const near = paintNear(W, nearH, d, mobile);
  const dew = [];
  const macro = paintMacro(W, H, d, dew);
  return {
    sky,
    layers: [
      { set: stack(mtn), y: hz - mtnH * 0.85, i: 1 },
      { set: stack(lake), y: hz - lakeH * 0.22, i: 2 },
      { set: stack(meadow), y: hz + H * 0.08, i: 3 },
      { set: stack(near), y: H - nearH, i: 4 },
      { set: stack(macro), y: 0, i: 5 },
    ],
    dew,
  };
}
