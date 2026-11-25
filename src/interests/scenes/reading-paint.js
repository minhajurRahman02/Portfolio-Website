/* Painting for 06 · Reading — "The Window Nook". A small library lit by
   one window: the view (cumulus over farmland, an oak close by), plaster
   walls that brighten toward the light, shelves of real books (round
   spines, cloth and leather, gilt bands, a few lying flat), the window
   seat with its cushions and plants. */
import { TAU, rng, clamp, bake, blurred, makeCanvas, hex2rgb, rgb } from '../util.js';
import { vgrad, rr, frond } from '../paint.js';
import { tnoise, paintPixels, C, mixInto, ramp3, tree, FOLIAGE, cumulus, profile, range, postPixels, mulPx, softShadow, woodAt, grain } from '../realism.js';

const B = 1 << 20;

export function geom(W, H) {
  const wide = W > 900;
  const win = wide ? { x: W * 0.44, y: H * 0.1, w: W * 0.36, h: H * 0.56 } : { x: W * 0.16, y: H * 0.08, w: W * 0.68, h: H * 0.44 };
  const seat = { y: win.y + win.h + H * 0.04 };
  return { win, seat, wide };
}

const shadeHex = (h, k) => { const c = hex2rgb(h); return rgb(k < 0 ? c.map((v) => v * (1 + k)) : c.map((v) => v + (255 - v) * k)); };

/* the view: a bright late-morning sky, cumulus, blue far hills, farmland,
   and one oak close enough to show its leaves */
function paintView(w, h, sc, mobile) {
  const r = rng(606);
  const nz = tnoise(607);
  const top = C('#6FA8DC'), mid = C('#A9D0EE'), low = C('#E4F0F2');
  const o = [0, 0, 0];
  const c = paintPixels(w, h, 0.6, (x, y, out) => {
    ramp3(o, top, mid, low, clamp(y / (h * 0.72)));
    out[0] = o[0]; out[1] = o[1]; out[2] = o[2]; out[3] = 1;
  });
  const v = makeCanvas(w, h, sc);
  const x = v.x;
  x.drawImage(c, 0, 0, w, h);
  for (let k = 0; k < (mobile ? 3 : 4); k++) {
    const cw = Math.round(w * r.range(0.3, 0.5)), cl = cumulus(660 + k, cw, Math.round(cw * 0.45), 0.5);
    x.drawImage(cl, r() * w * 0.9 - cw * 0.3, h * r.range(0.0, 0.26), cw, cl.h);
  }
  const far = range(w, h, sc, profile(w, 61, h * 0.68, h * 0.14, 4, 0.2), { seed: 64, rock: ['#6E8FA0', '#8EAAB7', '#B5CBD3'], haze: '#C8DCE6', hazeTop: 0.45, rib: 0.3, forest: ['#5D7D7A', '#77958E'], forestAt: 0.66 });
  x.drawImage(far, 0, 0, w, h);
  // farmland: rows of fields, hedges and trees, lit from upper left
  const ft = profile(w, 62, h * 0.8, h * 0.06, 3, 0);
  const tones = ['#7FA85E', '#94B76A', '#6E9A52', '#A9B970', '#86AE60'].map(C);
  const fields = paintPixels(w, h, sc, (px, py, out) => {
    const t = ft[px | 0];
    if (py < t) return;
    const d = py - t;
    const row = Math.floor(Math.pow(d, 0.8) / 4);
    const col = Math.floor((px + row * 37) / (60 + (row % 3) * 30));
    const tone = tones[(row * 7 + col * 3) % tones.length];
    const g = nz.fbm(px / 4, py / 2, B, 3);
    mixInto(o, tone, [40, 70, 30], clamp(0.2 + (g - 0.5) * 0.6 + d / h * 0.8));
    out[0] = o[0]; out[1] = o[1]; out[2] = o[2]; out[3] = clamp(d * 1.5);
  });
  x.drawImage(fields, 0, 0, w, h);
  for (let px = 0; px < w; px += r.range(4, 10)) if (r() < 0.55) tree(x, px, ft[px | 0] + r.range(1, 3), r.range(3, 7), r, FOLIAGE.far, { shadow: false, trunk: false, density: 0.8 });
  for (let k = 0; k < 14; k++) { const tx = r() * w, ty = ft[tx | 0] + h * r.range(0.03, 0.12); tree(x, tx, ty, r.range(5, 10), r, FOLIAGE.oak, { shape: r() < 0.3 ? 1 : 0 }); }
  // the near oak
  tree(x, w * 0.74, h * 0.92, w * 0.1, r, FOLIAGE.oak, { density: 1.3, shape: 2 });
  return v;
}

/* a row of books on a shelf: each spine shaded as a cylinder, cloth or
   leather, with bands and a worn top edge; some lean, a stack lies flat */
export function books(x, x0, x1, baseY, rowH, r, warmLight) {
  const cloth = ['#7A2E2E', '#2E4A6B', '#3E6B4A', '#8A6A2E', '#5A3A6A', '#B08A5A', '#2A3A2A', '#9A4A2A', '#C9B48A', '#4A2C24', '#6B5B3A', '#3A4E5E'];
  let bx = x0;
  while (bx < x1 - 8) {
    if (r() < 0.06) { bx += r.range(10, 24); continue; }
    if (r() < 0.07 && x1 - bx > 60) {
      // a stack lying flat
      let sy = baseY;
      const sw = r.range(40, 58);
      for (let k = 0; k < r.int(3, 6); k++) {
        const th = r.range(5, 9), col = r.pick(cloth), off = r.range(-4, 4);
        x.fillStyle = vgrad(x, 0, sy - th, sy, [[0, shadeHex(col, 0.12)], [0.5, col], [1, shadeHex(col, -0.35)]]);
        x.fillRect(bx + off, sy - th, sw, th);
        x.fillStyle = 'rgba(240,228,200,.7)'; x.fillRect(bx + off + sw - 2, sy - th + 1, 2, th - 2);
        sy -= th;
      }
      bx += sw + 6;
      continue;
    }
    const bw = r.range(9, 22), bh = (rowH - 14) * r.range(0.62, 0.98);
    const col = r.pick(cloth);
    const lean = r() < 0.05 ? r.range(-0.22, -0.1) : 0;
    x.save(); x.translate(bx, baseY); x.rotate(lean);
    // the round of the spine: light from the window side
    const g = x.createLinearGradient(0, 0, bw, 0);
    const lft = warmLight ? 0.18 : 0.05;
    g.addColorStop(0, shadeHex(col, -0.25)); g.addColorStop(0.3, shadeHex(col, lft)); g.addColorStop(0.65, col); g.addColorStop(1, shadeHex(col, -0.45));
    x.fillStyle = g; x.fillRect(0, -bh, bw, bh);
    // headband and gilt bands, a label on some
    const gilt = r() < 0.6;
    if (gilt) {
      x.fillStyle = 'rgba(232,200,120,.55)';
      for (const v of [0.1, 0.16, 0.84, 0.9]) x.fillRect(1, -bh * (1 - v), bw - 2, 1.2);
    }
    if (r() < 0.35) { x.fillStyle = r() < 0.5 ? 'rgba(20,14,10,.55)' : 'rgba(240,226,190,.6)'; x.fillRect(bw * 0.18, -bh * 0.72, bw * 0.64, bh * 0.16); }
    if (r() < 0.5) { x.fillStyle = 'rgba(232,200,120,.45)'; for (let k = 0; k < 4; k++) x.fillRect(bw * 0.3, -bh * (0.62 - k * 0.04), bw * 0.4, 0.8); }
    x.fillStyle = 'rgba(255,240,210,.18)'; x.fillRect(0, -bh, bw, 1.2);
    x.restore();
    bx += bw + 0.6;
  }
}

/* back wall, window reveal, bookshelves and a framed landscape */
function paintRoom(W, H, G, sc) {
  const { win, wide } = G;
  const r = rng(608);
  const nz = tnoise(609);
  const c = makeCanvas(W, H, sc);
  const x = c.x;
  // plaster: warm, mottled, brighter toward the window
  const pD = C('#3E271B'), pM = C('#6B4630'), pL = C('#A87A55');
  const wx = win.x + win.w / 2, wy = win.y + win.h * 0.5;
  postPixels(c, (px, py, p) => {
    const m = nz.fbm(px / 60, py / 60, B, 5), f = nz(px / 2.5, py / 2.5, B);
    const d = Math.hypot((px - wx) / W, (py - wy) / H);
    const o = [0, 0, 0];
    ramp3(o, pD, pM, pL, clamp(0.78 - d * 1.1 + (m - 0.5) * 0.25 + (f - 0.5) * 0.06));
    p[0] = o[0]; p[1] = o[1]; p[2] = o[2]; p[3] = 255;
  }, true);
  // a dado rail low on the wall
  x.fillStyle = 'rgba(40,22,14,.5)'; x.fillRect(0, H * 0.74, W, 3);
  x.fillStyle = 'rgba(255,220,170,.14)'; x.fillRect(0, H * 0.74 - 1, W, 1);
  // window reveal: the wall's thickness, lit on the sill side
  softShadow(x, 30, 'rgba(10,4,0,.55)', 0, 0, () => { rr(x, win.x - 12, win.y - 12, win.w + 24, win.h + 24, 18); x.fill(); });
  x.fillStyle = '#5A3A28'; rr(x, win.x - 18, win.y - 18, win.w + 36, win.h + 36, 20); x.fill();
  x.fillStyle = vgrad(x, 0, win.y - 18, win.y + win.h + 18, [[0, '#3A2418'], [1, '#C89A70']]);
  rr(x, win.x - 12, win.y - 12, win.w + 24, win.h + 24, 16); x.fill();
  // shelves on the left: a case with its own shadowed interior
  const shW = wide ? W * 0.36 : W * 0.22;
  softShadow(x, 26, 'rgba(10,4,0,.6)', 8, 0, () => x.fillRect(0, 0, shW + 14, H));
  const wood = makeCanvas(shW + 14, H, sc);
  postPixels(wood, (px, py, p) => {
    const g = woodAt(nz, px, py, 'y');
    const o = [0, 0, 0];
    ramp3(o, C('#24150D'), C('#3E2618'), C('#5E3C26'), g);
    p[0] = o[0]; p[1] = o[1]; p[2] = o[2]; p[3] = 255;
  }, true);
  x.drawImage(wood, 0, 0, shW + 14, H);
  const rowH = H * 0.155;
  for (let ry = H * 0.06; ry < H * 0.95; ry += rowH) {
    // the recess: dark at the back and under the shelf above
    x.fillStyle = vgrad(x, 0, ry, ry + rowH - 10, [[0, '#0E0805'], [0.25, '#1E120A'], [1, '#2A1A10']]);
    x.fillRect(0, ry, shW, rowH - 10);
    books(x, 6, shW - 4, ry + rowH - 10, rowH, r, true);
    // a shadow cast by the books back into the recess
    x.fillStyle = vgrad(x, 0, ry, ry + 12, [[0, 'rgba(0,0,0,.5)'], [1, 'rgba(0,0,0,0)']]);
    x.fillRect(0, ry, shW, 12);
    // the shelf board, its lit front edge
    x.drawImage(wood, 0, ry + rowH - 10, shW + 14, 10, 0, ry + rowH - 10, shW + 14, 10);
    x.fillStyle = 'rgba(255,220,180,.22)'; x.fillRect(0, ry + rowH - 10, shW + 14, 1.5);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, ry + rowH - 1, shW + 14, 1);
  }
  x.fillStyle = 'rgba(255,220,170,.16)'; x.fillRect(shW + 12, 0, 2, H);
  // a small framed landscape on the right wall
  if (wide) {
    const fx = W * 0.85, fy = H * 0.2, fw = W * 0.08, fh = fw * 1.25;
    softShadow(x, 12, 'rgba(10,4,0,.6)', -5, 6, () => x.fillRect(fx - 6, fy - 6, fw + 12, fh + 12));
    x.fillStyle = vgrad(x, 0, fy - 6, fy + fh + 6, [[0, '#6A4A2A'], [1, '#2A1A10']]); x.fillRect(fx - 6, fy - 6, fw + 12, fh + 12);
    x.fillStyle = '#E9DCC0'; x.fillRect(fx, fy, fw, fh);
    const art = paintPixels(fw - 16, fh - 16, sc, (px, py, out) => {
      const v = py / (fh - 16);
      const hill = 0.55 + Math.sin(px / (fw - 16) * 3 + 1) * 0.08;
      const o2 = [0, 0, 0];
      if (v < hill) ramp3(o2, C('#8CB8D8'), C('#E8D2B0'), C('#F2C890'), v / hill);
      else mixInto(o2, C('#6F9A58'), C('#3E6A3A'), (v - hill) / (1 - hill));
      mulPx(o2, 0.92 + nz(px / 1.5, py / 1.5, B) * 0.16);
      out[0] = o2[0]; out[1] = o2[1]; out[2] = o2[2]; out[3] = 1;
    });
    x.drawImage(art, fx + 8, fy + 8, fw - 16, fh - 16);
    x.fillStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx + fw * 0.6, fy); x.lineTo(fx, fy + fh * 0.5); x.fill();
  }
  return c;
}

/* window seat, cushions, the potted plants on the sill */
function paintFurniture(W, H, G, sc) {
  const { win, seat } = G;
  const r = rng(610);
  const nz = tnoise(611);
  const c = makeCanvas(W, H, sc);
  const x = c.x;
  const seatY = seat.y;
  // the seat: a panelled box under a walnut lid
  const sx = win.x - 40, sw = win.w + 80;
  const box = makeCanvas(sw, H - seatY, sc);
  postPixels(box, (px, py, p) => {
    const g = woodAt(nz, px, py, 'x');
    const o = [0, 0, 0];
    ramp3(o, C('#3A2216'), C('#6E4630'), C('#93603E'), clamp(g * 0.9 - py / (H - seatY) * 0.4 + 0.1));
    p[0] = o[0]; p[1] = o[1]; p[2] = o[2]; p[3] = 255;
  }, true);
  x.drawImage(box, sx, seatY, sw, H - seatY);
  // panels: a recessed rectangle each, shadow top-left, light bottom-right
  const np = Math.max(2, Math.round(sw / 160));
  for (let k = 0; k < np; k++) {
    const px = sx + 14 + k * (sw - 28) / np, pw = (sw - 28) / np - 14, py = seatY + 22, ph = (H - seatY) - 44;
    x.strokeStyle = 'rgba(20,10,4,.55)'; x.lineWidth = 2; x.beginPath(); x.moveTo(px, py + ph); x.lineTo(px, py); x.lineTo(px + pw, py); x.stroke();
    x.strokeStyle = 'rgba(255,220,180,.22)'; x.beginPath(); x.moveTo(px + pw, py); x.lineTo(px + pw, py + ph); x.lineTo(px, py + ph); x.stroke();
  }
  // lid with a rounded, lit nose
  x.fillStyle = vgrad(x, 0, seatY - 8, seatY + 4, [[0, '#B07A52'], [0.4, '#8A5A3B'], [1, '#4A2E1E']]);
  x.fillRect(win.x - 50, seatY - 8, win.w + 100, 12);
  x.fillStyle = 'rgba(255,236,200,.4)'; x.fillRect(win.x - 50, seatY - 8, win.w + 100, 1.5);
  x.fillStyle = vgrad(x, 0, seatY + 4, seatY + 18, [[0, 'rgba(0,0,0,.45)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(win.x - 50, seatY + 4, win.w + 100, 14);
  // cushions: soft forms, a seam, a dimple, a contact shadow
  const cush = (cx, cw, ch, col) => {
    const top = seatY - 8 - ch;
    softShadow(x, 10, 'rgba(20,8,0,.55)', 4, 4, () => { rr(x, cx, top, cw, ch, ch * 0.42); x.fill(); });
    const g = x.createRadialGradient(cx + cw * 0.3, top + ch * 0.3, 2, cx + cw * 0.45, top + ch * 0.5, cw * 0.7);
    g.addColorStop(0, shadeHex(col, 0.22)); g.addColorStop(0.55, col); g.addColorStop(1, shadeHex(col, -0.4));
    x.fillStyle = g; rr(x, cx, top, cw, ch, ch * 0.42); x.fill();
    x.strokeStyle = shadeHex(col, -0.3); x.lineWidth = 1; x.globalAlpha = 0.6;
    rr(x, cx + 3, top + 3, cw - 6, ch - 6, ch * 0.36); x.stroke(); x.globalAlpha = 1;
    const dg = x.createRadialGradient(cx + cw / 2, top + ch / 2, 0, cx + cw / 2, top + ch / 2, ch * 0.3);
    dg.addColorStop(0, 'rgba(0,0,0,.3)'); dg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = dg; x.fillRect(cx, top, cw, ch);
  };
  cush(win.x - 30, win.w * 0.34, H * 0.075, '#C77B5A');
  cush(win.x + win.w * 0.66, win.w * 0.3, H * 0.065, '#5E7FA0');
  // weave on the cushions and grain everywhere
  postPixels(c, (px, py, p) => { if (py < seatY - 4) mulPx(p, 0.94 + nz(px * 1.5, py * 1.5, B) * 0.12); });
  // potted plants on the sill: terracotta, soil, leaves lit from the window
  for (const [px, s] of [[win.x + win.w * 0.12, 1], [win.x + win.w * 0.88, 0.8]]) {
    const py = win.y + win.h + 4;
    softShadow(x, 6, 'rgba(20,8,0,.5)', -3, 2, () => { x.beginPath(); x.ellipse(px, py, 15 * s, 4 * s, 0, 0, TAU); x.fill(); });
    const pg = x.createLinearGradient(px - 16 * s, 0, px + 16 * s, 0);
    pg.addColorStop(0, '#7A3E26'); pg.addColorStop(0.35, '#C8724A'); pg.addColorStop(1, '#6A3420');
    x.fillStyle = pg; x.beginPath(); x.moveTo(px - 16 * s, py - 26 * s); x.lineTo(px + 16 * s, py - 26 * s); x.lineTo(px + 12 * s, py); x.lineTo(px - 12 * s, py); x.fill();
    x.fillStyle = '#B86842'; x.fillRect(px - 17 * s, py - 28 * s, 34 * s, 5 * s);
    x.fillStyle = '#2A1A10'; x.beginPath(); x.ellipse(px, py - 27 * s, 14 * s, 2.5 * s, 0, 0, TAU); x.fill();
    for (let k = 0; k < 12; k++) {
      const a = -Math.PI / 2 + r.range(-1.2, 1.2);
      const lit = Math.cos(a + Math.PI / 2 + 0.6) > 0;
      frond(x, px, py - 24 * s, r.range(30, 52) * s, a, lit ? r.pick(['#6C9C55', '#7FB062']) : r.pick(['#3E6B3A', '#2F5530']), r, 6, 0.3);
    }
  }
  return c;
}

/* foreground: shelf edge and a hanging plant, out of focus */
function paintFG(W, H) {
  const r = rng(612);
  return blurred(bake(W, H, 0.5, (x, w, h) => {
    x.fillStyle = '#24160E'; x.fillRect(0, h * 0.86, w * 0.18, h * 0.14);
    x.fillStyle = '#4A3020'; x.fillRect(0, h * 0.84, w * 0.2, h * 0.03);
    x.strokeStyle = '#2A1A10'; x.lineWidth = 3; x.beginPath(); x.moveTo(w * 0.9, 0); x.lineTo(w * 0.9, h * 0.12); x.stroke();
    const pg = x.createLinearGradient(w * 0.9 - 30, 0, w * 0.9 + 30, 0);
    pg.addColorStop(0, '#4A3028'); pg.addColorStop(0.4, '#8A6A54'); pg.addColorStop(1, '#3A2418');
    x.fillStyle = pg; x.beginPath(); x.ellipse(w * 0.9, h * 0.14, 30, 14, 0, 0, TAU); x.fill();
    for (let k = 0; k < 16; k++) frond(x, w * 0.9, h * 0.15, r.range(60, 150), Math.PI / 2 + r.range(-1, 1), r.pick(['#2F4A2A', '#3E6B3A', '#26402A', '#4E7A40']), r, 8, 0.35);
  }), 9);
}

export default function paint({ W, H, dpr, mobile }) {
  const G = geom(W, H);
  const sc = Math.min(dpr, 1.25);
  const { win } = G;
  return {
    view: paintView(win.w * 1.3, win.h * 1.1, sc, mobile),
    room: paintRoom(W, H, G, sc),
    furn: paintFurniture(W, H, G, sc),
    fg: paintFG(W, H),
  };
}
