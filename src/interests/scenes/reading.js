/* 06 · Reading — "The Window Nook"
   A sunlit window seat in a small library. A volumetric sunbeam slides
   across the room as the afternoon moves on; dust glitters only inside it.
   Late in the scene the loose pages lift, fold into birds and fly out. */
import { READ } from '../config.js';
import { TAU, rng, clamp, lerp, ease, inv, bell } from '../util.js';
import { vgrad, rr } from '../paint.js';
import { baked } from '../bakery.js';
import { geom } from './reading-paint.js';
import { field } from '../particles.js';
import { layer, push } from '../depth.js';

export default function create() {
  let L = null;

  function build(env) {
    const { W, H, pscale } = env;
    const G = geom(W, H);
    const { win } = G;
    const r = rng(606);
    const motes = field({ n: Math.round(READ.motes * pscale), seed: 8, box: [0, 0, W, H], vx: [-5, 5], vy: [-6, 4], size: [0.6, 1.6], life: [5, 10], color: '#FFF1C8', style: 'dot', wobble: 7 });
    const book = { x: win.x + win.w * 0.46, y: G.seat.y - 10, w: Math.min(W, H) * 0.2 };
    const birds = Array.from({ length: READ.birds }, (_, k) => ({ d: r.range(0, 0.12), sp: r.range(0.8, 1.2), ox: r.range(-0.4, 0.4), oy: r.range(-0.2, 0.2), ph: r() * TAU, s: r.range(0.8, 1.2) }));
    L = { W, H, G, env, motes, book, birds, ready: false };
    attach();
  }

  /** the view, room, furniture and foreground are painted off-thread (bakery.js) */
  function attach() {
    const P = baked('reading', L.env);
    if (P) { Object.assign(L, P); L.ready = true; }
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

  function update(s) { if (!L) return; if (!L.ready) attach(); L.motes.update(s.dt); }

  function draw(ctx, s) {
    if (!L) return;
    const { W, H, p, t } = s;
    const { win, seat } = L.G;
    const warm = lerp(0, 1, ease(0.2, 1, p)); // late-morning white → afternoon gold

    /* the room, and the view through the window (counter-shifted so the
       distant hills move less than the wall around them) */
    layer(ctx, s, 0.25, () => {
      if (L.ready) ctx.drawImage(L.room, 0, 0, W, H);
      else { ctx.fillStyle = vgrad(ctx, 0, 0, H, [[0, '#4A2E20'], [0.6, '#6B4630'], [1, '#5A3A28']]); ctx.fillRect(0, 0, W, H); }
      ctx.save(); ctx.beginPath(); rr(ctx, win.x, win.y, win.w, win.h, 14); ctx.clip();
      if (L.ready) ctx.drawImage(L.view, win.x - win.w * 0.15 + (s.mx - 0.5) * 3, win.y - win.h * 0.05, L.view.w, L.view.h);
      else { ctx.fillStyle = vgrad(ctx, 0, win.y, win.y + win.h, [[0, '#7FB8E6'], [0.7, '#BFE0F4'], [1, '#6FA05E']]); ctx.fillRect(win.x, win.y, win.w, win.h); }
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
        g.addColorStop(0, '#E3CDB4'); g.addColorStop(0.14, '#F8EED9'); g.addColorStop(0.28, '#D8BEA2');
        g.addColorStop(0.44, '#F4E6CC'); g.addColorStop(0.6, '#CDB092'); g.addColorStop(0.78, '#F0E0C4'); g.addColorStop(1, '#BFA184');
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

    if (L.ready) layer(ctx, s, 0.45, () => { ctx.drawImage(L.furn, 0, 0, W, H); });

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
    if (L.ready) ctx.drawImage(L.fg, fp.x, fp.y, W, H);
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
