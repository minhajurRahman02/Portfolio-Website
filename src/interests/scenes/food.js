/* 08 · Trying New Foods — "Twilight Market"
   A night market as the sky turns from coral to indigo. String lights sag
   overhead, paper lanterns sway, steam curls up warm from the grill and
   gold where the lanterns catch it, and the dishes on the counter light
   up one at a time as you scroll, like a stall menu. */
import { FOOD } from '../config.js';
import { TAU, rng, clamp, lerp, ease, inv, bake, blurred, track, trackNum, rgb, hex2rgb, mixRGB } from '../util.js';
import { vgrad, glow, makeStars, drawStars, rr, frond, speckle } from '../paint.js';
import { field } from '../particles.js';
import { layer, push } from '../depth.js';

const SKY = [
  [0.0, '#3A2E6A', '#8A4F7A', '#F08A62'],
  [0.5, '#2A2350', '#5E3A6E', '#E07A5F'],
  [1.0, '#120F2E', '#2A2350', '#6A3A5A'],
];

export default function create() {
  let L = null;
  const crowdT = { v: 0 };

  function build(env) {
    const { W, H, dpr, mobile, pscale } = env;
    const r = rng(808);
    const wide = W > 900;
    const stall = wide ? { x: W * 0.46, w: W * 0.42 } : { x: W * 0.06, w: W * 0.88 };
    stall.y = H * 0.5; stall.counter = H * 0.66;

    const roofs = bake(W, H * 0.4, dpr, (x, w, h) => {
      let px = 0;
      x.fillStyle = '#2B1E3A';
      while (px < w) {
        const bw = r.range(60, 160), bh = h * r.range(0.35, 0.8);
        x.fillRect(px, h - bh, bw, bh);
        if (r() < 0.5) { x.fillRect(px + bw * 0.2, h - bh - 18, 22, 18); x.fillRect(px + bw * 0.2 - 3, h - bh - 20, 28, 4); }
        if (r() < 0.4) { x.beginPath(); x.moveTo(px - 4, h - bh); x.lineTo(px + bw / 2, h - bh - 22); x.lineTo(px + bw + 4, h - bh); x.fill(); }
        for (let wy = h - bh + 10; wy < h - 6; wy += 16) for (let wx = px + 8; wx < px + bw - 8; wx += 18) if (r() < 0.25) { x.fillStyle = r.pick(['#FFB347', '#FFD27F', '#FF8A5C']); x.globalAlpha = r.range(0.5, 0.9); x.fillRect(wx, wy, 6, 8); x.globalAlpha = 1; x.fillStyle = '#2B1E3A'; }
        px += bw + r.range(-6, 10);
      }
    });

    /* back row of stalls, each with a lantern glow recorded for live drawing */
    const backGlows = [];
    const back = bake(W, H * 0.34, dpr, (x, w, h) => {
      let px = -20;
      while (px < w) {
        const sw = r.range(90, 150);
        const col = r.pick(['#3D2A4E', '#43304A', '#352646']);
        x.fillStyle = col; x.fillRect(px, h * 0.32, sw - 8, h * 0.68);
        x.fillStyle = r.pick(['#8A3A3A', '#3A5A6A', '#7A5A2A', '#5A3A6A']);
        x.beginPath(); x.moveTo(px - 6, h * 0.34); x.lineTo(px + sw * 0.5 - 4, h * 0.16); x.lineTo(px + sw - 2, h * 0.34); x.fill();
        x.fillStyle = 'rgba(255,180,90,.25)'; x.fillRect(px + 6, h * 0.45, sw - 20, h * 0.2);
        backGlows.push([px + sw / 2, H * 0.66 - h + h * 0.4, r() * TAU]);
        px += sw;
      }
    });

    const fgLeaves = blurred(bake(W, H, 0.5, (x, w, h) => {
      for (let k = 0; k < 6; k++) frond(x, -20, h * r.range(0.6, 1.05), r.range(w * 0.18, w * 0.3), r.range(-0.9, -0.1), r.pick(['#14261A', '#1A3022', '#0F1E14']), r, 7, 0.32);
      for (let k = 0; k < 5; k++) frond(x, w + 20, h * r.range(0.65, 1.05), r.range(w * 0.16, w * 0.28), Math.PI + r.range(0.1, 0.9), r.pick(['#14261A', '#1A3022', '#0F1E14']), r, 7, 0.32);
    }), 9);

    const strings = [0, 1, 2].map((k) => ({
      y0: H * (0.08 + k * 0.07), y1: H * (0.12 + k * 0.05), sag: H * (0.08 + k * 0.02), n: 16 + k * 4, ph: r() * TAU,
    }));
    const lanterns = Array.from({ length: FOOD.lanterns }, (_, k) => ({
      x: stall.x + stall.w * ((k + 0.5) / FOOD.lanterns), y: stall.y - H * 0.035 + (k % 2) * 6, r: Math.min(W, H) * r.range(0.022, 0.03), ph: r() * TAU,
      col: r.pick(['#E0453A', '#F0703A', '#E85A4A', '#F0A040']),
    }));
    const dishes = ['noodles', 'skewers', 'dumplings', 'tea', 'buns', 'soup'].slice(0, wide ? 6 : 4);
    const crowd = Array.from({ length: FOOD.crowd }, (_, k) => ({
      x: r() * W * 1.4 - W * 0.2, dir: r.sign(), v: r.range(26, 50), h: H * r.range(0.2, 0.27), ph: r() * TAU, k, w: r.range(0.9, 1.2), bag: r() < 0.35, hat: r() < 0.25,
    }));
    const steam = field({ n: Math.round(FOOD.steam * pscale), seed: 14, box: [stall.x + stall.w * 0.05, stall.counter - H * 0.4, stall.w * 0.4, H * 0.4], vx: [-8, 8], vy: [-40, -18], size: [16, 46], life: [2.5, 5], color: '#EDE6F2', style: 'soft', op: 'source-over', alpha: 0.45, wobble: 14, fadeIn: 0.25, fadeOut: 0.5 });
    const embers = field({ n: Math.round(FOOD.embers * pscale), seed: 15, box: [stall.x + stall.w * 0.04, stall.counter - H * 0.32, stall.w * 0.22, H * 0.32], vx: [-10, 10], vy: [-70, -30], size: [0.8, 1.8], life: [0.8, 2], colors: ['#FF5E3A', '#FFB347', '#FFD27F'], style: 'dot', wobble: 20 });
    const stars = makeStars(81, mobile ? 70 : 140, W, H * 0.4, 1);
    L = { W, H, stall, roofs, back, backGlows, fgLeaves, strings, lanterns, dishes, crowd, steam, embers, stars, wide };
  }

  function update(s) {
    if (!L) return;
    L.steam.update(s.dt);
    L.embers.update(s.dt);
    for (const c of L.crowd) { c.x += c.dir * c.v * s.dt; if (c.x > s.W * 1.2) c.x = -s.W * 0.2; if (c.x < -s.W * 0.2) c.x = s.W * 1.2; }
  }

  function dish(ctx, kind, x, y, s, lit, t) {
    ctx.save(); ctx.translate(x, y);
    if (lit > 0) glow(ctx, 0, -s * 0.4, s * 2.4, '#FFC870', 0.4 * lit);
    const dim = 0.5 + 0.5 * lit;
    ctx.globalAlpha = dim;
    if (kind === 'noodles' || kind === 'soup') {
      ctx.fillStyle = '#E8E0D0'; ctx.beginPath(); ctx.ellipse(0, -s * 0.2, s, s * 0.32, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = kind === 'soup' ? '#C9602A' : '#E8C27A'; ctx.beginPath(); ctx.ellipse(0, -s * 0.2, s * 0.86, s * 0.22, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = kind === 'soup' ? '#F0B060' : '#F6DFA0'; ctx.lineWidth = 1.2;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(Math.sin(k * 2) * s * 0.3, -s * 0.22, s * 0.3, s * 0.06, k, 0, Math.PI); ctx.stroke(); }
      ctx.fillStyle = '#5FA04A'; ctx.fillRect(-s * 0.4, -s * 0.3, s * 0.2, s * 0.06);
    } else if (kind === 'skewers') {
      ctx.fillStyle = '#D8D0C0'; ctx.beginPath(); ctx.ellipse(0, -s * 0.1, s * 1.1, s * 0.22, 0, 0, TAU); ctx.fill();
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = '#C9A06A'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-s, -s * 0.15 - k * 4); ctx.lineTo(s, -s * 0.3 - k * 4); ctx.stroke();
        for (let j = 0; j < 4; j++) { ctx.fillStyle = j % 2 ? '#8A3A1A' : '#B0542A'; ctx.beginPath(); ctx.arc(-s * 0.6 + j * s * 0.38, -s * 0.2 - k * 4 - j * 1.5, s * 0.14, 0, TAU); ctx.fill(); }
      }
    } else if (kind === 'dumplings') {
      ctx.fillStyle = '#9A6A3A'; ctx.beginPath(); ctx.ellipse(0, -s * 0.1, s, s * 0.3, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#B07A44'; ctx.fillRect(-s, -s * 0.5, s * 2, s * 0.4);
      ctx.fillStyle = '#F2EAD8';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(-s * 0.55 + k * s * 0.37, -s * 0.58, s * 0.2, s * 0.14, 0, Math.PI, 0); ctx.fill(); }
    } else if (kind === 'tea') {
      for (let k = 0; k < 3; k++) {
        const gx = -s * 0.6 + k * s * 0.6;
        ctx.fillStyle = 'rgba(255,240,220,.35)'; ctx.fillRect(gx - s * 0.18, -s * 0.8, s * 0.36, s * 0.75);
        ctx.fillStyle = '#C9702A'; ctx.fillRect(gx - s * 0.16, -s * 0.55, s * 0.32, s * 0.48);
        ctx.fillStyle = '#F6E0C0'; ctx.fillRect(gx - s * 0.16, -s * 0.62, s * 0.32, s * 0.08);
      }
    } else {
      ctx.fillStyle = '#E8E0D0'; ctx.beginPath(); ctx.ellipse(0, -s * 0.1, s, s * 0.25, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#F6EEDC';
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(-s * 0.5 + k * s * 0.5, -s * 0.38, s * 0.3, Math.PI, 0); ctx.fill(); }
      ctx.fillStyle = '#C94A3A'; for (let k = 0; k < 3; k++) ctx.fillRect(-s * 0.52 + k * s * 0.5, -s * 0.62, 3, 3);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function draw(ctx, s) {
    if (!L) return;
    const { W, H, p, t } = s;
    const { stall } = L;
    const top = track(SKY, p, 1), mid = track(SKY, p, 2), hor = track(SKY, p, 3);

    layer(ctx, s, 0.02, () => {
      ctx.fillStyle = vgrad(ctx, 0, 0, H * 0.62, [[0, rgb(top)], [0.55, rgb(mid)], [1, rgb(hor)]]);
      ctx.fillRect(-30, -30, W + 60, H + 60);
      drawStars(ctx, L.stars, t, ease(0.15, 0.9, p) * 0.8);
      glow(ctx, W * 0.3, H * 0.58, W * 0.5, rgb(hor), 0.25 * (1 - p));
    });
    layer(ctx, s, 0.08, () => { ctx.drawImage(L.roofs, 0, H * 0.58 - L.roofs.h, W, L.roofs.h); });

    /* string lights in catenary curves */
    layer(ctx, s, 0.15, () => {
      for (const st of L.strings) {
        const pts = [];
        for (let k = 0; k <= st.n; k++) {
          const u = k / st.n;
          pts.push([u * W, lerp(st.y0, st.y1, u) + Math.sin(u * Math.PI) * st.sag + Math.sin(t * 0.8 + st.ph) * 2 * Math.sin(u * Math.PI)]);
        }
        ctx.strokeStyle = 'rgba(20,14,30,.9)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        pts.forEach(([x, y], i) => {
          if (i === 0 || i === pts.length - 1) return;
          const fl = 0.75 + 0.25 * Math.sin(t * 3 + i * 1.7 + st.ph);
          glow(ctx, x, y + 4, 16, '#FFD27F', 0.5 * fl);
          ctx.fillStyle = `rgba(255,236,190,${fl})`;
          ctx.beginPath(); ctx.arc(x, y + 4, 2.4, 0, TAU); ctx.fill();
        });
      }
    });

    layer(ctx, s, 0.3, () => {
      // the street: warm stone catching lantern light
      ctx.fillStyle = vgrad(ctx, 0, H * 0.64, H, [[0, '#3A2436'], [0.4, '#2A1A26'], [1, '#160E16']]);
      ctx.fillRect(-40, H * 0.64, W + 80, H * 0.5);
      ctx.fillStyle = 'rgba(255,190,120,.05)';
      for (let k = 0; k < 9; k++) ctx.fillRect(-40, H * (0.68 + k * k * 0.004), W + 80, 1);
      ctx.drawImage(L.back, 0, H * 0.66 - L.back.h, W, L.back.h);
      for (const [x, y, ph] of L.backGlows) glow(ctx, x, y, 60, '#FFB347', 0.35 + 0.1 * Math.sin(t * 2 + ph));
    });

    /* the main stall */
    layer(ctx, s, 0.55, () => {
      const sx = stall.x, sw = stall.w, sy = stall.y, cy = stall.counter;
      // back wall glow
      ctx.fillStyle = vgrad(ctx, 0, sy, cy, [[0, '#4A2A2A'], [1, '#6A3A2A']]);
      ctx.fillRect(sx, sy, sw, cy - sy);
      glow(ctx, sx + sw / 2, cy - (cy - sy) * 0.3, sw * 0.6, '#FFB347', 0.35);
      // posts
      ctx.fillStyle = '#3A2418'; ctx.fillRect(sx - 6, sy - H * 0.06, 10, H); ctx.fillRect(sx + sw - 4, sy - H * 0.06, 10, H);
      // striped awning with a scalloped edge
      const ah = H * 0.07;
      for (let k = 0; k < 12; k++) {
        ctx.fillStyle = k % 2 ? '#F2E4CC' : '#C8433A';
        ctx.beginPath(); ctx.moveTo(sx - 20 + (k / 12) * (sw + 40), sy - ah); ctx.lineTo(sx - 20 + ((k + 1) / 12) * (sw + 40), sy - ah); ctx.lineTo(sx - 30 + ((k + 1) / 12) * (sw + 60), sy); ctx.lineTo(sx - 30 + (k / 12) * (sw + 60), sy); ctx.fill();
        ctx.beginPath(); ctx.arc(sx - 30 + ((k + 0.5) / 12) * (sw + 60), sy, (sw + 60) / 24, 0, Math.PI); ctx.fill();
      }
      // grill with embers
      const gx = sx + sw * 0.06, gw = sw * 0.24;
      ctx.fillStyle = '#1E1A1C'; ctx.fillRect(gx, cy - H * 0.05, gw, H * 0.05);
      const eg = ctx.createLinearGradient(0, cy - H * 0.05, 0, cy - H * 0.03);
      eg.addColorStop(0, '#FF5E3A'); eg.addColorStop(1, '#8A1E10');
      ctx.fillStyle = eg; ctx.fillRect(gx + 4, cy - H * 0.05, gw - 8, H * 0.012);
      glow(ctx, gx + gw / 2, cy - H * 0.05, gw * 0.9, '#FF5E3A', 0.45 + 0.1 * Math.sin(t * 7));
      for (let k = 0; k < 6; k++) { ctx.strokeStyle = '#B0542A'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx + 10 + k * gw / 7, cy - H * 0.052); ctx.lineTo(gx + 18 + k * gw / 7, cy - H * 0.075); ctx.stroke(); }
      // pots
      for (const [px, pw] of [[sx + sw * 0.34, sw * 0.1], [sx + sw * 0.46, sw * 0.08]]) {
        ctx.fillStyle = '#5A5A62'; rr(ctx, px, cy - H * 0.07, pw, H * 0.07, 6); ctx.fill();
        ctx.fillStyle = '#7A7A84'; ctx.fillRect(px - 3, cy - H * 0.072, pw + 6, 4);
      }
      // counter
      ctx.fillStyle = vgrad(ctx, 0, cy, H, [[0, '#8A5A3A'], [0.1, '#6A4028'], [1, '#2A180E']]);
      ctx.fillRect(sx - 20, cy, sw + 40, H - cy);
      ctx.fillStyle = 'rgba(255,220,170,.35)'; ctx.fillRect(sx - 20, cy, sw + 40, 2);
      // planks, and a chalk menu board on the counter front
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      for (let k = 1; k < 9; k++) ctx.fillRect(sx - 20 + (k / 9) * (sw + 40), cy + 6, 2, H - cy);
      const mw = Math.min(sw * 0.34, 220), mh = mw * 0.62, mx = sx + sw * 0.08, my = cy + (H - cy) * 0.22;
      ctx.fillStyle = '#3A2418'; rr(ctx, mx - 6, my - 6, mw + 12, mh + 12, 6); ctx.fill();
      ctx.fillStyle = '#1F2B26'; ctx.fillRect(mx, my, mw, mh);
      ctx.fillStyle = 'rgba(232,237,230,.8)';
      ctx.font = `600 ${Math.round(mw / 9)}px Georgia, serif`;
      ctx.fillText('today', mx + mw * 0.08, my + mh * 0.26);
      ctx.fillStyle = 'rgba(232,237,230,.45)';
      for (let k = 0; k < 3; k++) { ctx.fillRect(mx + mw * 0.08, my + mh * (0.45 + k * 0.17), mw * (0.5 - k * 0.08), 2); ctx.fillRect(mx + mw * 0.72, my + mh * (0.45 + k * 0.17), mw * 0.14, 2); }
      // dishes, lighting up one at a time
      const n = L.dishes.length;
      const ds = Math.min(W, H) * 0.028;
      L.dishes.forEach((k, i) => {
        const lit = ease(0.1 + (i / n) * 0.6, 0.16 + (i / n) * 0.6, p);
        dish(ctx, k, sx + sw * (0.58 + (i % 3) * 0.14) - (i >= 3 ? sw * 0.07 : 0), cy + (i >= 3 ? H * 0.06 : H * 0.012), ds, lit, t);
      });
      // hanging paper lanterns, swaying, pooling light
      for (const ln of L.lanterns) {
        const sway = Math.sin(t * 1.3 + ln.ph) * 0.12 + (s.ptr && Math.abs(s.px - ln.x) < 80 ? Math.sin(t * 6) * 0.08 : 0);
        const lx = ln.x + Math.sin(sway) * 30, ly = ln.y + Math.cos(sway) * 30;
        ctx.strokeStyle = '#1A1218'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ln.x, ln.y - 4); ctx.lineTo(lx, ly - ln.r); ctx.stroke();
        const fl = 0.85 + 0.15 * Math.sin(t * 9 + ln.ph) * Math.sin(t * 5.3);
        glow(ctx, lx, ly, ln.r * 7, ln.col, 0.45 * fl);
        const lg = ctx.createRadialGradient(lx - ln.r * 0.3, ly - ln.r * 0.3, 1, lx, ly, ln.r * 1.1);
        lg.addColorStop(0, '#FFE6A8'); lg.addColorStop(0.5, ln.col); lg.addColorStop(1, '#6A1A14');
        ctx.fillStyle = lg;
        ctx.beginPath(); ctx.ellipse(lx, ly, ln.r * 0.9, ln.r, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(80,20,10,.4)';
        for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(lx, ly, Math.abs(k) * ln.r * 0.22 + 0.5, ln.r, 0, 0, TAU); ctx.stroke(); }
        ctx.fillStyle = '#2A1A14'; ctx.fillRect(lx - ln.r * 0.4, ly - ln.r - 3, ln.r * 0.8, 4); ctx.fillRect(lx - ln.r * 0.3, ly + ln.r - 1, ln.r * 0.6, 3);
      }
    });

    /* steam lit warm below and gold above; embers from the grill */
    layer(ctx, s, 0.6, () => {
      const cy = stall.counter;
      L.steam.draw(ctx, 0.9, 0, 0, (q) => 1 - Math.max(0, (cy - H * 0.32 - q.y) / (H * 0.3)));
      L.embers.draw(ctx, 1);
    });

    /* crowd passing, thinning toward the end */
    layer(ctx, s, 0.8, () => {
      const keep = Math.round(lerp(L.crowd.length, 2, ease(0.3, 1, p)));
      for (let k = 0; k < keep; k++) {
        const c = L.crowd[k];
        const step = Math.sin(t * 5 + c.ph);
        const by = H * 1.04 + Math.abs(step) * -2;
        const x = c.x, hh = c.h, w = hh * 0.3 * c.w;
        const col = '#140D1A';
        ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
        // legs, tapered, mid-stride
        ctx.lineWidth = w * 0.26;
        ctx.beginPath(); ctx.moveTo(x - w * 0.16, by - hh * 0.4); ctx.lineTo(x - w * 0.12 + step * w * 0.35, by); ctx.moveTo(x + w * 0.16, by - hh * 0.4); ctx.lineTo(x + w * 0.12 - step * w * 0.35, by); ctx.stroke();
        // torso with sloped shoulders
        ctx.beginPath();
        ctx.moveTo(x - w * 0.5, by - hh * 0.78);
        ctx.quadraticCurveTo(x - w * 0.5, by - hh * 0.86, x - w * 0.18, by - hh * 0.87);
        ctx.lineTo(x + w * 0.18, by - hh * 0.87);
        ctx.quadraticCurveTo(x + w * 0.5, by - hh * 0.86, x + w * 0.5, by - hh * 0.78);
        ctx.lineTo(x + w * 0.4, by - hh * 0.36); ctx.lineTo(x - w * 0.4, by - hh * 0.36); ctx.closePath(); ctx.fill();
        // neck and head
        ctx.fillRect(x - w * 0.09, by - hh * 0.92, w * 0.18, hh * 0.07);
        ctx.beginPath(); ctx.ellipse(x, by - hh * 0.97, w * 0.2, hh * 0.075, 0, 0, TAU); ctx.fill();
        if (c.hat) { ctx.beginPath(); ctx.ellipse(x, by - hh * 1.02, w * 0.36, hh * 0.018, 0, 0, TAU); ctx.fill(); ctx.fillRect(x - w * 0.18, by - hh * 1.07, w * 0.36, hh * 0.05); }
        if (c.bag) { rr(ctx, x + c.dir * w * 0.42, by - hh * 0.6, w * 0.34, hh * 0.18, 4); ctx.fill(); }
        // warm rim light from the stalls
        ctx.strokeStyle = 'rgba(255,170,90,.4)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(x, by - hh * 0.97, w * 0.2, hh * 0.075, 0, -Math.PI * 0.95, -Math.PI * 0.25); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - w * 0.5, by - hh * 0.78); ctx.quadraticCurveTo(x - w * 0.5, by - hh * 0.86, x - w * 0.18, by - hh * 0.87); ctx.stroke();
      }
    });

    const fp = push(s, 1.3);
    ctx.drawImage(L.fgLeaves, fp.x, fp.y, W, H);
  }

  return {
    build, update, draw,
    dispose() { L = null; },
    crane(s) {
      if (!L) return null;
      const u = inv(0.06, 0.6, s.p);
      if (u <= 0 || u >= 1) return null;
      return { x: s.W * lerp(0.2, 0.75, u), y: s.H * lerp(0.62, 0.05, u), size: Math.min(s.W, s.H) * 0.036, flap: Math.sin(s.t * 8), dir: 1, rot: -0.3, glow: 0.6 };
    },
  };
}
