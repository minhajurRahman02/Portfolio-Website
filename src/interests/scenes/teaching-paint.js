/* Painting for 09 · Teaching — "Chalk & Stars". A dim study at night: a
   slate chalkboard with the ghosts of old lessons, a timber frame and
   chalk tray, shelves with books and a globe, a desk of oak with papers
   and a notebook. The lamp's warmth is painted into the wall around it. */
import { TAU, rng, clamp, bake, blurred, makeCanvas } from '../util.js';
import { vgrad, rr } from '../paint.js';
import { tnoise, paintPixels, C, ramp3, sstep, postPixels, towardPx, softShadow, woodAt } from '../realism.js';
import { books } from './reading-paint.js';

const B = 1 << 20;

export function geom(W, H) {
  const wide = W > 900;
  const board = wide ? { x: W * 0.08, y: H * 0.1, w: W * 0.52, h: H * 0.46 } : { x: W * 0.05, y: H * 0.08, w: W * 0.9, h: H * 0.36 };
  const deskY = H * 0.76;
  const lamp = { x: wide ? W * 0.56 : W * 0.72, y: deskY - H * 0.22 };
  return { wide, board, deskY, lamp };
}

function paintRoom(W, H, G, sc) {
  const { board, lamp, wide } = G;
  const r = rng(909);
  const nz = tnoise(910);
  const c = makeCanvas(W, H, sc);
  const x = c.x;
  // plaster wall, green-grey, warmed and lifted around the lamp
  const wD = C('#0C1210'), wM = C('#1A2420'), wL = C('#3A3A2C');
  postPixels(c, (px, py, p) => {
    const m = nz.fbm(px / 50, py / 50, B, 5), f = nz(px / 2, py / 2, B);
    const d = Math.hypot((px - lamp.x) / W, (py - lamp.y) / H * 1.4);
    const o = [0, 0, 0];
    ramp3(o, wD, wM, wL, clamp(0.42 - d * 0.7 + (m - 0.5) * 0.3 + (f - 0.5) * 0.06));
    towardPx(o, [120, 80, 40], clamp(0.25 - d * 0.5));
    p[0] = o[0]; p[1] = o[1]; p[2] = o[2]; p[3] = 255;
  }, true);
  // board frame: oak, mitred, with a shadow on the wall
  softShadow(x, 22, 'rgba(0,0,0,.7)', 6, 10, () => x.fillRect(board.x - 12, board.y - 12, board.w + 24, board.h + 24));
  const fr = makeCanvas(board.w + 24, board.h + 24, sc);
  postPixels(fr, (px, py, p) => {
    const horiz = py < 12 || py > board.h + 12;
    const g = woodAt(nz, px, py, horiz ? 'x' : 'y');
    const o = [0, 0, 0];
    ramp3(o, C('#2A1A10'), C('#4A3424'), C('#6E5034'), g);
    p[0] = o[0]; p[1] = o[1]; p[2] = o[2]; p[3] = 255;
  }, true);
  x.drawImage(fr, board.x - 12, board.y - 12, board.w + 24, board.h + 24);
  x.strokeStyle = 'rgba(255,220,170,.15)'; x.lineWidth = 1; x.strokeRect(board.x - 11.5, board.y - 11.5, board.w + 23, board.h + 23);
  // slate: dark green-black, with the ghosts of erased lessons — long
  // horizontal eraser sweeps and the faint shapes of old diagrams
  const sl = paintPixels(board.w, board.h, sc * 0.8, (px, py, out) => {
    const sweep = nz.fbm(px / 140, py / 9, B, 4);
    const dust = nz.fbm(px / 30 + 40, py / 30, B, 5);
    const f = nz(px * 1.2, py * 1.2, B);
    const v = 0.16 + sstep(0.48, 0.75, sweep) * 0.05 + (dust - 0.5) * 0.05 + (f - 0.5) * 0.025;
    out[0] = 255 * v * 0.8; out[1] = 255 * v * 1.02; out[2] = 255 * v * 0.92; out[3] = 1;
  });
  x.drawImage(sl, board.x, board.y, board.w, board.h);
  // ghost writing: a few half-erased lines of old chalk
  x.save(); x.beginPath(); x.rect(board.x, board.y, board.w, board.h); x.clip();
  x.strokeStyle = 'rgba(232,237,230,.05)'; x.lineWidth = 2; x.lineCap = 'round';
  for (let k = 0; k < 18; k++) {
    const gx = board.x + r() * board.w * 0.9, gy = board.y + r() * board.h;
    x.beginPath(); x.moveTo(gx, gy);
    for (let j = 0; j < 8; j++) x.lineTo(gx + j * r.range(6, 14), gy + r.range(-5, 5));
    x.stroke();
  }
  x.restore();
  // inner shadow under the frame's top edge
  x.fillStyle = vgrad(x, 0, board.y, board.y + 12, [[0, 'rgba(0,0,0,.45)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(board.x, board.y, board.w, 12);
  // chalk tray, dust, two sticks of chalk and a felt eraser
  x.fillStyle = vgrad(x, 0, board.y + board.h + 10, board.y + board.h + 18, [[0, '#7A5A40'], [1, '#3A2818']]);
  x.fillRect(board.x - 14, board.y + board.h + 10, board.w + 28, 8);
  for (let k = 0; k < 220; k++) { x.fillStyle = `rgba(232,237,230,${r.range(0.05, 0.3)})`; x.fillRect(board.x + r() * board.w, board.y + board.h + 9 + r() * 3, r.range(0.6, 2), 0.8); }
  const chalk = (cx, len) => { const g = x.createLinearGradient(0, board.y + board.h + 5, 0, board.y + board.h + 10); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#BFC4BC'); x.fillStyle = g; rr(x, cx, board.y + board.h + 5, len, 5, 2); x.fill(); };
  chalk(board.x + board.w * 0.2, 18); chalk(board.x + board.w * 0.24, 10);
  const ex = board.x + board.w * 0.62;
  x.fillStyle = vgrad(x, 0, board.y + board.h + 1, board.y + board.h + 10, [[0, '#6A4A30'], [1, '#3A2818']]); rr(x, ex, board.y + board.h + 1, 46, 9, 2); x.fill();
  x.fillStyle = '#9A9A92'; x.fillRect(ex + 1, board.y + board.h + 7, 44, 3);
  // shelves with books and a globe
  if (wide) {
    const shx = W * 0.68, shw = W * 0.26;
    for (let k = 0; k < 3; k++) {
      const sy = H * (0.16 + k * 0.15);
      books(x, shx + 6, shx + shw - (k === 0 ? 50 : 10), sy, 64, r, false);
      softShadow(x, 6, 'rgba(0,0,0,.6)', 0, 4, () => x.fillRect(shx, sy, shw, 6));
      x.fillStyle = vgrad(x, 0, sy, sy + 6, [[0, '#5A4030'], [1, '#2A1A10']]); x.fillRect(shx, sy, shw, 6);
    }
    const gx = shx + shw - 26, gy = H * 0.16 - 26;
    const gg = x.createRadialGradient(gx - 7, gy - 7, 2, gx, gy, 18);
    gg.addColorStop(0, '#6A8EA0'); gg.addColorStop(0.7, '#2E4E60'); gg.addColorStop(1, '#16262E');
    x.fillStyle = gg; x.beginPath(); x.arc(gx, gy, 18, 0, TAU); x.fill();
    x.save(); x.beginPath(); x.arc(gx, gy, 18, 0, TAU); x.clip();
    x.fillStyle = 'rgba(120,140,80,.75)';
    x.beginPath(); x.ellipse(gx - 5, gy - 4, 7, 9, 0.5, 0, TAU); x.ellipse(gx + 7, gy + 6, 5, 6, 0.2, 0, TAU); x.ellipse(gx + 9, gy - 10, 6, 3, 0, 0, TAU); x.fill();
    x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.arc(gx + 8, gy + 6, 18, 0, TAU); x.fill();
    x.restore();
    x.strokeStyle = '#A07A44'; x.lineWidth = 2; x.beginPath(); x.arc(gx, gy, 22, -2.2, 0.9); x.stroke();
    x.fillStyle = '#5A4030'; x.fillRect(gx - 8, gy + 22, 16, 4);
  }
  // the wall's top edge melts into the night above, so the room can sink away cleanly
  x.globalCompositeOperation = 'destination-out';
  x.fillStyle = vgrad(x, 0, 0, H * 0.14, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]);
  x.fillRect(0, 0, W, H * 0.14);
  x.globalCompositeOperation = 'source-over';
  return c;
}

function paintDesk(W, h, G, sc) {
  const r = rng(911);
  const nz = tnoise(912);
  const c = makeCanvas(W, h, sc);
  const x = c.x;
  const oD = C('#1A0E08'), oM = C('#4A2E1C'), oL = C('#7A5232');
  postPixels(c, (px, py, p) => {
    const v = py / h;
    const g = woodAt(nz, px, py * (0.6 + v), 'x');
    // the lamp pool on the desk
    const d = Math.hypot((px - G.lamp.x) / W, (py - 8) / h * 0.6);
    const o = [0, 0, 0];
    ramp3(o, oD, oM, oL, clamp(g * 0.8 + 0.25 - d * 1.2));
    towardPx(o, [255, 190, 110], clamp(0.3 - d * 0.9));
    p[0] = o[0]; p[1] = o[1]; p[2] = o[2]; p[3] = 255;
  }, true);
  x.fillStyle = 'rgba(255,220,170,.3)'; x.fillRect(0, 0, W, 1.5);
  // papers: ruled sheets with handwriting, slightly curled shadows
  const sheet = (tx, ty, rot, w, hh) => {
    x.save(); x.translate(tx, ty); x.rotate(rot);
    softShadow(x, 6, 'rgba(0,0,0,.55)', 2, 3, () => x.fillRect(-w / 2, -hh * 0.2, w, hh));
    x.fillStyle = vgrad(x, 0, -hh * 0.2, hh * 0.8, [[0, '#F2ECDC'], [1, '#CFC6B2']]); x.fillRect(-w / 2, -hh * 0.2, w, hh);
    x.strokeStyle = 'rgba(90,110,160,.25)'; x.lineWidth = 0.6;
    for (let k = 0; k < 9; k++) { const yy = -hh * 0.1 + k * hh / 10; x.beginPath(); x.moveTo(-w * 0.44, yy); x.lineTo(w * 0.44, yy); x.stroke(); }
    x.strokeStyle = 'rgba(40,40,60,.55)'; x.lineWidth = 0.8;
    for (let k = 0; k < 7; k++) {
      const yy = -hh * 0.1 + k * hh / 10 - 2;
      let px = -w * 0.42;
      const end = r.range(0.1, 0.42) * w;
      x.beginPath(); x.moveTo(px, yy);
      while (px < end) { px += r.range(2, 4); x.lineTo(px, yy + r.range(-1.6, 1.2)); if (r() < 0.12) { px += 4; x.moveTo(px, yy); } }
      x.stroke();
    }
    x.restore();
  };
  sheet(W * 0.42, h * 0.3, -0.08, 180, 110);
  sheet(W * 0.38, h * 0.36, 0.05, 170, 104);
  // a notebook with a cloth cover and an elastic band
  x.save(); x.translate(W * 0.58, h * 0.36); x.rotate(0.14);
  softShadow(x, 8, 'rgba(0,0,0,.6)', 3, 4, () => x.fillRect(-60, -16, 120, 90));
  x.fillStyle = vgrad(x, 0, -16, 74, [[0, '#35557A'], [1, '#1E3450']]); x.fillRect(-60, -16, 120, 90);
  x.fillStyle = '#E8E2D2'; x.fillRect(60, -14, 3, 86);
  x.fillStyle = '#141414'; x.fillRect(38, -16, 4, 90);
  x.restore();
  // a pencil
  x.save(); x.translate(W * 0.5, h * 0.6); x.rotate(-0.3);
  x.fillStyle = vgrad(x, 0, -2.5, 2.5, [[0, '#F0C040'], [1, '#A07A10']]); x.fillRect(-40, -2.5, 70, 5);
  x.fillStyle = '#E8C8A0'; x.beginPath(); x.moveTo(30, -2.5); x.lineTo(40, 0); x.lineTo(30, 2.5); x.fill();
  x.fillStyle = '#2A2A2A'; x.beginPath(); x.moveTo(37, -0.8); x.lineTo(40, 0); x.lineTo(37, 0.8); x.fill();
  x.fillStyle = '#C04A4A'; x.fillRect(-46, -2.5, 6, 5);
  x.restore();
  return c;
}

function paintFG(W, H) {
  return blurred(bake(W, H, 0.5, (x, w, h) => {
    const g = x.createLinearGradient(w * 0.04, 0, w * 0.3, 0);
    g.addColorStop(0, '#0A0806'); g.addColorStop(0.5, '#1E160E'); g.addColorStop(1, '#0A0806');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(w * 0.04, h); x.lineTo(w * 0.08, h * 0.74); x.quadraticCurveTo(w * 0.17, h * 0.7, w * 0.26, h * 0.74); x.lineTo(w * 0.3, h); x.fill();
    x.fillStyle = '#1A140E'; x.fillRect(w * 0.84, h * 0.88, w * 0.2, h * 0.12);
  }), 10);
}

export default function paint({ W, H, dpr }) {
  const G = geom(W, H);
  const sc = Math.min(dpr, 1.25);
  return {
    room: paintRoom(W, H, G, sc),
    desk: paintDesk(W, Math.round(H - G.deskY + 10), G, sc),
    fg: paintFG(W, H),
  };
}
