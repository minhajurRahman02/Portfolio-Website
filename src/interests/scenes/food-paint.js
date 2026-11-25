/* Painting for 08 · Trying New Foods — "Twilight Market". An old quarter
   at dusk: plastered houses with tiled roofs and lit rooms, the back row
   of stalls under fabric canopies, a wet cobbled street catching the warm
   light, and the main stall built of real timber and striped canvas. */
import { TAU, rng, clamp, bake, blurred, makeCanvas, hex2rgb, rgb } from '../util.js';
import { vgrad, rr, frond } from '../paint.js';
import { tnoise, paintPixels, C, mixInto, ramp3, postPixels, mulPx, softShadow, woodAt, rimLight } from '../realism.js';

const B = 1 << 20;
const shadeHex = (h, k) => { const c = hex2rgb(h); return rgb(k < 0 ? c.map((v) => v * (1 + k)) : c.map((v) => v + (255 - v) * k)); };

export function geom(W, H) {
  const wide = W > 900;
  const stall = wide ? { x: W * 0.46, w: W * 0.42 } : { x: W * 0.06, w: W * 0.88 };
  stall.y = H * 0.5; stall.counter = H * 0.66;
  return { stall, wide };
}

/* houses of the old quarter against the dusk */
function paintRoofs(W, h, sc) {
  const r = rng(808);
  const nz = tnoise(809);
  const c = makeCanvas(W, h, sc);
  const x = c.x;
  const walls = ['#3A2A44', '#43304C', '#352840', '#4A3448'];
  let px = -10;
  while (px < W) {
    const bw = r.range(60, 150), bh = h * r.range(0.35, 0.78);
    const top = h - bh, wall = r.pick(walls);
    x.fillStyle = vgrad(x, 0, top, h, [[0, shadeHex(wall, 0.08)], [1, shadeHex(wall, -0.25)]]);
    x.fillRect(px, top, bw, bh);
    // roof: a pitched tile roof or a flat parapet with a water tank
    if (r() < 0.6) {
      const rh = bw * r.range(0.22, 0.34);
      x.fillStyle = vgrad(x, 0, top - rh, top, [[0, '#2A1A2A'], [1, '#1A1020']]);
      x.beginPath(); x.moveTo(px - 5, top + 2); x.lineTo(px + bw * 0.5, top - rh); x.lineTo(px + bw + 5, top + 2); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 0.6;
      for (let k = 1; k < 6; k++) { const yy = top - rh * (k / 6); x.beginPath(); x.moveTo(px + bw * 0.5 - (bw * 0.5 + 5) * (1 - k / 6), yy); x.lineTo(px + bw * 0.5 + (bw * 0.5 + 5) * (1 - k / 6), yy); x.stroke(); }
      if (r() < 0.6) { const cx = px + bw * r.range(0.2, 0.7); x.fillStyle = '#21162A'; x.fillRect(cx, top - rh * 0.9, 9, rh * 0.7); x.fillRect(cx - 2, top - rh * 0.95, 13, 3); }
    } else {
      x.fillStyle = '#21162A'; x.fillRect(px - 2, top - 5, bw + 4, 6);
      if (r() < 0.5) { const cx = px + bw * 0.3; x.fillRect(cx, top - 24, 24, 19); x.fillRect(cx + 3, top - 5, 2, 5); x.fillRect(cx + 19, top - 5, 2, 5); }
    }
    // windows: shutters, lit rooms in warm variety, a balcony rail sometimes
    const rows = Math.floor((bh - 16) / 22), cols = Math.max(1, Math.floor((bw - 12) / 22));
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const wx = px + 10 + i * ((bw - 20) / cols) + ((bw - 20) / cols - 9) / 2, wy = top + 12 + j * 22;
      const lit = r() < 0.32;
      if (lit) {
        const g = x.createLinearGradient(0, wy, 0, wy + 12);
        const col = r.pick([['#FFD898', '#E08A40'], ['#FFE6B8', '#D89A50'], ['#FFB070', '#B85A30'], ['#E8F0FF', '#8A9AC0']]);
        g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
        x.fillStyle = g; x.fillRect(wx, wy, 9, 12);
        if (r() < 0.4) { x.fillStyle = 'rgba(40,20,20,.5)'; x.fillRect(wx + r.range(1, 5), wy + 4, 3, 8); }     // someone at the window
        x.fillStyle = 'rgba(255,190,110,.12)'; x.fillRect(wx - 4, wy - 3, 17, 18);
      } else { x.fillStyle = '#1E1426'; x.fillRect(wx, wy, 9, 12); }
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(wx - 3, wy, 2.5, 12); x.fillRect(wx + 9.5, wy, 2.5, 12);
      if (j > 0 && r() < 0.08) { x.strokeStyle = '#1A1020'; x.lineWidth = 1; x.strokeRect(wx - 5, wy + 12, 19, 5); }
    }
    px += bw + r.range(-4, 6);
  }
  postPixels(c, (px0, py, p) => mulPx(p, 0.9 + nz.fbm(px0 / 5, py / 5, B, 3) * 0.2));
  rimLight(c, '#E08A7A', 1.6, 0.8, 0.45);
  return c;
}

/* the back row of stalls: fabric canopies with folds, lit counters */
function paintBack(W, h, H) {
  const r = rng(810);
  const c = makeCanvas(W, h, 1.25);
  const x = c.x;
  const glows = [];
  let px = -20;
  while (px < W) {
    const sw = r.range(90, 150);
    const body = r.pick(['#3D2A4E', '#43304A', '#352646']);
    x.fillStyle = vgrad(x, 0, h * 0.32, h, [[0, body], [1, '#1A1222']]);
    x.fillRect(px, h * 0.32, sw, h * 0.68);
    x.fillStyle = '#120A16'; x.fillRect(px + sw - 5, h * 0.3, 5, h * 0.7);
    // goods on the counter, lit warm from above
    const cy = h * 0.5;
    x.fillStyle = vgrad(x, 0, h * 0.4, h * 0.66, [[0, 'rgba(255,190,110,.45)'], [1, 'rgba(255,140,70,.1)']]);
    x.fillRect(px + 6, h * 0.4, sw - 20, h * 0.26);
    for (let k = 0; k < 6; k++) { x.fillStyle = r.pick(['#C8603A', '#E8B060', '#7A9A4A', '#D8D0C0', '#A04040']); x.beginPath(); x.ellipse(px + 14 + k * (sw - 30) / 6, cy + 10, 5, 3.5, 0, 0, TAU); x.fill(); }
    // a seller behind it
    if (r() < 0.6) { const sx = px + sw * r.range(0.3, 0.7); x.fillStyle = '#140D1A'; x.beginPath(); x.arc(sx, h * 0.42, 5, 0, TAU); x.fill(); rr(x, sx - 8, h * 0.45, 16, 20, 5); x.fill(); }
    x.fillStyle = vgrad(x, 0, h * 0.62, h, [[0, '#2A1C30'], [1, '#120C18']]); x.fillRect(px, h * 0.62, sw - 5, h * 0.38);
    // the canopy: a pitched fabric roof, sagging, with folds
    const col = r.pick(['#8A3A3A', '#3A5A6A', '#7A5A2A', '#5A3A6A', '#2E5A4A']);
    const g = x.createLinearGradient(px, 0, px + sw, 0);
    for (let k = 0; k <= 6; k++) g.addColorStop(k / 6, k % 2 ? shadeHex(col, -0.25) : shadeHex(col, 0.1));
    x.fillStyle = g;
    x.beginPath(); x.moveTo(px - 6, h * 0.34); x.lineTo(px + sw * 0.5 - 4, h * 0.16); x.lineTo(px + sw - 2, h * 0.34);
    for (let k = 4; k >= 0; k--) x.quadraticCurveTo(px - 6 + (k + 0.5) * (sw + 4) / 5, h * 0.39, px - 6 + k * (sw + 4) / 5, h * 0.34);
    x.fill();
    glows.push([px + sw / 2, H * 0.66 - h + h * 0.4, r() * TAU]);
    px += sw;
  }
  return { c, glows };
}

/* the street: worn cobbles in perspective, wet enough to hold the light */
function paintStreet(W, H, sc) {
  const nz = tnoise(811);
  const y0 = H * 0.64;
  const h = H - y0;
  const sD = C('#1A1018'), sM = C('#3A2630'), sL = C('#6A4A48'), joint = C('#0E080C'), warm = C('#E8A060');
  const o = [0, 0, 0];
  return paintPixels(W, h, sc * 0.8, (x, y, out) => {
    const v = y / h;                       // 0 far … 1 near
    const z = 1 / (0.18 + v * 0.82);       // depth
    const gx = (x - W * 0.5) / (W * 0.5) * z * 9 + W;   // ground coordinates
    const gy = z * 14;
    const row = Math.floor(gy), fy = gy - row;
    const off = (row % 2) * 0.5 + nz(row * 3.1, 0.5, B) * 0.3;
    const col = Math.floor(gx + off), fx = gx + off - col;
    // stone shape: rounded rectangle in cell space, a little irregular
    const e = Math.min(fx, 1 - fx) * 1.4, f = Math.min(fy, 1 - fy) * 2;
    const edge = Math.min(e, f);
    const id = nz(col * 1.7, row * 2.3, B);
    const dome = clamp(edge * 5);
    // each stone is domed: its far half faces the sky and the lights
    const lit = clamp(1 - fy * 1.3) * dome;
    ramp3(o, sD, sM, sL, clamp(0.18 + id * 0.5 + lit * 0.35 + dome * 0.1 + (nz(x / 2, y / 2, B) - 0.5) * 0.2));
    if (edge < 0.07) mixInto(o, o, joint, 0.8);
    // wet sheen: the lantern light smeared along the street toward the stall
    const sheen = Math.exp(-Math.pow((x - W * 0.65) / (W * 0.35), 2)) * clamp(1 - v) * dome * (0.5 + id * 0.5);
    mixInto(o, o, warm, sheen * 0.5 * (0.4 + lit));
    // haze far away
    mixInto(o, o, C('#3A2436'), clamp(0.6 - v * 1.4));
    out[0] = o[0]; out[1] = o[1]; out[2] = o[2]; out[3] = 1;
  });
}

/* the main stall's timber and canvas (lanterns, dishes, steam stay live) */
function paintStall(W, H, G, sc) {
  const { stall } = G;
  const r = rng(812);
  const nz = tnoise(813);
  const c = makeCanvas(W, H, sc);
  const x = c.x;
  const sx = stall.x, sw = stall.w, sy = stall.y, cy = stall.counter;
  const plank = (px, py, pw, ph, along, d, m, l, k = 0) => {
    const p = makeCanvas(pw, ph, sc);
    postPixels(p, (qx, qy, q) => {
      const g = woodAt(nz, qx + px * 3 + k * 97, qy + py, along);
      const o = [0, 0, 0];
      ramp3(o, C(d), C(m), C(l), g);
      q[0] = o[0]; q[1] = o[1]; q[2] = o[2]; q[3] = 255;
    }, true);
    x.drawImage(p, px, py, pw, ph);
  };
  // back wall: vertical boards, warm-lit from the grill and lamps
  plank(sx, sy, sw, cy - sy, 'y', '#2A1610', '#4A2A20', '#6A3E2A');
  for (let k = 1; k < 12; k++) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(sx + k * sw / 12, sy, 1.5, cy - sy); }
  const wl = x.createRadialGradient(sx + sw * 0.3, cy - 10, 0, sx + sw * 0.3, cy - 10, sw * 0.7);
  wl.addColorStop(0, 'rgba(255,150,80,.35)'); wl.addColorStop(1, 'rgba(255,150,80,0)');
  x.fillStyle = wl; x.fillRect(sx, sy, sw, cy - sy);
  // a shelf with jars and bottles
  x.fillStyle = '#2A1810'; x.fillRect(sx + sw * 0.55, sy + (cy - sy) * 0.42, sw * 0.4, 4);
  for (let k = 0; k < 9; k++) {
    const jx = sx + sw * 0.57 + k * sw * 0.042, jh = r.range(10, 20), jy = sy + (cy - sy) * 0.42 - jh;
    const col = r.pick(['#C87A3A', '#8A3A2A', '#E0C070', '#5A7A3A', '#D8D0C0']);
    const g = x.createLinearGradient(jx, 0, jx + 9, 0);
    g.addColorStop(0, shadeHex(col, -0.3)); g.addColorStop(0.35, shadeHex(col, 0.35)); g.addColorStop(1, shadeHex(col, -0.4));
    x.fillStyle = g; rr(x, jx, jy, 9, jh, 2); x.fill();
    x.fillStyle = '#2A1A10'; x.fillRect(jx + 1, jy - 3, 7, 3);
  }
  // posts
  for (const px of [sx - 6, sx + sw - 4]) {
    softShadow(x, 8, 'rgba(0,0,0,.6)', 4, 0, () => x.fillRect(px, sy - H * 0.06, 10, H));
    plank(px, sy - H * 0.06, 10, H * 0.5, 'y', '#1E120A', '#3A2418', '#5A3A26', px);
    x.fillStyle = 'rgba(255,190,120,.25)'; x.fillRect(px + 7, sy - H * 0.06, 2, H * 0.5);
  }
  // awning: striped canvas, each stripe a slight fold, scalloped hem, its shadow
  const ah = H * 0.07;
  softShadow(x, 14, 'rgba(10,0,10,.65)', 0, 10, () => x.fillRect(sx - 30, sy - ah, sw + 60, ah + 8));
  for (let k = 0; k < 12; k++) {
    const base = k % 2 ? '#F2E4CC' : '#C8433A';
    const x0 = sx - 20 + (k / 12) * (sw + 40), x1 = sx - 20 + ((k + 1) / 12) * (sw + 40);
    const b0 = sx - 30 + (k / 12) * (sw + 60), b1 = sx - 30 + ((k + 1) / 12) * (sw + 60);
    const g = x.createLinearGradient(b0, 0, b1, 0);
    g.addColorStop(0, shadeHex(base, -0.18)); g.addColorStop(0.45, shadeHex(base, 0.08)); g.addColorStop(1, shadeHex(base, -0.28));
    x.fillStyle = g;
    x.beginPath(); x.moveTo(x0, sy - ah); x.lineTo(x1, sy - ah); x.lineTo(b1, sy); x.lineTo(b0, sy); x.fill();
    x.beginPath(); x.arc((b0 + b1) / 2, sy, (sw + 60) / 24, 0, Math.PI); x.fill();
  }
  x.fillStyle = vgrad(x, 0, sy - ah, sy, [[0, 'rgba(255,230,200,.18)'], [1, 'rgba(0,0,0,.18)']]);
  x.fillRect(sx - 30, sy - ah, sw + 60, ah);
  x.fillStyle = '#3A2418'; x.fillRect(sx - 24, sy - ah - 3, sw + 48, 4);
  // grill: blackened iron, the coal bed glows (its flicker stays live)
  const gx = sx + sw * 0.06, gw = sw * 0.24;
  x.fillStyle = vgrad(x, 0, cy - H * 0.05, cy, [[0, '#2A2628'], [1, '#121012']]); x.fillRect(gx, cy - H * 0.05, gw, H * 0.05);
  x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(gx, cy - H * 0.05, gw, 1);
  const eg = x.createLinearGradient(0, cy - H * 0.05, 0, cy - H * 0.035);
  eg.addColorStop(0, '#FFB060'); eg.addColorStop(0.4, '#FF5E3A'); eg.addColorStop(1, '#5A1008');
  x.fillStyle = eg; x.fillRect(gx + 4, cy - H * 0.05, gw - 8, H * 0.014);
  for (let k = 0; k < 40; k++) { x.fillStyle = r() < 0.5 ? 'rgba(40,10,5,.6)' : 'rgba(255,220,120,.6)'; x.fillRect(gx + 5 + r() * (gw - 10), cy - H * 0.05 + r() * H * 0.013, r.range(1, 3), 1); }
  // skewers resting on the grill
  for (let k = 0; k < 6; k++) {
    const kx = gx + 10 + k * gw / 7;
    x.strokeStyle = '#C9A06A'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(kx, cy - H * 0.05); x.lineTo(kx + 10, cy - H * 0.08); x.stroke();
    for (let j = 0; j < 3; j++) {
      const px = kx + 2 + j * 2.6, py = cy - H * 0.054 - j * 5.5;
      const mg = x.createRadialGradient(px - 1, py - 1, 0, px, py, 3.4);
      mg.addColorStop(0, '#D8843A'); mg.addColorStop(1, '#5A1E0A');
      x.fillStyle = mg; x.beginPath(); x.arc(px, py, 3.2, 0, TAU); x.fill();
    }
  }
  // pots: brushed steel with a bright rim and a vertical highlight
  for (const [px, pw] of [[sx + sw * 0.34, sw * 0.1], [sx + sw * 0.46, sw * 0.08]]) {
    softShadow(x, 6, 'rgba(0,0,0,.6)', 2, 2, () => { rr(x, px, cy - H * 0.07, pw, H * 0.07, 6); x.fill(); });
    const g = x.createLinearGradient(px, 0, px + pw, 0);
    g.addColorStop(0, '#3A3A42'); g.addColorStop(0.22, '#9A9AA4'); g.addColorStop(0.35, '#5A5A64'); g.addColorStop(0.8, '#2A2A32'); g.addColorStop(1, '#4A4A54');
    x.fillStyle = g; rr(x, px, cy - H * 0.07, pw, H * 0.07, 6); x.fill();
    x.fillStyle = '#B8B8C2'; x.fillRect(px - 3, cy - H * 0.072, pw + 6, 3);
    x.fillStyle = '#2A2A32'; x.fillRect(px - 6, cy - H * 0.06, 5, 3); x.fillRect(px + pw + 1, cy - H * 0.06, 5, 3);
  }
  // counter: horizontal planks, a worn and lit front edge, shadow under the lip
  plank(sx - 20, cy, sw + 40, H - cy, 'x', '#2A160C', '#5E3A24', '#8A5A3A');
  for (let k = 1; k < 9; k++) { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(sx - 20 + (k / 9) * (sw + 40), cy + 6, 1.5, H - cy); }
  x.fillStyle = vgrad(x, 0, cy, cy + 7, [[0, '#B07A52'], [1, '#6A4028']]); x.fillRect(sx - 24, cy - 2, sw + 48, 8);
  x.fillStyle = 'rgba(255,230,190,.45)'; x.fillRect(sx - 24, cy - 2, sw + 48, 1);
  x.fillStyle = vgrad(x, 0, cy + 6, cy + 20, [[0, 'rgba(0,0,0,.5)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(sx - 20, cy + 6, sw + 40, 14);
  x.fillStyle = vgrad(x, 0, cy, H, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.55)']]); x.fillRect(sx - 20, cy, sw + 40, H - cy);
  // chalk menu board in a timber frame (its writing stays live)
  const mw = Math.min(sw * 0.34, 220), mh = mw * 0.62, mx = sx + sw * 0.08, my = cy + (H - cy) * 0.22;
  softShadow(x, 8, 'rgba(0,0,0,.6)', 3, 4, () => x.fillRect(mx - 6, my - 6, mw + 12, mh + 12));
  plank(mx - 6, my - 6, mw + 12, mh + 12, 'x', '#2A1810', '#4A2C1C', '#6A4430', 7);
  const slate = paintPixels(mw, mh, sc, (px, py, out) => {
    const sm = nz.fbm(px / 30, py / 20, B, 4), f = nz(px * 1.5, py * 1.5, B);
    const v = 30 + sm * 16 + f * 5;
    out[0] = v * 0.85; out[1] = v * 1.08; out[2] = v; out[3] = 1;
  });
  x.drawImage(slate, mx, my, mw, mh);
  return c;
}

function paintLeaves(W, H) {
  const r = rng(814);
  return blurred(bake(W, H, 0.5, (x, w, h) => {
    for (let k = 0; k < 6; k++) frond(x, -20, h * r.range(0.6, 1.05), r.range(w * 0.18, w * 0.3), r.range(-0.9, -0.1), r.pick(['#14261A', '#1A3022', '#0F1E14', '#22382A']), r, 7, 0.32);
    for (let k = 0; k < 5; k++) frond(x, w + 20, h * r.range(0.65, 1.05), r.range(w * 0.16, w * 0.28), Math.PI + r.range(0.1, 0.9), r.pick(['#14261A', '#1A3022', '#0F1E14', '#22382A']), r, 7, 0.32);
  }), 9);
}

export default function paint({ W, H, dpr, mobile }) {
  const G = geom(W, H);
  const sc = Math.min(dpr, 1.25);
  const back = paintBack(W, Math.round(H * 0.34), H);
  return {
    roofs: paintRoofs(W, Math.round(H * 0.4), sc),
    back: back.c, backGlows: back.glows,
    street: paintStreet(W, H, sc),
    stallSpr: paintStall(W, H, G, sc),
    fgLeaves: paintLeaves(W, H),
  };
}
