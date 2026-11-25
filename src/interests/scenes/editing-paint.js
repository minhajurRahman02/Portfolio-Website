/* Painting for 03 · Video Editing — "The Cut". A city at night through a
   big studio window, and the edit desk in front of it. The city is painted
   as real towers: setbacks and crowns, facades lit from the street below,
   window grids that differ per building (office blocks lit cool, flats lit
   warm, some floors dark), low cloud glowing with the city's light. */
import { TAU, rng, clamp, bake, blurred, makeCanvas } from '../util.js';
import { vgrad, rr } from '../paint.js';
import { tnoise, paintPixels, C, mixInto, ramp3, sstep, postPixels, mulPx, towardPx, softShadow, woodAt, grain } from '../realism.js';

const B = 1 << 20;

export function geom(W, H) {
  const win = { x: W * 0.035, y: H * 0.05, w: W * 0.93, h: H * 0.6 };
  const mw = clamp(W * 0.46, 300, 760), mh = mw * 0.56;
  // on wide screens the monitor sits right of centre, clear of the glass card
  const mcx = W > 900 ? W * 0.6 : W * 0.5;
  const mon = { x: mcx - mw / 2, y: H * 0.6 - mh * 0.55, w: mw, h: mh };
  const scr = { x: mon.x + mw * 0.025, y: mon.y + mh * 0.04, w: mw * 0.95, h: mh * 0.88 };
  return { win, mon, scr, desk: H * 0.8 };
}

/* night sky: light pollution pooling at the horizon, low stratus lit
   orange from beneath, a few stars where the sky is darkest */
function paintSky(cw, ch) {
  const nz = tnoise(301);
  const top = C('#05070F'), mid = C('#141A2E'), hor = C('#4A3140'), sodium = C('#B86A3E'), cloudD = C('#1C1A28');
  const o = [0, 0, 0], q = [0, 0, 0];
  const c = paintPixels(cw, ch, 0.5, (x, y, out) => {
    const v = y / ch;
    ramp3(o, top, mid, hor, clamp(v * 1.15));
    const cl = nz.fbm(x / 220, y / 40, B, 5);
    const cov = sstep(0.45, 0.68, cl) * sstep(0.05, 0.45, v);
    if (cov > 0) {
      // the underside catches the city, the tops stay dark
      const under = nz.fbm(x / 220, (y + 6) / 40, B, 5) < cl ? 1 : 0.4;
      mixInto(q, cloudD, sodium, clamp(v * 0.9 * under + 0.05));
      mixInto(o, o, q, cov * 0.85);
    }
    out[0] = o[0]; out[1] = o[1]; out[2] = o[2]; out[3] = 1;
  });
  const r = rng(302);
  for (let k = 0; k < 120; k++) {
    const sy = Math.pow(r(), 2) * ch * 0.4;
    c.x.fillStyle = `rgba(220,228,255,${r.range(0.15, 0.6)})`;
    c.x.fillRect(r() * cw, sy, 0.8, 0.8);
  }
  return c;
}

/* one skyline row. `depth` 0 (far) … 1 (near) sets haze, size and detail */
function paintTowers(cw, ch, sc, seed, depth, baseY) {
  const r = rng(seed);
  const nz = tnoise(seed + 1);
  const c = makeCanvas(cw, ch, sc);
  const x = c.x;
  const towers = [];
  let px = -30;
  const unit = cw / 1200 + 0.4;
  while (px < cw + 30) {
    const bw = r.range(26, 78) * unit * (0.8 + depth * 0.4);
    const bh = ch * r.range(depth ? 0.3 : 0.18, depth ? 0.8 : 0.55) * (r() < 0.12 ? 1.25 : 1);
    towers.push({ x: px, w: bw, top: ch * baseY - bh, kind: r() < 0.45 ? 'office' : 'flats', crown: r(), tone: r() });
    px += bw + r.range(-6, 10) * unit;
  }
  const body = (t) => {
    const { x: bx, w, top } = t;
    const base = ch * baseY + 6;
    const sh = [0.08, 0.06, 0.1][Math.floor(t.tone * 3)];
    const face = depth ? (t.kind === 'office' ? '#1A2132' : '#1E1A22') : '#1A1D2E';
    const g = x.createLinearGradient(0, top, 0, base);
    g.addColorStop(0, face); g.addColorStop(1, depth ? '#2A2530' : '#24232F');
    x.fillStyle = g;
    // setbacks: the top steps in once or twice
    x.beginPath();
    x.moveTo(bx, base); x.lineTo(bx, top + (t.crown < 0.4 ? w * 0.4 : 0));
    if (t.crown < 0.4) { x.lineTo(bx + w * 0.15, top + w * 0.4); x.lineTo(bx + w * 0.15, top); x.lineTo(bx + w * 0.85, top); x.lineTo(bx + w * 0.85, top + w * 0.4); x.lineTo(bx + w, top + w * 0.4); }
    else x.lineTo(bx + w, top);
    x.lineTo(bx + w, base); x.closePath(); x.fill();
    // the shaded side, a narrow strip on the right
    x.fillStyle = `rgba(0,0,0,${0.25 + sh})`;
    x.fillRect(bx + w * 0.82, top + (t.crown < 0.4 ? w * 0.4 : 0), w * 0.18, base - top);
    // crowns: spire, water tank, antenna mast or a lit top
    const cx = bx + w / 2;
    if (t.crown > 0.85) { x.fillStyle = face; x.beginPath(); x.moveTo(cx - w * 0.12, top); x.lineTo(cx, top - w * 0.9); x.lineTo(cx + w * 0.12, top); x.fill(); t.beacon = [cx, top - w * 0.9]; }
    else if (t.crown > 0.7) { x.fillStyle = '#100F16'; x.fillRect(cx - w * 0.14, top - w * 0.3, w * 0.28, w * 0.3); x.fillRect(cx - w * 0.16, top - w * 0.34, w * 0.32, w * 0.05); }
    else if (t.crown > 0.55) { x.strokeStyle = '#100F16'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(cx, top); x.lineTo(cx, top - w * 0.7); x.stroke(); t.beacon = [cx, top - w * 0.7]; }
    else if (t.crown > 0.45 && depth) { const lg = x.createLinearGradient(0, top - 4, 0, top + 10); lg.addColorStop(0, 'rgba(160,200,255,.0)'); lg.addColorStop(0.5, 'rgba(160,200,255,.5)'); lg.addColorStop(1, 'rgba(160,200,255,0)'); x.fillStyle = lg; x.fillRect(bx, top - 2, w, 12); }
    // windows: a grid per building; floors switched on in runs
    const fh = depth ? r.range(5.5, 7.5) : r.range(4, 5.5);
    const cwid = depth ? r.range(4.5, 7) : r.range(3.5, 5);
    const lit = t.kind === 'office' ? ['#CFE6FF', '#A8C8F0', '#EEF4FF'] : ['#FFD08A', '#FFC070', '#FFE6B8', '#FF9E55'];
    const share = (t.kind === 'office' ? 0.34 : 0.26) * (depth ? 1 : 0.7);
    let run = 0, on = true;
    for (let wy = top + fh * 1.2; wy < base - fh * 1.5; wy += fh) {
      if (run-- <= 0) { on = r() < 0.8; run = r.int(1, 5); }
      for (let wx = bx + cwid * 0.6; wx < bx + w * 0.82 - cwid * 0.5; wx += cwid) {
        if (on && r() < share) {
          x.globalAlpha = r.range(0.55, 1) * (depth ? 1 : 0.75);
          x.fillStyle = r.pick(lit);
          x.fillRect(wx, wy, cwid * 0.62, fh * 0.55);
          // a lit room shows its blind or a figure sometimes
          if (depth && r() < 0.2) { x.fillStyle = 'rgba(40,30,30,.35)'; x.fillRect(wx, wy, cwid * 0.62, fh * 0.2); }
        } else {
          x.globalAlpha = 0.5;
          x.fillStyle = depth ? '#262C40' : '#20243A';
          x.fillRect(wx, wy, cwid * 0.62, fh * 0.55);
        }
      }
    }
    x.globalAlpha = 1;
  };
  for (const t of towers) body(t);
  // facade grain, street light washing up the lower floors, haze in the distance
  const glowC = C('#C78656'), hazeC = C('#3A3148');
  postPixels(c, (px0, py, p) => {
    const g = nz(px0 / 2, py / 2, B) - 0.5;
    mulPx(p, 1 + g * 0.12);
    const up = sstep(ch * (baseY - 0.25), ch * baseY, py);
    towardPx(p, glowC, up * (depth ? 0.22 : 0.3));
    if (!depth) towardPx(p, hazeC, 0.35 + up * 0.2);
  });
  return { c, beacons: towers.filter((t) => t.beacon).map((t) => [t.beacon[0], t.beacon[1], r() * TAU]) };
}

/* the wall around the window: dark plaster, a little monitor light */
function paintWall(W, H, sc) {
  const nz = tnoise(305);
  const c = makeCanvas(W, H, sc);
  return postPixels(c, (x, y, p) => {
    const n = nz.fbm(x / 18, y / 18, B, 4);
    const v = 9 + n * 9 + (y / H) * 6;
    p[0] = v * 0.95; p[1] = v * 0.95; p[2] = v * 1.25; p[3] = 255;
  }, true);
}

/* desk, keyboard, monitor stand and bezel: walnut, plastic, brushed metal */
function paintDesk(W, H, G, sc) {
  const { mon, desk } = G;
  const c = makeCanvas(W, H, sc);
  const x = c.x;
  const nz = tnoise(306);
  // desk top as a receding walnut slab
  const dk = makeCanvas(W + 120, H - desk + 40, sc);
  const wD = C('#1E140F'), wM = C('#3E2A1E'), wL = C('#6A4A33');
  postPixels(dk, (px0, py, p) => {
    const v = py / (H - desk + 40);
    // the slab recedes: grain spacing tightens toward the back edge
    const g = woodAt(nz, px0, py * (0.55 + v * 1.1) * 2.2, 'x');
    const seam = Math.abs(((px0 + py * 0.3) % 260) - 130) > 128.8 ? 0.6 : 1;
    const o = [0, 0, 0];
    ramp3(o, wD, wM, wL, clamp(g * 0.85 - v * 0.35) * seam);
    // sheen of the screen across the varnish, falling off toward the viewer
    const sh = Math.exp(-Math.pow((px0 - 60 - (mon.x + mon.w / 2)) / (mon.w * 0.7), 2)) * clamp(1 - v * 1.6) * 0.5;
    p[0] = o[0] + sh * 40; p[1] = o[1] + sh * 50; p[2] = o[2] + sh * 70; p[3] = 255;
  }, true);
  x.drawImage(dk, -60, desk, W + 120, H - desk + 40);
  x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(-60, desk, W + 120, 1.2);
  x.fillStyle = vgrad(x, 0, desk, desk + 10, [[0, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(-60, desk + 1, W + 120, 10);
  // keyboard: aluminium case, keycaps with a lit top edge, soft contact shadow
  const kw = mon.w * 0.62, kx = mon.x + mon.w / 2 - kw / 2, ky = desk + (H - desk) * 0.35, kh = (H - desk) * 0.28;
  softShadow(x, 10, 'rgba(0,0,0,.6)', 0, 5, () => { rr(x, kx, ky, kw, kh, 6); x.fill(); });
  x.fillStyle = vgrad(x, 0, ky, ky + kh, [[0, '#2A2830'], [1, '#141218']]);
  rr(x, kx, ky, kw, kh, 6); x.fill();
  x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(kx + 6, ky + 0.5, kw - 12, 1);
  const cols = 15, rows = 5, gap = 2.2;
  const kcw = (kw - 14) / cols, kch = (kh - 12) / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (j === rows - 1 && i > 3 && i < 11) { if (i === 4) { const sx = kx + 7 + i * kcw; key(x, sx, ky + 6 + j * kch, kcw * 7 - gap, kch - gap); } continue; }
    key(x, kx + 7 + i * kcw, ky + 6 + j * kch, kcw - gap, kch - gap);
  }
  // monitor stand: brushed metal column and foot
  const sx = mon.x + mon.w / 2;
  softShadow(x, 14, 'rgba(0,0,0,.55)', 0, 4, () => { x.beginPath(); x.ellipse(sx, desk + 3, 80, 7, 0, 0, TAU); x.fill(); });
  const mg = x.createLinearGradient(sx - 16, 0, sx + 16, 0);
  mg.addColorStop(0, '#3A3A42'); mg.addColorStop(0.35, '#6A6A74'); mg.addColorStop(0.6, '#2C2C34'); mg.addColorStop(1, '#1A1A20');
  x.fillStyle = mg; x.fillRect(sx - 15, mon.y + mon.h - 4, 30, desk - mon.y - mon.h + 8);
  const fg2 = x.createLinearGradient(0, desk - 3, 0, desk + 6);
  fg2.addColorStop(0, '#5A5A64'); fg2.addColorStop(1, '#1E1E24');
  x.fillStyle = fg2; rr(x, sx - 72, desk - 3, 144, 9, 3); x.fill();
  // bezel: thin black glass with a cool rim
  softShadow(x, 30, 'rgba(0,0,0,.6)', 0, 10, () => { rr(x, mon.x, mon.y, mon.w, mon.h, 10); x.fill(); });
  x.fillStyle = vgrad(x, 0, mon.y, mon.y + mon.h, [[0, '#1C1B22'], [1, '#0E0D12']]);
  rr(x, mon.x, mon.y, mon.w, mon.h, 10); x.fill();
  x.strokeStyle = 'rgba(180,190,220,.18)'; x.lineWidth = 1; rr(x, mon.x + 0.5, mon.y + 0.5, mon.w - 1, mon.h - 1, 10); x.stroke();
  // speakers either side on wide screens
  if (W > 900) for (const sd of [-1, 1]) {
    const spx = sx + sd * (mon.w / 2 + mon.w * 0.14), spw = mon.w * 0.12, sph = spw * 1.7;
    softShadow(x, 12, 'rgba(0,0,0,.6)', 0, 4, () => { x.fillRect(spx - spw / 2, desk - sph, spw, sph); });
    x.fillStyle = vgrad(x, 0, desk - sph, desk, [[0, '#24222A'], [1, '#141218']]);
    rr(x, spx - spw / 2, desk - sph, spw, sph, 4); x.fill();
    for (const [cy, rr2] of [[desk - sph * 0.72, spw * 0.3], [desk - sph * 0.3, spw * 0.38]]) {
      const cg = x.createRadialGradient(spx - rr2 * 0.2, cy - rr2 * 0.2, 0, spx, cy, rr2);
      cg.addColorStop(0, '#3A3A44'); cg.addColorStop(0.7, '#101016'); cg.addColorStop(1, '#2A2A32');
      x.fillStyle = cg; x.beginPath(); x.arc(spx, cy, rr2, 0, TAU); x.fill();
    }
  }
  return c;
}

function key(x, kx, ky, w, h) {
  x.fillStyle = '#0B0A0E'; rr(x, kx, ky + 1, w, h, 2.5); x.fill();
  x.fillStyle = vgrad(x, 0, ky, ky + h, [[0, '#2E2C34'], [1, '#1A181E']]);
  rr(x, kx + 0.6, ky, w - 1.2, h - 1.2, 2.2); x.fill();
  x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(kx + 2, ky + 0.4, w - 4, 0.8);
}

/* foreground: a ceramic mug and the edge of a lamp, out of focus */
function paintFG(W, H) {
  const c = bake(W, H, 0.5, (x, w, h) => {
    const mx = w * 0.04, my = h * 0.72, mw = w * 0.1, mh = h * 0.26;
    const g = x.createLinearGradient(mx, 0, mx + mw, 0);
    g.addColorStop(0, '#2A2630'); g.addColorStop(0.25, '#4A4450'); g.addColorStop(0.5, '#241F28'); g.addColorStop(1, '#121016');
    x.fillStyle = g; rr(x, mx, my, mw, mh, 10); x.fill();
    x.strokeStyle = '#1C1A22'; x.lineWidth = w * 0.014; x.beginPath(); x.arc(mx + mw * 1.05, h * 0.82, h * 0.05, -1.2, 1.2); x.stroke();
    x.fillStyle = 'rgba(255,200,140,.28)'; x.fillRect(mx + mw * 0.12, my + 4, w * 0.01, mh * 0.85);
    x.fillStyle = 'rgba(160,190,255,.12)'; x.fillRect(mx + mw * 0.78, my + 6, w * 0.006, mh * 0.8);
    x.fillStyle = '#121119'; x.beginPath(); x.moveTo(w * 0.86, h); x.lineTo(w * 0.9, h * 0.62); x.lineTo(w * 1.02, h * 0.58); x.lineTo(w * 1.02, h); x.fill();
    x.fillStyle = 'rgba(255,170,90,.38)'; x.beginPath(); x.ellipse(w * 0.96, h * 0.6, w * 0.06, h * 0.02, -0.2, 0, TAU); x.fill();
  });
  return blurred(c, 10);
}

export default function paint({ W, H, dpr, mobile }) {
  const G = geom(W, H);
  const sc = Math.min(dpr, 1.25);
  const cw = Math.round(G.win.w * 1.15), ch = Math.round(G.win.h);
  const sky = paintSky(cw, ch);
  const far = paintTowers(cw, ch, sc, 31, 0, 0.8);
  const mid = paintTowers(cw, ch, sc, 32, 1, 0.9);
  const thumb = bake(Math.round(cw / 5), Math.round(ch / 5), 1, (x, w, h) => {
    x.drawImage(sky, 0, 0, w, h); x.drawImage(far.c, 0, 0, w, h); x.drawImage(mid.c, 0, h * 0.06, w, h);
  });
  return {
    cw, ch, sky, far: far.c, mid: mid.c, thumb,
    beacons: far.beacons.concat(mid.beacons.map(([bx, by, ph]) => [bx, by + ch * 0.06, ph, 1])),
    wall: paintWall(W, H, 0.5),
    desk: paintDesk(W, H, G, sc),
    fg: paintFG(W, H),
  };
}
