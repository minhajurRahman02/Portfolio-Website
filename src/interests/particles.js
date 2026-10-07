/* Generic particle field. A field owns a fixed pool (no allocation per
   frame), respawns particles that leave its box, and draws them with one
   of a few styles. Scenes configure behaviour through the options. */
import { TAU, rng, clamp, hex2rgb, rgb } from './util.js';
import { glow } from './paint.js';

export function field(opts) {
  const o = {
    n: 40, seed: 7,
    box: [0, 0, 100, 100],        // x, y, w, h in CSS px (updated on resize)
    vx: [-6, 6], vy: [-12, -4],   // px/s
    size: [1, 3], life: [4, 9],
    wobble: 10, wobbleF: [0.4, 1.4],
    color: '#FFFFFF', colors: null,
    style: 'dot',                 // dot | glow | ring | hex | soft | streak
    alpha: 1, fadeIn: 0.15, fadeOut: 0.3,
    wrap: false,
    ...opts,
  };
  const r = rng(o.seed);
  const P = [];

  function spawn(p, fresh) {
    const [bx, by, bw, bh] = o.box;
    p.x = bx + r() * bw;
    p.y = fresh ? by + r() * bh : (o.vy[1] <= 0 ? by + bh : o.vy[0] >= 0 ? by : by + r() * bh);
    p.vx = r.range(o.vx[0], o.vx[1]);
    p.vy = r.range(o.vy[0], o.vy[1]);
    p.s = r.range(o.size[0], o.size[1]);
    p.life = r.range(o.life[0], o.life[1]);
    p.age = fresh ? r() * p.life : 0;
    p.ph = r() * TAU;
    p.wf = r.range(o.wobbleF[0], o.wobbleF[1]);
    p.c = hex2rgb(o.colors ? r.pick(o.colors) : o.color);
    p.k = r();
  }
  for (let i = 0; i < o.n; i++) { const p = {}; spawn(p, true); P.push(p); }

  return {
    opts: o,
    parts: P,
    setBox(b) { o.box = b; P.forEach((p) => spawn(p, true)); },
    update(dt, force) {
      const [bx, by, bw, bh] = o.box;
      for (const p of P) {
        p.age += dt;
        p.x += (p.vx + Math.sin(p.age * p.wf + p.ph) * o.wobble) * dt;
        p.y += p.vy * dt;
        if (force) force(p, dt);
        const out = p.x < bx - 40 || p.x > bx + bw + 40 || p.y < by - 40 || p.y > by + bh + 40;
        if (p.age > p.life || out) {
          if (o.wrap && out && p.age <= p.life) {
            if (p.x < bx - 40) p.x += bw + 80; else if (p.x > bx + bw + 40) p.x -= bw + 80;
            if (p.y < by - 40) p.y += bh + 80; else if (p.y > by + bh + 40) p.y -= bh + 80;
          } else spawn(p, false);
        }
      }
    },
    draw(ctx, a = 1, ox = 0, oy = 0, mask) {
      const A = a * o.alpha;
      if (A <= 0.004) return;
      const prev = ctx.globalCompositeOperation;
      if (o.style !== 'dot') ctx.globalCompositeOperation = o.op || 'lighter';
      for (const p of P) {
        const t = p.age / p.life;
        let f = Math.min(t / o.fadeIn, 1, (1 - t) / o.fadeOut);
        f = clamp(f);
        if (mask) f *= mask(p);
        if (f <= 0.01) continue;
        const x = p.x + ox, y = p.y + oy;
        const al = A * f;
        if (o.style === 'glow') {
          const pulse = 0.6 + 0.4 * Math.sin(p.age * 2.2 + p.ph);
          glow(ctx, x, y, p.s * 7, p.c, al * 0.55 * pulse);
          ctx.fillStyle = rgb(p.c, al * pulse);
          ctx.beginPath(); ctx.arc(x, y, p.s * 0.7, 0, TAU); ctx.fill();
        } else if (o.style === 'soft') {
          const g = ctx.createRadialGradient(x, y, 0, x, y, p.s);
          g.addColorStop(0, rgb(p.c, al * 0.5)); g.addColorStop(1, rgb(p.c, 0));
          ctx.fillStyle = g;
          ctx.fillRect(x - p.s, y - p.s, p.s * 2, p.s * 2);
        } else if (o.style === 'ring') {
          ctx.strokeStyle = rgb(p.c, al * 0.8);
          ctx.lineWidth = Math.max(0.8, p.s * 0.18);
          ctx.beginPath(); ctx.arc(x, y, p.s, 0, TAU); ctx.stroke();
          ctx.fillStyle = rgb([255, 255, 255], al * 0.7);
          ctx.beginPath(); ctx.arc(x - p.s * 0.35, y - p.s * 0.35, p.s * 0.22, 0, TAU); ctx.fill();
        } else if (o.style === 'hex') {
          ctx.fillStyle = rgb(p.c, al * 0.16);
          ctx.strokeStyle = rgb(p.c, al * 0.32);
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const an = i / 6 * TAU + 0.26;
            const px = x + Math.cos(an) * p.s, py = y + Math.sin(an) * p.s;
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
        } else if (o.style === 'streak') {
          ctx.strokeStyle = rgb(p.c, al);
          ctx.lineWidth = p.s * 0.4;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - p.vx * 0.06, y - p.vy * 0.06); ctx.stroke();
        } else {
          ctx.fillStyle = rgb(p.c, al);
          ctx.beginPath(); ctx.arc(x, y, p.s, 0, TAU); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = prev;
    },
  };
}
