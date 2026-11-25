/* Painting for 07 · Swimming — "Through the Surface". Underwater, light
   from above: far rock arches lost in blue, a seabed of real boulders
   (formed by a height field, tops furred with algae and crusted pink
   coralline), rippled sand between them, big near rocks with anemones and
   sea grass, kelp fronds close to the mask. Water eats red first, so
   everything shifts toward cyan with distance. Also bakes the caustic
   animation the scene stamps onto the stones. */
import { TAU, rng, clamp, bake, blurred, makeCanvas, newCanvas } from '../util.js';
import { vgrad, frond } from '../paint.js';
import { tnoise, paintPixels, C, mixInto, ramp3, sstep, postPixels, mulPx, boulders, rimLight } from '../realism.js';

const B = 1 << 20;

/* animated caustic texture: interference of travelling waves, thresholded */
function causticFrames(n = 16, S = 128) {
  const out = [];
  const dirs = Array.from({ length: 5 }, (_, i) => { const a = (i / 5) * Math.PI + 0.3; return [Math.cos(a), Math.sin(a)]; });
  for (let f = 0; f < n; f++) {
    const c = newCanvas(S, S);
    const x = c.getContext('2d');
    const im = x.createImageData(S, S);
    const ph = (f / n) * TAU;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      let v = 0;
      for (let k = 0; k < 5; k++) {
        const [dx, dy] = dirs[k];
        v += Math.sin(((i * dx + j * dy) / S) * TAU * (2 + (k % 3)) + ph * (k % 2 ? 1 : -1) + k);
      }
      const b = Math.pow(Math.max(0, 1 - Math.abs(v) / 1.6), 4);
      const q = (j * S + i) * 4;
      im.data[q] = 230; im.data[q + 1] = 255; im.data[q + 2] = 240; im.data[q + 3] = Math.round(b * 255);
    }
    x.putImageData(im, 0, 0);
    c.w = S; c.h = S;
    out.push(c);
  }
  return out;
}

/* far arches: shapes almost dissolved in the water, only their lit lips
   and a little texture show */
function paintArches(W, h, sc) {
  const r = rng(707);
  const nz = tnoise(708);
  const c = makeCanvas(W, h, sc);
  const x = c.x;
  x.fillStyle = '#000';
  x.beginPath(); x.moveTo(0, h);
  for (let px = 0; px <= W; px += 6) x.lineTo(px, h * 0.7 - (nz.fbm(px / 160, 0.3, B, 4) - 0.35) * h * 0.3);
  x.lineTo(W, h); x.fill();
  for (let k = 0; k < 3; k++) {
    const ax = W * (0.15 + k * 0.33) + r.range(-30, 30), aw = W * r.range(0.13, 0.19), ah = h * r.range(0.34, 0.48), base = h * 0.72;
    x.beginPath(); x.moveTo(ax - aw / 2, base); x.quadraticCurveTo(ax - aw * 0.55, base - ah, ax, base - ah * 1.02); x.quadraticCurveTo(ax + aw * 0.55, base - ah, ax + aw / 2, base);
    x.lineTo(ax + aw * 0.28, base); x.quadraticCurveTo(ax + aw * 0.3, base - ah * 0.68, ax, base - ah * 0.7); x.quadraticCurveTo(ax - aw * 0.3, base - ah * 0.68, ax - aw * 0.28, base); x.closePath(); x.fill();
  }
  for (let k = 0; k < 22; k++) {
    const kx = r() * W;
    x.lineWidth = r.range(3, 7); x.strokeStyle = '#000';
    x.beginPath(); x.moveTo(kx, h); x.quadraticCurveTo(kx + r.range(-30, 30), h * 0.6, kx + r.range(-20, 20), h * r.range(0.2, 0.5)); x.stroke();
  }
  const deep = C('#0A3448'), lit = C('#2E6A78');
  postPixels(c, (px, py, p) => {
    const n = nz.fbm(px / 26, py / 26, B, 5);
    const o = [0, 0, 0];
    mixInto(o, deep, lit, clamp(n * 0.9 - py / h * 0.4 + 0.15));
    p[0] = o[0]; p[1] = o[1]; p[2] = o[2]; p[3] = 200;
  });
  rimLight(c, '#7FC6C8', 3, 1.5, 0.45);
  return c;
}

/* the seabed: boulders in a loose band, sand rippled between them */
function paintStones(W, h, sc, mobile) {
  const r = rng(709);
  const nz = tnoise(710);
  const sandD = C('#21545C'), sandL = C('#5A9690');
  const o = [0, 0, 0];
  // sand: ripples across the bed, a soft dapple, darker into the distance
  const c = paintPixels(W, h, sc * 0.8, (x, y, out) => {
    const v = y / h;
    if (v < 0.42) return;
    const warp = nz.fbm(x / 140, y / 30, B, 3);
    const rip = 0.5 + 0.5 * Math.sin(x / (7 + v * 8) + warp * 14 + y * 0.05);
    const n = nz(x / 3, y / 3, B);
    mixInto(o, sandD, sandL, clamp(0.2 + rip * 0.35 * v + (n - 0.5) * 0.25 + (v - 0.42) * 0.6));
    out[0] = o[0]; out[1] = o[1]; out[2] = o[2]; out[3] = sstep(0.42, 0.52, v);
  });
  const blobs = [];
  const count = mobile ? 26 : 46;
  for (let k = 0; k < count; k++) {
    const bx = r() * W, by = h * r.range(0.5, 0.78), rx = r.range(28, 80), ry = rx * r.range(0.45, 0.75);
    blobs.push([bx, by, rx, ry, ry * 1.1]);
    if (r() < 0.5) blobs.push([bx + r.range(-rx, rx) * 0.6, by + ry * 0.3, rx * 0.5, ry * 0.5, ry * 0.6]);
  }
  const algae = C('#4E8A5E'), algaeD = C('#2A5A44'), coral = C('#C98A9A'), rockD = C('#12323A'), rockM = C('#2F5A62'), rockL = C('#7FB0AC');
  const rocks = boulders(W, h, sc * 0.8, blobs, {
    seed: 711, rough: 0.7, light: [-0.2, -1, 0.45], detail: 9,
    colour: (N, x, y, out3, sh) => {
      ramp3(out3, rockD, rockM, rockL, sh);
      // what faces up grows a fur of algae; pink coralline crusts in patches
      const up = clamp(-N[1] * 1.6 - 0.2);
      const a = nz.fbm(x / 6, y / 6, B, 3);
      if (up > 0) { ramp3(o, algaeD, algae, algae, sh); mixInto(out3, out3, o, up * clamp(a * 1.6 - 0.3)); }
      if (nz(x / 9 + 300, y / 9, B) > 0.78) mixInto(out3, out3, coral, 0.45 * sh);
      // the far stones fade into the water
      mixInto(out3, out3, C('#0E3E50'), clamp(0.55 - y / h * 0.6));
    },
  });
  // seat each stone: a soft shadow on the sand under it
  const x = c.x;
  for (const [bx, by, rx, ry] of blobs) { x.fillStyle = 'rgba(4,20,26,.35)'; x.beginPath(); x.ellipse(bx + 6, by + ry * 0.7, rx * 0.95, ry * 0.3, 0, 0, TAU); x.fill(); }
  x.drawImage(rocks, 0, 0, W, h);
  return c;
}

/* near rocks: big and lit, sea anemones swaying their tentacles (painted
   still here), a sponge or two, sea grass, pebbles */
function paintNear(W, h, sc, mobile) {
  const r = rng(712);
  const nz = tnoise(713);
  const blobs = [];
  for (let k = 0; k < 10; k++) {
    const bx = (k / 9) * W + r.range(-30, 30), rx = r.range(W * 0.08, W * 0.16), ry = r.range(h * 0.3, h * 0.55);
    blobs.push([bx, h * 1.02, rx, ry, ry * 0.9]);
    blobs.push([bx + rx * r.range(-0.6, 0.6), h * 1.02 - ry * 0.5, rx * 0.45, ry * 0.45, ry * 0.5]);
  }
  const rockD = C('#0C262C'), rockM = C('#2A5458'), rockL = C('#8CBDB4'), algae = C('#5E9A5A'), red = C('#B06A70');
  const o = [0, 0, 0];
  const c = boulders(W, h, sc, blobs, {
    seed: 714, rough: 0.8, light: [-0.3, -1, 0.5], detail: 14,
    colour: (N, x, y, out3, sh) => {
      ramp3(out3, rockD, rockM, rockL, sh);
      const up = clamp(-N[1] * 1.4 - 0.15);
      const a = nz.fbm(x / 8, y / 8, B, 4);
      if (up > 0) { mixInto(o, rockM, algae, clamp(a * 1.4)); mulPx(o, 0.5 + sh * 0.8); mixInto(out3, out3, o, up * 0.85); }
      if (nz(x / 12 + 200, y / 12, B) > 0.74) mixInto(out3, out3, red, 0.35 * sh);
    },
  });
  const x = c.x;
  // pebbles at the foot
  for (let k = 0; k < (mobile ? 40 : 80); k++) {
    const px = r() * W, py = h * r.range(0.82, 1), pr = r.range(3, 9);
    const g = x.createRadialGradient(px - pr * 0.3, py - pr * 0.4, 0, px, py, pr);
    const t = r.pick([['#9AC6BA', '#2A5050'], ['#7AA8A0', '#1E4044'], ['#B8C8B0', '#3A5048']]);
    g.addColorStop(0, t[0]); g.addColorStop(1, t[1]);
    x.fillStyle = g; x.beginPath(); x.ellipse(px, py, pr, pr * 0.65, 0, 0, TAU); x.fill();
  }
  // anemones: a column and a crown of lit tentacles
  for (let k = 0; k < (mobile ? 4 : 7); k++) {
    const ax = r() * W, ay = h * r.range(0.45, 0.8), s = r.range(8, 16);
    const col = r.pick([['#E89AB0', '#8A3A5A'], ['#F0C070', '#8A5A20'], ['#A8E0C8', '#3A7A6A']]);
    x.fillStyle = vgrad(x, 0, ay - s, ay + s * 0.4, [[0, col[1]], [1, '#1A2A2A']]); x.fillRect(ax - s * 0.35, ay - s, s * 0.7, s * 1.4);
    for (let j = 0; j < 26; j++) {
      const a = -Math.PI / 2 + (j / 25 - 0.5) * 2.6;
      const len = s * r.range(0.8, 1.3);
      const g = x.createLinearGradient(ax, ay - s, ax + Math.cos(a) * len, ay - s + Math.sin(a) * len);
      g.addColorStop(0, col[1]); g.addColorStop(1, col[0]);
      x.strokeStyle = g; x.lineWidth = 1.4; x.lineCap = 'round';
      x.beginPath(); x.moveTo(ax, ay - s); x.quadraticCurveTo(ax + Math.cos(a) * len * 0.5 + r.range(-2, 2), ay - s + Math.sin(a) * len * 0.6, ax + Math.cos(a) * len, ay - s + Math.sin(a) * len); x.stroke();
    }
  }
  // sea grass
  for (let k = 0; k < 14; k++) frond(x, r() * W, h * r.range(0.55, 0.75), r.range(40, 90), -Math.PI / 2 + r.range(-0.6, 0.6), r.pick(['#2F6B4F', '#3E7B5A', '#245A44', '#4E8A60']), r, 9, 0.18);
  rimLight(c, '#CFF6EE', 2.5, 1.2, 0.5);
  return c;
}

function paintFG(W, H) {
  const r = rng(715);
  return blurred(bake(W, H, 0.5, (x, w, h) => {
    for (let k = 0; k < 8; k++) {
      const fx = k % 2 ? w * r.range(0.82, 1.02) : w * r.range(-0.02, 0.16);
      frond(x, fx, h + 20, r.range(h * 0.35, h * 0.7), -Math.PI / 2 + r.range(-0.4, 0.4), r.pick(['#0E3A2E', '#124434', '#0A2E24', '#1A5040']), r, 12, 0.14);
    }
  }), 10);
}

export default function paint({ W, H, dpr, mobile }) {
  const sc = Math.min(dpr, 1.25);
  return {
    arches: paintArches(W, Math.round(H * 0.7), Math.min(1, sc)),
    stones: paintStones(W, Math.round(H * 0.6), sc, mobile),
    near: paintNear(W, Math.round(H * 0.45), sc, mobile),
    fg: paintFG(W, H),
    caustics: causticFrames(mobile ? 10 : 16),
  };
}
