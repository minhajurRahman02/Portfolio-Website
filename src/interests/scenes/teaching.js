/* 09 · Teaching & Mentorship — "Chalk & Stars"
   A dim study with a chalkboard and a desk lamp. Chalk diagrams draw
   themselves; the dust in the lamp cone drifts up, the room lifts away and
   the motes keep rising until they are the stars. Then a sunrise in the
   first scene's dawn palette, so the page ends on the light it opened with. */
import { TEACH } from '../config.js';
import { TAU, rng, clamp, lerp, ease, inv, bake, blurred, rgb, mixRGB, hex2rgb, smooth } from '../util.js';
import { vgrad, glow, ridge, makeStars, drawStars, rr, speckle } from '../paint.js';
import { layer, push } from '../depth.js';

export default function create() {
  let L = null;

  function build(env) {
    const { W, H, dpr, mobile, pscale } = env;
    const r = rng(909);
    const wide = W > 900;
    const board = wide ? { x: W * 0.08, y: H * 0.1, w: W * 0.52, h: H * 0.46 } : { x: W * 0.05, y: H * 0.08, w: W * 0.9, h: H * 0.36 };
    const deskY = H * 0.76;
    const lamp = { x: wide ? W * 0.56 : W * 0.72, y: deskY - H * 0.22 };

    const room = bake(W, H, dpr, (x, w, h) => {
      x.fillStyle = vgrad(x, 0, 0, h, [[0, '#121A17'], [1, '#1C2622']]);
      x.fillRect(0, 0, w, h);
      speckle(x, 0, 0, w, h, 1800, ['#0C1210', '#26322C'], 91, 0.6, 1.8, 0.4);
      // board frame + slate
      x.fillStyle = '#4A3424'; x.fillRect(board.x - 12, board.y - 12, board.w + 24, board.h + 24);
      x.fillStyle = '#1F2B26'; x.fillRect(board.x, board.y, board.w, board.h);
      // old erased smudges
      for (let k = 0; k < 22; k++) {
        const sx = board.x + r() * board.w, sy = board.y + r() * board.h, sr = r.range(20, 80);
        const g = x.createRadialGradient(sx, sy, 0, sx, sy, sr);
        g.addColorStop(0, 'rgba(232,237,230,.05)'); g.addColorStop(1, 'rgba(232,237,230,0)');
        x.fillStyle = g; x.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
      }
      x.fillStyle = '#5A4030'; x.fillRect(board.x - 14, board.y + board.h + 10, board.w + 28, 8);
      x.fillStyle = '#E8EDE6'; x.fillRect(board.x + board.w * 0.2, board.y + board.h + 6, 18, 4); x.fillRect(board.x + board.w * 0.24, board.y + board.h + 7, 10, 3);
      // shelves with a globe and books
      if (wide) {
        const shx = W * 0.68, shw = W * 0.26;
        for (let k = 0; k < 3; k++) {
          const sy = H * (0.16 + k * 0.15);
          x.fillStyle = '#3A2A1E'; x.fillRect(shx, sy, shw, 6);
          let bx = shx + 6;
          while (bx < shx + shw - 40) { const bw = r.range(8, 16), bh = r.range(28, 52); x.fillStyle = r.pick(['#4A2A2A', '#2A3A4A', '#3A4A2A', '#5A4A2A', '#3A2A4A']); x.fillRect(bx, sy - bh, bw, bh); bx += bw + 1; }
        }
        const gx = shx + shw - 26, gy = H * 0.16 - 26;
        x.fillStyle = '#3A5A6A'; x.beginPath(); x.arc(gx, gy, 18, 0, TAU); x.fill();
        x.fillStyle = '#5A7A4A'; x.beginPath(); x.ellipse(gx - 5, gy - 4, 7, 5, 0.5, 0, TAU); x.ellipse(gx + 6, gy + 6, 5, 4, 0, 0, TAU); x.fill();
        x.strokeStyle = '#8A6A3A'; x.lineWidth = 2; x.beginPath(); x.arc(gx, gy, 22, -2.2, 0.9); x.stroke();
      }
      // the wall's top edge melts into the night above, so the room can sink away cleanly
      x.globalCompositeOperation = 'destination-out';
      x.fillStyle = vgrad(x, 0, 0, h * 0.14, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]);
      x.fillRect(0, 0, w, h * 0.14);
      x.globalCompositeOperation = 'source-over';
    });

    const desk = bake(W, H - deskY + 10, dpr, (x, w, h) => {
      x.fillStyle = vgrad(x, 0, 0, h, [[0, '#4A3020'], [0.06, '#3A2418'], [1, '#1A100A']]);
      x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,220,170,.25)'; x.fillRect(0, 0, w, 2);
      // papers and a notebook
      x.save(); x.translate(w * 0.42, h * 0.3); x.rotate(-0.08);
      x.fillStyle = '#E8E2D2'; x.fillRect(-90, -20, 180, 110);
      x.strokeStyle = 'rgba(60,60,80,.3)'; for (let k = 0; k < 8; k++) { x.beginPath(); x.moveTo(-80, k * 11 - 6); x.lineTo(r.range(20, 80), k * 11 - 6); x.stroke(); }
      x.restore();
      x.save(); x.translate(w * 0.58, h * 0.36); x.rotate(0.14);
      x.fillStyle = '#2E4A6B'; x.fillRect(-60, -16, 120, 90); x.fillStyle = '#E8E2D2'; x.fillRect(-56, -14, 4, 86);
      x.restore();
    });

    const fg = blurred(bake(W, H, 0.5, (x, w, h) => {
      x.fillStyle = '#0A0806';
      x.beginPath(); x.moveTo(w * 0.04, h); x.lineTo(w * 0.08, h * 0.74); x.quadraticCurveTo(w * 0.17, h * 0.7, w * 0.26, h * 0.74); x.lineTo(w * 0.3, h); x.fill();
      x.fillStyle = '#1A140E'; x.fillRect(w * 0.84, h * 0.88, w * 0.2, h * 0.12);
    }), 10);

    /* chalk drawings as strokes we can reveal by length */
    const B = board, strokes = [];
    const line = (pts, start, end) => strokes.push({ pts, start, end, len: pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0) });
    const bx = (u) => B.x + B.w * u, by = (v) => B.y + B.h * v;
    // 1 · attention map grid
    const cells = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) cells.push([bx(0.06 + i * 0.045), by(0.16 + j * 0.1), r(), (i + j) / 10]);
    line([[bx(0.06), by(0.16)], [bx(0.33), by(0.16)], [bx(0.33), by(0.76)], [bx(0.06), by(0.76)], [bx(0.06), by(0.16)]], 0.0, 0.08);
    // 2 · a small network
    const nodes = [];
    [[0.45, 3], [0.6, 4], [0.75, 2]].forEach(([u, n], li) => { for (let k = 0; k < n; k++) nodes.push([bx(u), by(0.25 + (k + 0.5) * (0.5 / n)), li]); });
    nodes.forEach((a, i) => nodes.forEach((b, j) => { if (b[2] === a[2] + 1) line([[a[0], a[1]], [b[0], b[1]]], 0.1 + a[2] * 0.06 + (i % 4) * 0.008, 0.16 + a[2] * 0.06 + (j % 4) * 0.008); }));
    // 3 · pipeline arrows under it
    line([[bx(0.42), by(0.86)], [bx(0.56), by(0.86)]], 0.26, 0.29);
    line([[bx(0.53), by(0.83)], [bx(0.56), by(0.86)], [bx(0.53), by(0.89)]], 0.29, 0.3);
    line([[bx(0.68), by(0.86)], [bx(0.82), by(0.86)]], 0.31, 0.34);
    line([[bx(0.79), by(0.83)], [bx(0.82), by(0.86)], [bx(0.79), by(0.89)]], 0.34, 0.35);
    // underline
    line([[bx(0.06), by(0.9)], [bx(0.3), by(0.92)]], 0.35, 0.38);
    const labels = [['attention', bx(0.06), by(0.1), 0.04], ['data', bx(0.36), by(0.87), 0.27], ['model', bx(0.58), by(0.87), 0.3], ['energy', bx(0.84), by(0.87), 0.35], ['E = P × t', bx(0.08), by(0.99), 0.38]];

    const stars = makeStars(92, Math.round(TEACH.stars * (mobile ? 0.5 : 1)), W, H * 0.85, 1);
    const motes = Array.from({ length: Math.round(TEACH.motes * pscale) }, (_, k) => {
      const a = r.range(-0.42, 0.42) + Math.PI / 2 + 0.25, d = r.range(20, H * 0.55);
      return { x0: lamp.x + Math.cos(a) * d, y0: lamp.y + Math.sin(a) * d, ph: r() * TAU, sp: r.range(4, 12), star: stars[k % stars.length], s: r.range(0.6, 1.6) };
    });
    L = { W, H, board, deskY, lamp, room, desk, fg, strokes, cells, nodes, labels, stars, motes, wide };
  }

  function chalkStroke(ctx, st, k) {
    if (k <= 0) return;
    let rem = st.len * k;
    ctx.beginPath();
    ctx.moveTo(st.pts[0][0], st.pts[0][1]);
    for (let i = 1; i < st.pts.length && rem > 0; i++) {
      const [ax, ay] = st.pts[i - 1], [bx, by] = st.pts[i];
      const d = Math.hypot(bx - ax, by - ay);
      const u = Math.min(1, rem / d);
      ctx.lineTo(ax + (bx - ax) * u, ay + (by - ay) * u);
      rem -= d;
    }
    ctx.stroke();
  }

  function draw(ctx, s) {
    if (!L) return;
    const { W, H, p, t } = s;
    const { lamp } = L;
    const lift = ease(0.4, 0.8, p);          // the room dissolves
    const dawn = ease(0.8, 1, p);            // sunrise
    const draw = inv(0, 0.4, p);             // the chalk draws itself

    /* the sky behind everything: night, then the first scene's dawn */
    const top = mixRGB(hex2rgb('#0A1230'), hex2rgb('#38457E'), dawn);
    const mid = mixRGB(hex2rgb('#141E48'), hex2rgb('#8A7BA8'), dawn);
    const hor = mixRGB(hex2rgb('#232E5E'), hex2rgb('#F7C9A9'), dawn);
    layer(ctx, s, 0, () => {
      ctx.fillStyle = vgrad(ctx, 0, 0, H, [[0, rgb(top)], [0.6, rgb(mid)], [1, rgb(hor)]]);
      ctx.fillRect(-30, -30, W + 60, H + 60);
      drawStars(ctx, L.stars, t, lift * (1 - dawn * 0.85));
      if (dawn > 0) {
        glow(ctx, W * 0.5, H * 0.86, W * 0.7, '#FF9E6B', 0.5 * dawn);
        glow(ctx, W * 0.5, H * 0.86, W * 0.25, '#FFE7B0', 0.7 * dawn);
        ctx.fillStyle = `rgba(20,24,52,${0.9 * dawn})`;
        ridge(ctx, W, H, { base: H * 0.9, amp: H * 0.04, seed: 93, oct: 4, fill: `rgba(40,38,80,${dawn})` });
      }
    });

    /* the room lifts away as the motes rise */
    const ry = lift * H * 0.75; // the camera tilts up: the room sinks out of frame
    const ra = 1 - ease(0.45, 0.8, p);
    if (ra > 0.01) {
      ctx.save();
      ctx.globalAlpha = ra;
      layer(ctx, s, 0.15, () => { ctx.drawImage(L.room, 0, ry, W, H); });
      // chalk
      layer(ctx, s, 0.15, () => {
        ctx.save();
        ctx.translate(0, ry);
        ctx.strokeStyle = 'rgba(232,237,230,.85)';
        ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const st of L.strokes) chalkStroke(ctx, st, clamp(inv(st.start, st.end, draw)));
        const cs = L.board.w * 0.04;
        for (const [x, y, v, d] of L.cells) {
          const k = clamp(inv(0.02 + d * 0.06, 0.06 + d * 0.06, draw));
          if (k <= 0) continue;
          ctx.fillStyle = `rgba(232,237,230,${(0.1 + v * 0.55) * k})`;
          ctx.fillRect(x + 2, y + 2, cs - 4, L.board.h * 0.1 - 4);
        }
        for (const [x, y, li] of L.nodes) {
          const k = clamp(inv(0.08 + li * 0.07, 0.12 + li * 0.07, draw));
          if (k <= 0) continue;
          ctx.globalAlpha = k * ra;
          ctx.fillStyle = '#1F2B26';
          ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill(); ctx.stroke();
        }
        ctx.globalAlpha = ra;
        ctx.font = `italic 600 ${Math.max(13, L.board.w * 0.026)}px Georgia, "Times New Roman", serif`;
        ctx.fillStyle = 'rgba(232,237,230,.9)';
        for (const [txt, x, y, at] of L.labels) {
          const k = clamp(inv(at, at + 0.03, draw));
          if (k <= 0) continue;
          ctx.fillText(txt.slice(0, Math.ceil(txt.length * k)), x, y);
        }
        ctx.restore();
      });
      // desk, lamp and its cone of light
      layer(ctx, s, 0.55, () => {
        const dy = ry * 1.35;
        ctx.drawImage(L.desk, 0, L.deskY + dy, W, L.desk.h);
        const lx = lamp.x, ly = lamp.y + dy;
        ctx.globalCompositeOperation = 'lighter';
        const cg = ctx.createLinearGradient(lx, ly, lx, L.deskY + dy);
        cg.addColorStop(0, 'rgba(255,207,122,.35)'); cg.addColorStop(1, 'rgba(255,207,122,.04)');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.moveTo(lx - 10, ly + 6); ctx.lineTo(lx + 10, ly + 6); ctx.lineTo(lx + W * 0.16, L.deskY + dy + 6); ctx.lineTo(lx - W * 0.16, L.deskY + dy + 6); ctx.closePath(); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        glow(ctx, lx, L.deskY + dy + 4, W * 0.2, '#FFCF7A', 0.35);
        // lamp body
        ctx.strokeStyle = '#2A2A30'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(lx + 40, L.deskY + dy); ctx.lineTo(lx + 54, ly - 40); ctx.lineTo(lx + 6, ly - 6); ctx.stroke();
        ctx.fillStyle = '#2A2A30'; ctx.beginPath(); ctx.moveTo(lx - 22, ly + 6); ctx.lineTo(lx + 22, ly + 6); ctx.lineTo(lx + 10, ly - 14); ctx.lineTo(lx - 10, ly - 14); ctx.fill();
        ctx.fillStyle = '#1A1A20'; ctx.fillRect(lx + 26, L.deskY + dy - 6, 30, 6);
        glow(ctx, lx, ly + 6, 30, '#FFF2C2', 0.9);
        // mug
        ctx.fillStyle = '#7A3A2A'; rr(ctx, lx - W * 0.12, L.deskY + dy - 30, 24, 30, 4); ctx.fill();
      });
      ctx.restore();
    }

    /* dust motes in the lamp cone that rise and become the stars */
    ctx.globalCompositeOperation = 'lighter';
    for (const m of L.motes) {
      const drift = (t * m.sp + m.ph * 20) % (H * 0.5);
      const bx = m.x0 + Math.sin(t * 0.7 + m.ph) * 8, by = m.y0 - drift * (1 - lift);
      const u = smooth(clamp((lift - 0.05) / 0.95));
      const x = lerp(bx, m.star.x, u), y = lerp(by + ry * 0.2, m.star.y, u);
      const a = (1 - u) * 0.8 * (by > lamp.y - 10 ? 1 : 0.2) + u * 0.0;
      if (a <= 0.02) continue;
      ctx.fillStyle = `rgba(255,242,194,${a})`;
      ctx.beginPath(); ctx.arc(x, y, m.s, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    if (ra > 0.01) {
      const fp = push(s, 1.1);
      ctx.globalAlpha = ra;
      ctx.drawImage(L.fg, fp.x, fp.y + ry * 1.4, W, H);
      ctx.globalAlpha = 1;
    }
  }

  return {
    build, update() {}, draw,
    dispose() { L = null; },
    crane(s) {
      if (!L) return null;
      const size = Math.min(s.W, s.H) * 0.034;
      if (s.p < 0.42) {
        const u = ease(0.02, 0.2, s.p);
        const lx = L.board.x + L.board.w * 0.78, ly = L.board.y + L.board.h + 6;
        return { x: lerp(s.W * 1.05, lx, u), y: lerp(s.H * 0.2, ly - size * 0.15, u), size, flap: u < 1 ? Math.sin(s.t * 8) : -0.2 + Math.sin(s.t * 1.1) * 0.05, dir: -1, rot: 0 };
      }
      const u = ease(0.42, 0.95, s.p);
      return { x: lerp(L.board.x + L.board.w * 0.78, s.W * 0.5, u), y: lerp(L.board.y + L.board.h, s.H * 0.72, u) - Math.sin(u * Math.PI) * s.H * 0.2, size: size * (1 - u * 0.3), flap: Math.sin(s.t * 6), dir: 1, rot: -0.1, glow: ease(0.8, 1, s.p) };
    },
  };
}
