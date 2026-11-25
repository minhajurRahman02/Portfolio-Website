/* Painting for 05 · Movies & Music — "Hillside Cinema". A summer night:
   the Milky Way arching over moonlit hills, a town glittering in the
   valley, the cinema slope with its audience, and the blanket, turntable
   and record sleeves in front, painted as wool, walnut and printed card. */
import { TAU, rng, clamp, bake, blurred, makeCanvas } from '../util.js';
import { vgrad, rr } from '../paint.js';
import { tnoise, paintPixels, C, mixInto, ramp3, sstep, profile, range, postPixels, mulPx, towardPx, softShadow, woodAt } from '../realism.js';

const B = 1 << 20;

export function geom(W, H) {
  const hz = H * 0.56;
  // screen left of centre on wide screens, so the glass card (right) never covers it
  const scr = { x: W * (W > 900 ? 0.12 : 0.18), y: H * 0.26, w: W * (W > 900 ? 0.32 : 0.62), h: 0 };
  scr.h = scr.w * 0.46;
  const proj = { x: W * (W > 900 ? 0.6 : 0.88), y: H * 0.68 };
  const set = { x: W * (W > 900 ? 0.36 : 0.4), y: H * 0.86, s: Math.min(W, H) * 0.0026 };
  return { hz, scr, proj, set };
}

/* the night sky with the Milky Way: a diffuse band of light along a tilted
   axis, torn by dark dust rifts, dense with faint stars near its spine */
function paintSky(W, H, mobile) {
  const nz = tnoise(501), dn = tnoise(502);
  const top = C('#050817'), mid = C('#0C1430'), hor = C('#1E2C58'), band = C('#B7B4DA'), warm = C('#D9BFA8'), dust = C('#070A1A');
  const ca = Math.cos(-0.42), sa = Math.sin(-0.42);
  const o = [0, 0, 0];
  const c = paintPixels(W, H, mobile ? 0.6 : 0.75, (x, y, out) => {
    ramp3(o, top, mid, hor, clamp(y / (H * 0.62)));
    // coordinates along (u) and across (v) the band
    const dx = x - W * 0.5, dy = y - H * 0.3;
    const u = dx * ca - dy * sa, v = dx * sa + dy * ca;
    const across = v / (H * 0.11);
    const core = Math.exp(-across * across * 1.4);
    const cloud = nz.fbm(u / 120, v / 50, B, 6);
    let L = core * (0.35 + cloud * 0.9);
    // the brighter, warmer bulge toward one end
    const bulge = Math.exp(-Math.pow((u + W * 0.18) / (W * 0.3), 2));
    L *= 0.7 + bulge * 0.6;
    // dust lanes: dark filaments running along the spine
    const lane = dn.fbm(u / 160, v / 18, B, 5);
    const rift = sstep(0.5, 0.66, lane) * Math.exp(-across * across * 3);
    L *= 1 - rift * 0.85;
    mixInto(o, o, band, clamp(L * 0.34));
    mixInto(o, o, warm, clamp(L * bulge * 0.18));
    mixInto(o, o, dust, rift * 0.25 * core);
    out[0] = o[0]; out[1] = o[1]; out[2] = o[2]; out[3] = 1;
  });
  // star dust: thousands of faint points, concentrated in the band
  const r = rng(503);
  const x = c.x;
  const n = mobile ? 2600 : 6500;
  for (let k = 0; k < n; k++) {
    const inBand = r() < 0.7;
    let px, py;
    if (inBand) {
      const u = r.range(-W * 0.8, W * 0.8), v = (r() + r() + r() - 1.5) * H * 0.12;
      px = W * 0.5 + u * ca + v * sa; py = H * 0.3 - u * sa + v * ca;
    } else { px = r() * W; py = Math.pow(r(), 1.3) * H * 0.6; }
    if (py > H * 0.62 || px < 0 || px > W) continue;
    const b = Math.pow(r(), 3);
    x.fillStyle = `rgba(${r() < 0.2 ? '255,236,210' : '232,238,255'},${0.15 + b * 0.7})`;
    const s = 0.5 + b * 0.9;
    x.fillRect(px, py, s, s);
  }
  return c;
}

/* far hills under the moon, and the town in the valley */
function paintHills(W, h, sc, hz, H, mobile) {
  const far = range(W, h, sc, profile(W, 51, h * 0.56, h * 0.5, 5, 0.35), {
    seed: 54, light: 1, rock: ['#111834', '#1F2A52', '#3A4A7A'], haze: '#1E2A55', hazeTop: 0.2, hazeFoot: 0.6, rib: 0.35,
    forest: ['#0B1228', '#141D3C'], forestAt: 0.42,
  });
  const nt = profile(W, 52, h * 0.78, h * 0.18, 4, 0.2);
  const near = range(W, h, sc, nt, {
    seed: 55, light: 1, rock: ['#0A0F22', '#121A36', '#1C2748'], haze: '#141C3C', hazeTop: 0.12, hazeFoot: 0.9, rib: 0.25,
    forest: ['#080D1E', '#0F1730'], forestAt: 0.7,
  });
  const c = makeCanvas(W, h, sc);
  c.x.drawImage(far, 0, 0, W, h);
  c.x.drawImage(near, 0, 0, W, h);
  // moonlit rim along the far crest
  const r = rng(56);
  const lights = [];
  for (let k = 0; k < (mobile ? 50 : 120); k++) {
    const tx = r() * W, ty = nt[tx | 0] + r.range(3, h * 0.2);
    lights.push([tx, hz - h * 0.62 + ty, r() * TAU, r.pick(['#FFD27A', '#FFB86B', '#FFF1C9', '#CFE0FF'])]);
  }
  return { c, lights };
}

/* the cinema slope: grass texture lit cool by the moon, the screen posts,
   rows of the audience rising up the hill */
function paintHill(W, h, H, G, mobile) {
  const { scr } = G;
  const r = rng(57);
  const nz = tnoise(58);
  const top = profile(W, 53, h * 0.2, h * 0.06, 3, 0);
  const gD = C('#08120C'), gM = C('#15271C'), gL = C('#2C4838'), rim = C('#7F98B8'), night = C('#121C34');
  const o = [0, 0, 0];
  const c = paintPixels(W, h, mobile ? 1 : 0.8, (x, y, out) => {
    const t = top[x | 0];
    if (y < t) return;
    const d = (y - t) / h;
    const blade = nz(x / (0.9 + d * 2), y / (5 + d * 10), B);
    const patch = nz.fbm(x / 80, y / 30, B, 4);
    ramp3(o, gD, gM, gL, clamp(0.45 + d * 0.25 + (blade - 0.5) * 0.45 + (patch - 0.5) * 0.4));
    // the far slope dissolves into the night air
    mixInto(o, o, night, clamp(0.45 - d * 1.6));
    if (y - t < 1.6) mixInto(o, o, rim, 0.45);
    out[0] = o[0]; out[1] = o[1]; out[2] = o[2]; out[3] = clamp((y - t) * 1.6);
  });
  const x = c.x;
  const sy = scr.y - (H - h);
  // posts: weathered timber
  for (const px of [scr.x + 6, scr.x + scr.w - 11]) {
    const g = x.createLinearGradient(px, 0, px + 5, 0);
    g.addColorStop(0, '#2A2A30'); g.addColorStop(1, '#0A0C12');
    x.fillStyle = g; x.fillRect(px, sy + scr.h, 5, h);
  }
  // audience: heads, hair, shoulders; a few sitting closer together, a child,
  // a raised arm with a phone, all silhouetted with a faint moon rim
  for (let row = 0; row < 3; row++) {
    const ry = sy + scr.h + h * (0.1 + row * 0.07);
    for (let px = scr.x - scr.w * 0.25 - row * 30; px < scr.x + scr.w * 1.25 + row * 30; px += r.range(16, 34)) {
      const s = (7 + row * 2.4 + r.range(-1, 1.5)) * (r() < 0.08 ? 0.7 : 1);
      const lean = r.range(-0.12, 0.12);
      x.save(); x.translate(px, ry); x.rotate(lean);
      x.fillStyle = '#04060C';
      rr(x, -s * 1.05, -s * 1.25, s * 2.1, s * 2.5, s * 0.75); x.fill();
      x.beginPath(); x.ellipse(0, -s * 1.85, s * 0.58, s * 0.66, 0, 0, TAU); x.fill();
      if (r() < 0.3) { x.beginPath(); x.ellipse(0, -s * 2.15, s * 0.62, s * 0.32, 0, Math.PI, 0); x.fill(); }    // hair or a cap
      if (r() < 0.05) { x.fillRect(s * 0.6, -s * 3.2, s * 0.3, s * 1.8); x.fillStyle = '#9FC2FF'; x.fillRect(s * 0.5, -s * 3.6, s * 0.5, s * 0.7); }
      x.strokeStyle = 'rgba(140,160,200,.22)'; x.lineWidth = 0.8;
      x.beginPath(); x.ellipse(0, -s * 1.85, s * 0.58, s * 0.66, 0, -2.6, -1.2); x.stroke();
      x.restore();
    }
  }
  return { c, top };
}

/* blanket, turntable plinth, record and sleeves, in the set's local units
   (x −165…185, y −64…40), drawn by the scene under the live parts */
function paintSet(k, dpr) {
  const ox = -165, oy = -64, w = 350, h = 104;
  const c = makeCanvas(w, h, k * dpr);
  const x = c.x;
  x.translate(-ox, -oy);
  const nz = tnoise(509);
  // blanket: a wool plaid in perspective, with a shadow along its far edge
  softShadow(x, 8, 'rgba(0,0,0,.6)', 0, 3, () => { x.beginPath(); x.moveTo(-150, 30); x.lineTo(170, 30); x.lineTo(130, -40); x.lineTo(-110, -40); x.closePath(); x.fill(); });
  x.save();
  x.beginPath(); x.moveTo(-150, 30); x.lineTo(170, 30); x.lineTo(130, -40); x.lineTo(-110, -40); x.closePath(); x.clip();
  x.fillStyle = '#6E2830'; x.fillRect(-160, -45, 340, 80);
  // plaid bands: crossing warm stripes, converging to the far edge
  for (let i = -6; i <= 6; i++) {
    const a = i * 26 + 10, b = i * 20 + 10;
    x.fillStyle = i % 3 === 0 ? 'rgba(30,20,30,.45)' : 'rgba(230,200,160,.16)';
    x.beginPath(); x.moveTo(a - 5, 30); x.lineTo(a + 5, 30); x.lineTo(b + 4, -40); x.lineTo(b - 4, -40); x.fill();
  }
  for (const [yy, hh, col] of [[-30, 6, 'rgba(30,20,30,.4)'], [-14, 3, 'rgba(230,200,160,.18)'], [2, 8, 'rgba(30,20,30,.4)'], [18, 4, 'rgba(230,200,160,.18)']]) { x.fillStyle = col; x.fillRect(-160, yy, 340, hh); }
  x.restore();
  // wool texture and folds; moonlight from the upper right
  const wo = C('#2A0E14');
  postPixels(c, (px0, py, p) => {
    const lx = px0 + ox, ly = py + oy;
    if (ly > 31) return;
    const fibre = nz(px0 * 1.8, py * 1.8, B) - 0.5;
    const fold = Math.sin((lx * 0.06 + ly * 0.1) + nz.fbm(lx / 60, ly / 30, B, 3) * 5);
    mulPx(p, 1 + fibre * 0.22 + fold * 0.08);
    towardPx(p, wo, clamp((ly + 40) / 70) * 0.25);
  });
  // turntable plinth: walnut with a lit top edge
  softShadow(x, 6, 'rgba(0,0,0,.7)', 2, 4, () => { rr(x, -70, -52, 110, 44, 5); x.fill(); });
  const pl = makeCanvas(110, 44, k * dpr);
  postPixels(pl, (px0, py, p) => {
    const g = woodAt(nz, px0 * 1.4, py * 2, 'x');
    const o = [0, 0, 0];
    ramp3(o, C('#2A170D'), C('#5A3B28'), C('#8A5C3C'), clamp(g - py / 44 * 0.3));
    p[0] = o[0]; p[1] = o[1]; p[2] = o[2]; p[3] = 255;
  }, true);
  x.save(); rr(x, -70, -52, 110, 44, 5); x.clip(); x.drawImage(pl, -70, -52, 110, 44); x.restore();
  x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(-70, -12, 110, 6);
  x.fillStyle = 'rgba(255,230,200,.2)'; x.fillRect(-66, -52, 102, 1);
  // platter ring and the record, grooves catching the light in two arcs
  x.fillStyle = '#1A1A1E'; x.beginPath(); x.ellipse(-20, -31, 40, 16, 0, 0, TAU); x.fill();
  const rg = x.createRadialGradient(-20, -32, 2, -20, -32, 38);
  rg.addColorStop(0, '#18181C'); rg.addColorStop(1, '#0B0B0E');
  x.fillStyle = rg; x.beginPath(); x.ellipse(-20, -32, 38, 15, 0, 0, TAU); x.fill();
  x.lineWidth = 0.5;
  for (let gR = 11; gR < 37; gR += 1.2) { x.strokeStyle = `rgba(255,255,255,${0.03 + (gR % 4 < 1.2 ? 0.04 : 0)})`; x.beginPath(); x.ellipse(-20, -32, gR, gR * 0.4, 0, 0, TAU); x.stroke(); }
  x.strokeStyle = 'rgba(200,210,240,.16)'; x.lineWidth = 3;
  x.beginPath(); x.ellipse(-20, -32, 28, 11.2, 0, -2.4, -1.6); x.stroke();
  x.beginPath(); x.ellipse(-20, -32, 28, 11.2, 0, 0.7, 1.5); x.stroke();
  const lb = x.createRadialGradient(-22, -33, 0, -20, -32, 9);
  lb.addColorStop(0, '#F07A5A'); lb.addColorStop(1, '#B83A28');
  x.fillStyle = lb; x.beginPath(); x.ellipse(-20, -32, 9, 3.6, 0, 0, TAU); x.fill();
  x.fillStyle = '#DDD'; x.beginPath(); x.ellipse(-20, -32, 0.9, 0.5, 0, 0, TAU); x.fill();
  // tonearm base and the speed knob
  const kb = x.createRadialGradient(25, -45, 0, 26, -44, 5);
  kb.addColorStop(0, '#E0E2E8'); kb.addColorStop(1, '#6A6E76');
  x.fillStyle = kb; x.beginPath(); x.arc(26, -44, 4.5, 0, TAU); x.fill();
  x.fillStyle = '#9A9EA6'; x.beginPath(); x.ellipse(28, -20, 3, 1.4, 0, 0, TAU); x.fill();
  // record sleeves: printed card with art of their own, a worn edge
  const sleeve = (sx, sy, rot, paintArt) => {
    x.save(); x.translate(sx, sy); x.rotate(rot);
    softShadow(x, 5, 'rgba(0,0,0,.6)', 2, 3, () => x.fillRect(-26, -52, 52, 52));
    x.save(); x.beginPath(); x.rect(-26, -52, 52, 52); x.clip(); paintArt(); x.restore();
    x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 0.8; x.strokeRect(-25.6, -51.6, 51.2, 51.2);
    x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(-26, -52, 52, 5);
    x.restore();
  };
  sleeve(78, 0, 0.18, () => {
    x.fillStyle = vgrad(x, 0, -52, 0, [[0, '#1E3560'], [1, '#2B4A7A']]); x.fillRect(-26, -52, 52, 52);
    const sg = x.createRadialGradient(4, -30, 0, 4, -30, 18);
    sg.addColorStop(0, '#FFE2A8'); sg.addColorStop(0.5, '#FFB86B'); sg.addColorStop(1, 'rgba(255,140,80,0)');
    x.fillStyle = sg; x.fillRect(-26, -52, 52, 52);
    x.fillStyle = '#12203C'; x.beginPath(); x.moveTo(-26, -8); x.lineTo(-10, -20); x.lineTo(2, -12); x.lineTo(14, -22); x.lineTo(26, -14); x.lineTo(26, 0); x.lineTo(-26, 0); x.fill();
  });
  sleeve(108, 6, 0.32, () => {
    x.fillStyle = '#E9DEC4'; x.fillRect(-26, -52, 52, 52);
    x.fillStyle = '#C3463A'; x.beginPath(); x.arc(0, -26, 15, 0, TAU); x.fill();
    x.fillStyle = '#1E1E22'; x.fillRect(-20, -9, 26, 2.2); x.fillRect(-20, -5, 16, 1.6);
  });
  return c;
}

function paintFgGrass(W, H) {
  const r = rng(59);
  const c = bake(W, H * 0.22, 0.5, (x, w, h) => {
    for (let k = 0; k < w * 0.3; k++) {
      const gx = r() * w, gh = r.range(h * 0.35, h * 0.9);
      const g = x.createLinearGradient(gx, h, gx, h - gh);
      g.addColorStop(0, '#060B08'); g.addColorStop(1, r() < 0.3 ? '#2A3C46' : '#14221A');
      x.strokeStyle = g;
      x.lineWidth = r.range(3, 7);
      x.beginPath(); x.moveTo(gx, h + 4); x.quadraticCurveTo(gx + r.range(-14, 14), h - gh * 0.5, gx + r.range(-30, 30), h - gh); x.stroke();
    }
  });
  return blurred(c, 6);
}

export default function paint({ W, H, dpr, mobile }) {
  const G = geom(W, H);
  const sc = mobile ? Math.max(1, dpr) : Math.min(dpr, 1.1);
  const sky = paintSky(W, H, mobile);
  const hillsH = Math.round(H * 0.3), hillH = Math.round(H * 0.6);
  const { c: hills, lights } = paintHills(W, hillsH, sc * 0.8, G.hz, H, mobile);
  const { c: hill } = paintHill(W, hillH, H, G, mobile);
  const k = Math.max(0.7, G.set.s);
  return { sky, hills, townLights: lights, hill, set: paintSet(k, Math.max(1.25, dpr)), fgGrass: paintFgGrass(W, H) };
}
