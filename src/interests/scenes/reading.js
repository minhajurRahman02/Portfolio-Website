/* 06 · Reading — "The Window Nook"
   A sunlit window seat in a small library. A volumetric sunbeam slides
   across the room as the afternoon moves on; dust glitters only inside it.
   Late in the scene the loose pages lift, fold into birds and fly out. */
import { READ } from '../config.js';
import { TAU, rng, clamp, lerp, ease, inv, bell, bake, blurred } from '../util.js';
import { vgrad, glow, ridge, cloudSprite, treeClump, rr, speckle, frond } from '../paint.js';
import { field } from '../particles.js';
import { layer, push } from '../depth.js';

export default function create() {
  let L = null;

  function geom(W, H) {
    const wide = W > 900;
    const win = wide ? { x: W * 0.44, y: H * 0.1, w: W * 0.36, h: H * 0.56 } : { x: W * 0.16, y: H * 0.08, w: W * 0.68, h: H * 0.44 };
    const seat = { y: win.y + win.h + H * 0.04 };
    return { win, seat, wide };
  }

  function build(env) {
    const { W, H, dpr, mobile, pscale } = env;
    const G = geom(W, H);
    const { win } = G;
    const r = rng(606);

    /* the view through the window */
    const view = bake(win.w * 1.3, win.h * 1.1, dpr, (x, w, h) => {
      x.fillStyle = vgrad(x, 0, 0, h, [[0, '#7FB8E6'], [0.6, '#BFE0F4'], [1, '#EAF4E8']]);
      x.fillRect(0, 0, w, h);
      for (let k = 0; k < 4; k++) {
        const cw = w * r.range(0.25, 0.45), c = cloudSprite(660 + k, Math.round(cw), Math.round(cw * 0.42), { soft: 1.5 });
        x.drawImage(c, r() * w * 0.9 - cw * 0.3, h * r.range(0.04, 0.35));
      }
      ridge(x, w, h, { base: h * 0.7, amp: h * 0.08, seed: 61, oct: 4, fill: '#8DB7A8' });
      const top = ridge(x, w, h, { base: h * 0.8, amp: h * 0.06, seed: 62, oct: 3, fill: vgrad(x, 0, h * 0.7, h, [[0, '#6FA05E'], [1, '#5E8F4E']]), rim: 'rgba(255,255,220,.5)' });
      for (let k = 0; k < 20; k++) { const tx = r() * w; treeClump(x, tx, top(tx / w) + 4, r.range(5, 12), r, '#3E6B3A', '#4F7F45', '#79A85C'); }
      const tx = w * 0.72; x.fillStyle = '#4A3A2A'; x.fillRect(tx - 3, h * 0.55, 6, h * 0.3);
      treeClump(x, tx, h * 0.58, w * 0.09, r, '#3E6B3A', '#52834A', '#86B566');
    });

    /* back wall and the bookshelves */
    const room = bake(W, H, dpr, (x, w, h) => {
      x.fillStyle = vgrad(x, 0, 0, h, [[0, '#4A2E20'], [0.6, '#6B4630'], [1, '#5A3A28']]);
      x.fillRect(0, 0, w, h);
      for (let px = 0; px < w; px += 46) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(px, 0, 2, h); x.fillStyle = 'rgba(255,220,180,.05)'; x.fillRect(px + 2, 0, 1, h); }
      speckle(x, 0, 0, w, h, 2500, ['#2E1C12', '#8A5A3B'], 63, 0.6, 1.6, 0.2);
      // window opening shadow
      x.fillStyle = 'rgba(20,10,6,.5)';
      rr(x, win.x - 18, win.y - 18, win.w + 36, win.h + 36, 20); x.fill();
      // shelves on the left
      const shW = G.wide ? w * 0.36 : w * 0.22;
      x.fillStyle = '#3A2418'; x.fillRect(0, 0, shW + 14, h);
      const rowH = h * 0.155;
      for (let ry = h * 0.06; ry < h * 0.95; ry += rowH) {
        x.fillStyle = '#2A1A10'; x.fillRect(0, ry, shW, rowH - 10);
        let bx = 6;
        while (bx < shW - 10) {
          const bw = r.range(9, 22), bh = (rowH - 14) * r.range(0.62, 0.98);
          if (r() < 0.08) { bx += r.range(12, 28); continue; }
          const col = r.pick(['#7A2E2E', '#2E4A6B', '#3E6B4A', '#8A6A2E', '#5A3A6A', '#B08A5A', '#2A3A2A', '#9A4A2A', '#C9B48A']);
          const lean = r() < 0.06 ? r.range(-0.2, -0.1) : 0;
          x.save(); x.translate(bx, ry + rowH - 10); x.rotate(lean);
          x.fillStyle = col; x.fillRect(0, -bh, bw, bh);
          x.fillStyle = 'rgba(255,230,180,.25)'; x.fillRect(0, -bh * 0.82, bw, 2); x.fillRect(0, -bh * 0.22, bw, 2);
          x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(bw - 2, -bh, 2, bh);
          x.restore();
          bx += bw + 1;
        }
        x.fillStyle = '#5A3A26'; x.fillRect(0, ry + rowH - 10, shW + 14, 10);
        x.fillStyle = 'rgba(255,220,180,.18)'; x.fillRect(0, ry + rowH - 10, shW + 14, 1.5);
      }
      x.fillStyle = '#5A3A26'; x.fillRect(shW, 0, 14, h);
      // a small framed landscape on the right wall
      if (G.wide) {
        const fx = w * 0.85, fy = h * 0.2, fw = w * 0.08, fh = fw * 1.25;
        x.fillStyle = '#2A1A10'; x.fillRect(fx - 6, fy - 6, fw + 12, fh + 12);
        x.fillStyle = '#E9DCC0'; x.fillRect(fx, fy, fw, fh);
        x.fillStyle = vgrad(x, 0, fy + 8, fy + fh - 8, [[0, '#9CC6E0'], [1, '#F2D6A8']]); x.fillRect(fx + 8, fy + 8, fw - 16, fh - 16);
        x.fillStyle = '#5E8F4E'; x.beginPath(); x.moveTo(fx + 8, fy + fh - 8); x.quadraticCurveTo(fx + fw * 0.4, fy + fh * 0.55, fx + fw - 8, fy + fh * 0.7); x.lineTo(fx + fw - 8, fy + fh - 8); x.fill();
      }
    });

    /* window seat, cushions, plants, the open book */
    const seatY = G.seat.y;
    const furn = bake(W, H, dpr, (x, w, h) => {
      x.fillStyle = vgrad(x, 0, seatY, h, [[0, '#7A4E34'], [1, '#4A2E20']]);
      x.fillRect(win.x - 40, seatY, win.w + 80, h - seatY);
      x.fillStyle = '#8A5A3B'; x.fillRect(win.x - 50, seatY - 8, win.w + 100, 12);
      x.fillStyle = 'rgba(255,230,190,.3)'; x.fillRect(win.x - 50, seatY - 8, win.w + 100, 2);
      // cushions
      const cush = (cx, cw, ch, col) => { x.fillStyle = col; rr(x, cx, seatY - 8 - ch, cw, ch, ch * 0.4); x.fill(); x.fillStyle = 'rgba(255,255,255,.12)'; rr(x, cx + 4, seatY - 6 - ch, cw - 8, ch * 0.3, ch * 0.2); x.fill(); };
      cush(win.x - 30, win.w * 0.34, H * 0.07, '#C77B5A');
      cush(win.x + win.w * 0.66, win.w * 0.3, H * 0.06, '#5E7FA0');
      // potted plants on the sill
      for (const [px, s] of [[win.x + win.w * 0.12, 1], [win.x + win.w * 0.88, 0.8]]) {
        const py = win.y + win.h + 4;
        x.fillStyle = '#A0583A'; x.beginPath(); x.moveTo(px - 16 * s, py - 26 * s); x.lineTo(px + 16 * s, py - 26 * s); x.lineTo(px + 12 * s, py); x.lineTo(px - 12 * s, py); x.fill();
        for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + r.range(-1.1, 1.1); frond(x, px, py - 24 * s, r.range(30, 50) * s, a, r.pick(['#4F7F45', '#3E6B3A', '#6C9C55']), r, 6, 0.3); }
      }
    });

    /* foreground: shelf edge and a hanging plant, out of focus */
    const fg = blurred(bake(W, H, 0.5, (x, w, h) => {
      x.fillStyle = '#24160E'; x.fillRect(0, h * 0.86, w * 0.18, h * 0.14);
      x.fillStyle = '#3A2418'; x.fillRect(0, h * 0.84, w * 0.2, h * 0.03);
      x.strokeStyle = '#2A1A10'; x.lineWidth = 3; x.beginPath(); x.moveTo(w * 0.9, 0); x.lineTo(w * 0.9, h * 0.12); x.stroke();
      x.fillStyle = '#6A4A3A'; x.beginPath(); x.ellipse(w * 0.9, h * 0.14, 30, 14, 0, 0, TAU); x.fill();
      for (let k = 0; k < 14; k++) frond(x, w * 0.9, h * 0.15, r.range(60, 140), Math.PI / 2 + r.range(-1, 1), r.pick(['#2F4A2A', '#3E6B3A', '#26402A']), r, 8, 0.35);
    }), 9);

    const motes = field({ n: Math.round(READ.motes * pscale), seed: 8, box: [0, 0, W, H], vx: [-5, 5], vy: [-6, 4], size: [0.6, 1.6], life: [5, 10], color: '#FFF1C8', style: 'dot', wobble: 7 });

    const book = { x: win.x + win.w * 0.46, y: seatY - 10, w: Math.min(W, H) * 0.2 };
    const birds = Array.from({ length: READ.birds }, (_, k) => ({ d: r.range(0, 0.12), sp: r.range(0.8, 1.2), ox: r.range(-0.4, 0.4), oy: r.range(-0.2, 0.2), ph: r() * TAU, s: r.range(0.8, 1.2) }));
    L = { W, H, G, view, room, furn, fg, motes, book, birds };
  }

  /* the sunbeam polygon: from the window down-left across the floor */
  function beam(s) {
    const { win } = L.G;
    const sh = lerp(-0.12, 0.22, s.p);
    const dx = L.W * (0.42 + sh), dy = L.H * 0.95;
    return [[win.x + win.w * 0.08, win.y + win.h * 0.06], [win.x + win.w * 0.92, win.y + win.h * 0.06], [win.x + win.w * 0.92 - dx, win.y + win.h + dy * 0.7], [win.x + win.w * 0.08 - dx * 1.15, win.y + win.h + dy * 0.7]];
  }
  function inPoly(px, py, P) {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      if ((P[i][1] > py) !== (P[j][1] > py) && px < ((P[j][0] - P[i][0]) * (py - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
    }
    return c;
  }

  function update(s) { if (L) L.motes.update(s.dt); }

  function draw(ctx, s) {
    if (!L) return;
    const { W, H, p, t } = s;
    const { win, seat } = L.G;
    const warm = lerp(0, 1, ease(0.2, 1, p)); // late-morning white → afternoon gold

    /* the room, and the view through the window (counter-shifted so the
       distant hills move less than the wall around them) */
    layer(ctx, s, 0.25, () => {
      ctx.drawImage(L.room, 0, 0, W, H);
      ctx.save(); ctx.beginPath(); rr(ctx, win.x, win.y, win.w, win.h, 14); ctx.clip();
      ctx.drawImage(L.view, win.x - win.w * 0.15 + (s.mx - 0.5) * 3, win.y - win.h * 0.05, L.view.w, L.view.h);
      ctx.fillStyle = `rgba(255,190,110,${0.18 * warm})`; ctx.fillRect(win.x, win.y, win.w, win.h);
      ctx.restore();
    });

    /* window frame, mullions and curtains in the breeze */
    layer(ctx, s, 0.15, () => {
      ctx.strokeStyle = '#EDE0C8'; ctx.lineWidth = 10;
      rr(ctx, win.x, win.y, win.w, win.h, 14); ctx.stroke();
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(win.x + win.w / 2, win.y); ctx.lineTo(win.x + win.w / 2, win.y + win.h); ctx.moveTo(win.x, win.y + win.h * 0.42); ctx.lineTo(win.x + win.w, win.y + win.h * 0.42); ctx.stroke();
      for (const side of [-1, 1]) {
        const ax = side < 0 ? win.x - 20 : win.x + win.w + 20;
        const blow = Math.sin(t * 0.9 + side) * 10 + Math.sin(t * 2.3) * 4;
        const cw = win.w * 0.2;
        const g = ctx.createLinearGradient(ax, 0, ax - side * cw, 0);
        g.addColorStop(0, '#E9D6C0'); g.addColorStop(0.5, '#F6EAD2'); g.addColorStop(1, '#D9BFA6');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(ax + side * 10, win.y - 26);
        ctx.lineTo(ax - side * cw * 0.7, win.y - 26);
        ctx.bezierCurveTo(ax - side * (cw * 0.5 + blow), win.y + win.h * 0.4, ax - side * (cw * 0.9 + blow * 1.6), win.y + win.h * 0.8, ax - side * (cw * 0.55 + blow * 2), win.y + win.h + 10);
        ctx.lineTo(ax + side * 14, win.y + win.h + 10);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(150,110,80,.25)'; ctx.lineWidth = 1.5;
        for (let k = 1; k < 4; k++) { const fx = ax - side * cw * 0.17 * k; ctx.beginPath(); ctx.moveTo(fx, win.y - 20); ctx.quadraticCurveTo(fx - side * blow * 0.5 * k, win.y + win.h * 0.6, fx - side * blow * k * 0.6, win.y + win.h + 8); ctx.stroke(); }
      }
      ctx.fillStyle = '#6A4A34'; ctx.fillRect(win.x - win.w * 0.24, win.y - 32, win.w * 1.48, 7);
    });

    layer(ctx, s, 0.45, () => { ctx.drawImage(L.furn, 0, 0, W, H); });

    /* the sunbeam, its mullion shadows, and dust that glitters only inside it */
    const P = beam(s);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const c0 = [(P[0][0] + P[1][0]) / 2, (P[0][1] + P[1][1]) / 2], c1 = [(P[2][0] + P[3][0]) / 2, (P[2][1] + P[3][1]) / 2];
    const bc = warm > 0.5 ? '255,214,150' : '255,240,210';
    // soft edges: the same wedge stacked at shrinking widths
    for (let k = 0; k < 4; k++) {
      const sh = k * 0.06;
      const Q = P.map(([x, y], i) => { const c = i < 2 ? c0 : c1; return [x + (c[0] - x) * sh, y + (c[1] - y) * sh]; });
      const bg = ctx.createLinearGradient(c0[0], c0[1], c1[0], c1[1]);
      bg.addColorStop(0, `rgba(${bc},0)`); bg.addColorStop(0.25, `rgba(${bc},0.07)`); bg.addColorStop(0.6, `rgba(${bc},0.05)`); bg.addColorStop(1, `rgba(${bc},0)`);
      ctx.fillStyle = bg;
      ctx.beginPath(); Q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
    }
    // window-shaped light patches on the bench front and floor, sliding as the sun moves
    const sx = lerp(-win.w * 0.25, win.w * 0.2, p);
    for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const px = win.x + win.w * 0.02 + sx + qx * win.w * 0.4, py = seat.y + H * 0.05 + qy * H * 0.08;
      const g = ctx.createLinearGradient(px, py, px - 50, py + H * 0.07);
      g.addColorStop(0, `rgba(255,220,160,${0.12 + warm * 0.06})`); g.addColorStop(1, 'rgba(255,220,160,0.02)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + win.w * 0.36, py); ctx.lineTo(px + win.w * 0.36 - 50, py + H * 0.07); ctx.lineTo(px - 50, py + H * 0.07); ctx.fill();
    }
    ctx.restore();
    L.motes.draw(ctx, 1, 0, 0, (q) => (inPoly(q.x, q.y, P) ? 1 : 0.05));

    /* the open book and the steaming cup */
    layer(ctx, s, 0.7, () => {
      const b = L.book;
      const lift = ease(0.68, 0.74, p);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.fillStyle = '#6A2A2A'; rr(ctx, -b.w * 0.52, -6, b.w * 1.04, 10, 3); ctx.fill();
      for (const side of [-1, 1]) {
        ctx.fillStyle = side < 0 ? '#F6EAD2' : '#F1E2C6';
        ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(side * b.w * 0.25, -18, side * b.w * 0.5, -10); ctx.lineTo(side * b.w * 0.5, 0); ctx.quadraticCurveTo(side * b.w * 0.25, -8, 0, 4); ctx.fill();
        ctx.strokeStyle = 'rgba(43,42,51,.25)'; ctx.lineWidth = 1;
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(side * b.w * 0.07, -8 + k * 2.2 - 6); ctx.quadraticCurveTo(side * b.w * 0.25, -16 + k * 2.2, side * b.w * 0.44, -10 + k * 2.2); ctx.stroke(); }
      }
      // fluttering top pages
      if (p > 0.6) {
        for (let k = 0; k < 3; k++) {
          const f = Math.sin(t * 9 + k * 1.7) * (0.3 + bell(0.6, 0.75, p) * 0.7);
          ctx.fillStyle = 'rgba(250,242,226,.95)';
          ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(b.w * 0.2, -14 - f * 18 - lift * 10, b.w * 0.42 * Math.cos(f), -10 - Math.sin(f) * b.w * 0.3); ctx.lineTo(b.w * 0.4 * Math.cos(f), -2 - Math.sin(f) * b.w * 0.28); ctx.quadraticCurveTo(b.w * 0.2, -6 - f * 10, 0, 2); ctx.fill();
        }
      }
      // cup
      ctx.translate(b.w * 0.85, 0);
      ctx.fillStyle = '#E9E2D6'; rr(ctx, -14, -26, 28, 26, 6); ctx.fill();
      ctx.strokeStyle = '#E9E2D6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(16, -14, 7, -1.2, 1.2); ctx.stroke();
      ctx.fillStyle = '#7A4A2A'; ctx.beginPath(); ctx.ellipse(0, -25, 12, 3, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const ph = t * 0.8 + k * 2;
        ctx.globalAlpha = 0.5 - k * 0.12;
        ctx.beginPath(); ctx.moveTo(-5 + k * 5, -30);
        for (let j = 1; j <= 8; j++) ctx.lineTo(-5 + k * 5 + Math.sin(ph + j * 0.7) * (3 + j), -30 - j * 7);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    });

    /* pages lift, fold into birds and fly out across the sky */
    const fly = inv(0.7, 1, p);
    if (fly > 0) {
      const b = L.book;
      for (const bd of L.birds) {
        const u = clamp((fly - bd.d) / (1 - bd.d));
        if (u <= 0) continue;
        const e = u * u * (3 - 2 * u);
        const tx = win.x + win.w * (0.5 + bd.ox) + (u > 0.5 ? (u - 0.5) * W * 0.9 : 0);
        const ty = win.y + win.h * (0.3 + bd.oy) - (u > 0.5 ? (u - 0.5) * H * 0.5 : 0);
        const x = lerp(b.x, tx, e) + Math.sin(t * 2 + bd.ph) * 12 * u, y = lerp(b.y - 16, ty, e);
        const sz = Math.min(W, H) * 0.016 * bd.s * (1 + u * 0.4);
        const flap = Math.sin(t * 11 + bd.ph);
        const morph = ease(0.05, 0.35, u);
        ctx.save();
        ctx.translate(x, y);
        if (morph < 1) {
          ctx.globalAlpha = 1 - morph;
          ctx.rotate(Math.sin(t * 6 + bd.ph) * 0.8);
          ctx.fillStyle = '#FAF2E2'; ctx.fillRect(-sz, -sz * 0.7, sz * 2, sz * 1.4);
          ctx.globalAlpha = 1;
          ctx.rotate(-Math.sin(t * 6 + bd.ph) * 0.8);
        }
        if (morph > 0) {
          ctx.globalAlpha = morph;
          ctx.strokeStyle = '#FFF8EC'; ctx.lineWidth = Math.max(1.4, sz * 0.18); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-sz * 1.2, -flap * sz * 0.7); ctx.quadraticCurveTo(-sz * 0.5, -sz * 0.2, 0, 0); ctx.quadraticCurveTo(sz * 0.5, -sz * 0.2, sz * 1.2, -flap * sz * 0.7); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
    }

    const fp = push(s, 1.2);
    ctx.drawImage(L.fg, fp.x, fp.y, W, H);
    // the room warms toward afternoon
    ctx.fillStyle = `rgba(255,170,90,${0.06 + warm * 0.08})`;
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  return {
    build, update, draw,
    dispose() { L = null; },
    crane(s) {
      if (!L) return null;
      const { win } = L.G;
      if (s.p < 0.7) {
        const size = Math.min(s.W, s.H) * 0.035;
        return { x: win.x + win.w * 0.3, y: win.y + win.h - size * 0.1, size, flap: -0.2 + Math.sin(s.t * 1.2) * 0.05, dir: 1, rot: 0 };
      }
      const u = inv(0.7, 1, s.p);
      return { x: lerp(win.x + win.w * 0.3, s.W * 1.1, u), y: lerp(win.y + win.h, s.H * 0.1, u), size: Math.min(s.W, s.H) * 0.035, flap: Math.sin(s.t * 8), dir: 1, rot: -0.2 };
    },
  };
}
