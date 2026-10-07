/* Pixel sprites for Mission 4, all generated at load into small canvases.
   The hero is rigged rather than hand-drawn frame by frame: head and torso
   are palette-indexed pixel art taken from your portrait (swept-back black
   hair, full beard, dark green-charcoal overshirt with chest pockets), and
   the limbs are drawn as thick pixel lines at keyframed joint angles. Every
   frame then gets an automatic 1px ink outline, Metal Slug style. */

export const C = {
  ink: '#0d0f17',
  skin: '#c08458', skinD: '#8f5a38', hair: '#14121a', hairH: '#3a3442', beard: '#1a1410', eye: '#0b0b0b', teeth: '#f4efe6',
  shirt: '#2b3a33', shirtD: '#1c2723', shirtH: '#46594f', btn: '#0c0f0e',
  pants: '#262d40', pantsD: '#181d2b', shoe: '#e8e4dc', shoeD: '#8f8a82',
  gun: '#4d5560', gunD: '#2b3038', gunH: '#8a96a3',
  steel0: '#2a313a', steel1: '#5b6a7a', steel2: '#9aaab8', rust0: '#5a2a1a', rust1: '#b4552d', rust2: '#e08a4a',
  jg0: '#0f2a1d', jg1: '#1d4a2c', jg2: '#3e7b3a', jg3: '#7cc24a', jg4: '#b8e070',
  red: '#ff3b3b', gold: '#ffe14a', white: '#ffffff', orange: '#ff8a3d', cream: '#fff1b8',
  dirt0: '#2a1c14', dirt1: '#4a3020', dirt2: '#6e4a2c',
};

export function pcanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  c.x = x;
  return c;
}

/** Stamp pixel-art rows: each char looks up a colour in `pal` ('.' = clear). */
export function stamp(x, rows, ox, oy, pal, flip = false) {
  const w = rows[0].length;
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < w; c++) {
      const ch = rows[r][c];
      if (ch === '.' || ch === ' ') continue;
      x.fillStyle = pal[ch];
      x.fillRect(ox + (flip ? w - 1 - c : c), oy + r, 1, 1);
    }
  }
}

/** Thick pixel line: a square brush stepped along Bresenham. */
export function pline(x, x0, y0, x1, y1, w, color) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const o = Math.floor(w / 2);
  x.fillStyle = color;
  for (;;) {
    x.fillRect(x0 - o, y0 - o, w, w);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** Filled pixel disc. */
export function pdisc(x, cx, cy, r, color) {
  x.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const w = Math.round(Math.sqrt(r * r - y * y));
    x.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

/** 1px ink outline around every opaque pixel. */
export function outline(c, color = C.ink) {
  const { width: w, height: h } = c;
  const x = c.x || c.getContext('2d');
  const src = x.getImageData(0, 0, w, h);
  const d = src.data;
  const out = new Uint8ClampedArray(d);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  const op = (i, j) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 40;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = (j * w + i) * 4;
    if (d[k + 3] > 40) continue;
    if (op(i - 1, j) || op(i + 1, j) || op(i, j - 1) || op(i, j + 1)) { out[k] = r; out[k + 1] = g; out[k + 2] = b; out[k + 3] = 255; }
  }
  x.putImageData(new ImageData(out, w, h), 0, 0);
  return c;
}

/* ---------------------------------------------------------------- hero */
const HEAD = [
  '...HHHHH....',
  '..HHhhhHHH..',
  '.HHHHhhHHHH.',
  '.HHHHHHHHHHH',
  '.HHHHHHHSHH.',
  '.HHHHSSSSSS.',
  '.HHHsSSSSES.',
  '.HHssSSSSSS.',
  '.HHsSSSSSSSS',
  '.BBBSBBBBSB.',
  '.BBBBBBTTBB.',
  '..BBBBBBBBB.',
  '..BBBBBBBB..',
  '...BBBBBB...',
];
const TORSO = [
  '...KSSK....',
  '.DXXXXXXXl.',
  'DDXXXXXXXXl',
  'DDXXPPPPXXl',
  'DDXXPOPPXXl',
  'DDXXXXXXXXl',
  'DDXXXXoXXXl',
  'DDXXXXXXXXl',
  'DDXXXXoXXXl',
  'DDXXXXXXXXl',
  '.DXXXXoXXX.',
  '.KKKKKKKKK.',
];
const PAL = {
  H: C.hair, h: C.hairH, S: C.skin, s: C.skinD, E: C.eye, B: C.beard, T: C.teeth,
  K: C.shirtD, D: C.shirtD, X: C.shirt, l: C.shirtH, P: C.shirtD, O: C.btn, o: C.btn,
};

export const CELL = 48;
const FOOT_Y = 45;

function leg(x, hx, hy, a, bend, back) {
  const kx = hx + Math.sin(a) * 7, ky = hy + Math.cos(a) * 7;
  const sa = a - bend;
  const ax = kx + Math.sin(sa) * 7, ay = ky + Math.cos(sa) * 7;
  pline(x, hx, hy, kx, ky, 4, back ? C.pantsD : C.pants);
  pline(x, kx, ky, ax, ay, 3, back ? C.pantsD : C.pants);
  // sneaker, kept flat
  x.fillStyle = back ? C.shoeD : C.shoe;
  x.fillRect(Math.round(ax) - 2, Math.round(ay), 6, 2);
  x.fillStyle = back ? C.pantsD : C.shoeD;
  x.fillRect(Math.round(ax) - 2, Math.round(ay) + 2, 6, 1);
}

function gunAt(x, gx, gy, recoil = 0) {
  gx -= recoil;
  x.fillStyle = C.gunD; x.fillRect(gx - 3, gy + 1, 3, 2);         // stock
  x.fillStyle = C.gun; x.fillRect(gx, gy, 10, 3);                    // receiver
  x.fillStyle = C.gunH; x.fillRect(gx + 1, gy, 8, 1);
  x.fillStyle = C.gunD; x.fillRect(gx + 10, gy, 5, 2);               // barrel
  x.fillStyle = C.gunD; x.fillRect(gx + 2, gy + 3, 2, 3);            // grip
  x.fillStyle = C.steel1; x.fillRect(gx + 5, gy + 3, 2, 4);          // magazine
  return [gx + 15, gy];
}

/** Draw one hero pose into a fresh 48×48 cell. Returns { c, tip }. */
function pose({ fa, fb, ba, bb, bob = 0, lean = 0, blink = false, recoil = 0, up = false, fist = false }) {
  const c = pcanvas(CELL, CELL);
  const x = c.x;
  const hipY = FOOT_Y - 14 + bob;
  const hx = 21 + lean;
  leg(x, hx - 1, hipY, ba, bb, true);
  const tx = hx - 5, ty = hipY - 12;
  let tip = null;
  if (!up) {
    // far arm reaches to the barrel
    pline(x, tx + 3, ty + 3, tx + 13, ty + 7, 3, C.shirtD);
  }
  stamp(x, TORSO, tx, ty, PAL);
  const head = blink ? HEAD.map((r) => r.replace('E', 'S')) : HEAD;
  stamp(x, head, tx - 1, ty - 13, PAL);
  leg(x, hx + 1, hipY, fa, fb, false);
  if (up) {
    // victory: gun raised in the near hand, far fist pumping
    x.fillStyle = C.gun; x.fillRect(tx + 9, ty - 13, 3, 12);
    x.fillStyle = C.gunH; x.fillRect(tx + 9, ty - 13, 1, 12);
    x.fillStyle = C.gunD; x.fillRect(tx + 9, ty - 17, 2, 5);
    pline(x, tx + 7, ty + 3, tx + 10, ty - 2, 3, C.shirt);
    x.fillStyle = C.skin; x.fillRect(tx + 9, ty - 3, 3, 2);
    if (fist) { pline(x, tx + 2, ty + 3, tx - 1, ty - 5, 3, C.shirtD); x.fillStyle = C.skin; x.fillRect(tx - 2, ty - 8, 3, 3); }
    else { pline(x, tx + 2, ty + 3, tx, ty + 8, 3, C.shirtD); }
  } else {
    const gx = tx + 8, gy = ty + 5;
    tip = gunAt(x, gx, gy, recoil);
    x.fillStyle = C.skin; x.fillRect(gx + 8 - recoil, gy + 3, 2, 2);  // support hand
    pline(x, tx + 6, ty + 3, tx + 5, ty + 8, 3, C.shirt);            // near arm
    pline(x, tx + 5, ty + 8, gx + 2 - recoil, gy + 3, 3, C.shirt);
    x.fillStyle = C.skin; x.fillRect(gx + 2 - recoil, gy + 3, 2, 2);
  }
  outline(c);
  return { c, tip };
}

export function heroFrames() {
  const F = { idle: [], run: [], runShoot: [], skid: [], jump: [], victory: [] };
  const IDLE_BOB = [0, 0, 1, 1, 1, 0];
  for (let f = 0; f < 6; f++) F.idle.push(pose({ fa: 0.2, fb: 0.05, ba: -0.14, bb: 0.05, bob: IDLE_BOB[f], blink: f === 5 }));
  for (let f = 0; f < 8; f++) {
    const ph = (f / 8) * Math.PI * 2;
    const a1 = 0.72 * Math.sin(ph), a2 = 0.72 * Math.sin(ph + Math.PI);
    const b1 = 0.2 + 1.25 * Math.max(0, Math.cos(ph)), b2 = 0.2 + 1.25 * Math.max(0, Math.cos(ph + Math.PI));
    const bob = Math.round(1 - Math.abs(Math.sin(ph)));
    const P = { fa: a1, fb: b1, ba: a2, bb: b2, bob, lean: 1 };
    F.run.push(pose(P));
    F.runShoot.push(pose({ ...P, recoil: f % 2 }));
  }
  F.skid.push(pose({ fa: 0.95, fb: 0.1, ba: 0.25, bb: 0.95, bob: 2, lean: -2 }));
  F.skid.push(pose({ fa: 0.85, fb: 0.15, ba: 0.2, bb: 1.0, bob: 2, lean: -1 }));
  F.jump.push(pose({ fa: 0.9, fb: 1.6, ba: -0.3, bb: 1.2, bob: -1 }));
  F.jump.push(pose({ fa: 1.25, fb: 2.2, ba: 0.6, bb: 2.0, bob: -2 }));
  F.jump.push(pose({ fa: 0.45, fb: 0.4, ba: -0.25, bb: 0.6, bob: 0 }));
  for (let f = 0; f < 4; f++) F.victory.push(pose({ fa: 0.32, fb: 0.05, ba: -0.32, bb: 0.05, bob: f % 2, up: true, fist: f % 2 === 1 }));
  F.idleShoot = F.idle.map((_, f) => pose({ fa: 0.2, fb: 0.05, ba: -0.14, bb: 0.05, bob: 0, recoil: f % 2 }));
  return F;
}

/** Tiny hero head for the lives counter. */
export function lifeHead() {
  const c = pcanvas(9, 9);
  stamp(c.x, ['.HHHHH...', 'HHhhHHH..', 'HHHHSSSS.', 'HHHSSSES.', 'HHsSSSSSS', '.BBBBTTB.', '.BBBBBBB.', '..BBBBB..'], 0, 0, PAL);
  return outline(c);
}

/* ---------------------------------------------------------------- enemies */
const DRONE = [
  '.....s.........',
  '....MMMMMMM....',
  '..MMmmmmmmmMM..',
  '.MMmEEmmmmmlMM.',
  '.MmmEEmmmmmmmM.',
  '..MMmmmmmmmMM..',
  '...M..M.M..M...',
  '..M...M.M...M..',
];
export function droneFrames() {
  const pal = { M: C.steel1, m: C.steel0, E: C.red, s: C.steel2, l: C.steel2 };
  return [0, 1].map((f) => {
    const c = pcanvas(17, 11);
    c.x.fillStyle = '#c8d0d8';
    if (f === 0) c.x.fillRect(2, 1, 13, 1); else c.x.fillRect(5, 1, 7, 1);
    stamp(c.x, DRONE, 1, 2, pal);
    return outline(c);
  });
}

export function raptorFrames() {
  const out = [];
  for (let f = 0; f < 4; f++) {
    const c = pcanvas(44, 30);
    const x = c.x;
    const ph = (f / 4) * Math.PI * 2;
    const bob = Math.round(Math.abs(Math.sin(ph)));
    const by = 13 - bob;
    // tail
    for (let k = 0; k <= 12; k++) { const u = k / 12; pline(x, 13 - k * 1.1, by - 1 - u * 4 + Math.sin(ph + u * 3) * 1.2, 13 - k * 1.1, by - 1 - u * 4, Math.max(1, Math.round(4 - u * 3)), C.jg2); }
    // far leg
    const leg = (a, col) => {
      const hx = 21, hy = by + 3;
      const kx = hx + Math.sin(a) * 6, ky = hy + 6;
      const ax = kx - 3 + Math.sin(a) * 2, ay = ky + 6;
      pline(x, hx, hy, kx, ky, 4, col);
      pline(x, kx, ky, ax, ay, 2, col);
      x.fillStyle = C.cream; x.fillRect(Math.round(ax), Math.round(ay), 5, 1);
    };
    leg(Math.sin(ph + Math.PI) * 0.8, '#2d5a2a');
    // body
    x.fillStyle = C.jg2;
    for (let yy = -5; yy <= 5; yy++) { const w = Math.round(Math.sqrt(1 - (yy / 5.5) ** 2) * 10); x.fillRect(22 - w, by + yy, w * 2, 1); }
    x.fillStyle = '#c9b77a';
    for (let yy = 2; yy <= 5; yy++) { const w = Math.round(Math.sqrt(1 - (yy / 5.5) ** 2) * 8); x.fillRect(23 - w, by + yy, w * 2, 1); }
    x.fillStyle = C.dirt1;
    for (let k = 0; k < 4; k++) x.fillRect(15 + k * 4, by - 4, 2, 4);
    // neck and head
    pline(x, 29, by - 1, 33, by - 7, 4, C.jg2);
    x.fillStyle = C.jg2; x.fillRect(31, by - 11, 10, 5);
    x.fillStyle = '#c9b77a'; x.fillRect(32, by - 6, 8, 1);
    const jaw = f % 2;
    x.fillStyle = C.jg2; x.fillRect(32, by - 6 + jaw, 8, 2);
    x.fillStyle = C.white; for (let k = 0; k < 4; k++) { x.fillRect(33 + k * 2, by - 7, 1, 1); x.fillRect(33 + k * 2, by - 5 + jaw, 1, 1); }
    x.fillStyle = C.gold; x.fillRect(35, by - 10, 2, 1);
    x.fillStyle = C.red; x.fillRect(36, by - 10, 1, 1);
    // arm
    pline(x, 28, by + 2, 30, by + 5, 2, '#2d5a2a');
    leg(Math.sin(ph) * 0.8, C.jg2);
    out.push(outline(c));
  }
  return out;
}

/** The vine-wrapped walker. Eyes are left dark; they glow live. */
export function bossSprite() {
  const c = pcanvas(88, 74);
  const x = c.x;
  // legs
  const legs = [[30, 40, 21, 54, 26, 68], [60, 40, 68, 54, 63, 68]];
  for (const [hx, hy, kx, ky, fx, fy] of legs) {
    pline(x, hx, hy, kx, ky, 7, C.steel1);
    pline(x, kx, ky, fx, fy, 6, C.steel1);
    pline(x, hx + 1, hy, kx + 1, ky, 2, C.steel2);
    x.fillStyle = C.steel0; x.fillRect(kx - 4, ky - 4, 8, 8);
    x.fillStyle = C.rust1; x.fillRect(kx - 2, ky - 2, 4, 4);
    x.fillStyle = C.steel0; x.fillRect(fx - 8, fy, 16, 5);
    x.fillStyle = C.steel1; x.fillRect(fx - 8, fy, 16, 1);
  }
  // hull
  x.fillStyle = C.steel1;
  for (let y = 10; y < 42; y++) { const k = y < 16 ? (16 - y) * 1.6 : y > 34 ? (y - 34) * 1.4 : 0; x.fillRect(12 + k, y, 64 - k * 2, 1); }
  x.fillStyle = C.steel0; x.fillRect(16, 34, 56, 7);
  x.fillStyle = C.steel2; x.fillRect(20, 11, 48, 1);
  // rust patches and rivets
  x.fillStyle = C.rust1; x.fillRect(18, 26, 9, 5); x.fillRect(40, 36, 12, 3); x.fillRect(64, 14, 6, 7);
  x.fillStyle = C.rust2; x.fillRect(19, 27, 4, 2); x.fillRect(65, 15, 2, 3);
  x.fillStyle = C.steel0; for (let k = 0; k < 9; k++) x.fillRect(18 + k * 6, 13, 1, 1);
  // cockpit band
  x.fillStyle = '#141820'; x.fillRect(46, 17, 26, 9);
  x.fillStyle = '#300'; x.fillRect(51, 19, 5, 5); x.fillRect(62, 19, 5, 5);
  // missile pod
  x.fillStyle = C.steel0; x.fillRect(20, 3, 18, 8);
  x.fillStyle = C.red; for (let k = 0; k < 4; k++) x.fillRect(22 + k * 4, 4, 2, 2);
  // cannon arm
  pline(x, 70, 30, 87, 32, 5, C.steel0);
  x.fillStyle = C.steel2; x.fillRect(71, 29, 14, 1);
  // vines and moss
  const vine = (pts) => { for (let k = 0; k < pts.length - 1; k++) pline(x, ...pts[k], ...pts[k + 1], 2, C.jg2); };
  vine([[14, 12], [22, 20], [18, 30], [26, 40], [22, 52], [26, 66]]);
  vine([[50, 10], [56, 16], [70, 14], [74, 24], [66, 40], [70, 52]]);
  vine([[30, 41], [36, 36], [44, 42], [52, 36]]);
  x.fillStyle = C.jg3;
  for (const [vx, vy] of [[22, 20], [18, 30], [56, 16], [74, 24], [44, 42], [26, 40]]) { x.fillRect(vx - 1, vy - 1, 3, 2); x.fillRect(vx + 1, vy - 2, 2, 1); }
  x.fillStyle = C.jg3; x.fillRect(24, 8, 12, 2); x.fillRect(54, 9, 10, 2);
  x.fillStyle = C.jg4; x.fillRect(26, 7, 4, 1); x.fillRect(57, 8, 3, 1);
  outline(c);
  return { c, eyes: [[53, 21], [64, 21]], muzzle: [88, 32] };
}

export function craneFrames() {
  const rows = [
    ['....W......', '...WWW....W', 'WWWWWWWWWW.', '.WWWWWW....', '...........'],
    ['...........', '..........W', 'WWWWWWWWWW.', '.WWWWWW....', '..WWW......'],
  ];
  return rows.map((r) => {
    const c = pcanvas(11, 5);
    stamp(c.x, r, 0, 0, { W: '#fff8ec' });
    return outline(c);
  });
}
