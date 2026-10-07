/* 05 · Movies & Music — "Hillside Cinema"
   A summer cinema on a hill at night, a record player on a blanket in front.
   The grass is the equaliser: a synthetic spectrum (or the real one, if
   ambient audio is ever wired in) drives the sway band by band, left to
   right, and tints the blade tips, so the wind dances. */
import { CINEMA } from '../config.js';
import { TAU, rng, clamp, lerp, ease, inv, bell, bake, blurred, hex2rgb, rgb, mixRGB } from '../util.js';
import { vgrad, glow, ridge, makeStars, drawStars, makeBlades, rr, haze } from '../paint.js';
import { field } from '../particles.js';
import { layer, push } from '../depth.js';

const BANDS = 16;

export default function create() {
  let L = null;
  const spec = new Float32Array(BANDS);

  function build(env) {
    const { W, H, dpr, mobile, pscale } = env;
    const r = rng(505);
    const hz = H * 0.56;

    /* sky with a Milky Way band baked in */
    const sky = bake(W, H, 1, (x, w, h) => {
      x.fillStyle = vgrad(x, 0, 0, h * 0.62, [[0, '#070B1E'], [0.6, '#0E1630'], [1, '#22305E']]);
      x.fillRect(0, 0, w, h);
      x.save();
      x.translate(w * 0.5, h * 0.3); x.rotate(-0.42);
      x.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 26; k++) {
        const gx = r.range(-w * 0.7, w * 0.7), gy = r.range(-h * 0.07, h * 0.07), rad = r.range(h * 0.06, h * 0.16);
        const g = x.createRadialGradient(gx, gy, 0, gx, gy, rad);
        const c = r.pick([[120, 110, 200], [90, 130, 210], [170, 120, 190]]);
        g.addColorStop(0, rgb(c, 0.09)); g.addColorStop(1, rgb(c, 0));
        x.fillStyle = g; x.fillRect(gx - rad, gy - rad, rad * 2, rad * 2);
      }
      for (let k = 0; k < (mobile ? 900 : 2200); k++) {
        const gx = r.range(-w * 0.75, w * 0.75), gy = (r() + r() + r() - 1.5) * h * 0.09;
        x.fillStyle = `rgba(235,240,255,${r.range(0.15, 0.7)})`;
        x.fillRect(gx, gy, r.range(0.5, 1.4), r.range(0.5, 1.4));
      }
      // dark dust lane
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = 'rgba(7,11,30,.35)';
      for (let k = 0; k < 14; k++) { x.beginPath(); x.ellipse(r.range(-w * 0.6, w * 0.6), r.range(-6, 6), r.range(40, 120), r.range(3, 9), 0, 0, TAU); x.fill(); }
      x.restore();
    });

    const townLights = [];
    const hills = bake(W, H * 0.3, dpr, (x, w, h) => {
      ridge(x, w, h, { base: h * 0.45, amp: h * 0.22, seed: 51, oct: 5, fill: vgrad(x, 0, 0, h, [[0, '#1C2546'], [1, '#141B36']]), rim: 'rgba(160,180,255,.25)' });
      const top = ridge(x, w, h, { base: h * 0.7, amp: h * 0.12, seed: 52, oct: 4, fill: '#111833' });
      for (let k = 0; k < (mobile ? 40 : 90); k++) {
        const tx = r() * w, ty = top(tx / w) + r.range(2, h * 0.25);
        townLights.push([tx, H * 0.56 - h * 0.62 + ty, r() * TAU, r.pick(['#FFD27A', '#FFB86B', '#FFF1C9'])]);
      }
    });

    /* screen on posts, audience silhouettes, projector */
    // screen left of centre on wide screens, so the glass card (right) never covers it
    const scr = { x: W * (W > 900 ? 0.12 : 0.18), y: H * 0.26, w: W * (W > 900 ? 0.32 : 0.62), h: 0 };
    scr.h = scr.w * 0.46;
    const hill = bake(W, H * 0.6, dpr, (x, w, h) => {
      const top = ridge(x, w, h, { base: h * 0.2, amp: h * 0.06, seed: 53, oct: 3, fill: vgrad(x, 0, 0, h, [[0, '#26402F'], [1, '#18291E']]), rim: 'rgba(170,200,255,.25)' });
      // posts
      x.fillStyle = '#0B0F18';
      const sy = scr.y - (H - h);
      x.fillRect(scr.x + 6, sy + scr.h, 5, h);
      x.fillRect(scr.x + scr.w - 11, sy + scr.h, 5, h);
      // audience: rows of heads and shoulders, rising up the slope
      for (let row = 0; row < 3; row++) {
        const ry = sy + scr.h + h * (0.1 + row * 0.07);
        for (let px = scr.x - scr.w * 0.25 - row * 30; px < scr.x + scr.w * 1.25 + row * 30; px += r.range(18, 34)) {
          const s = 7 + row * 2.4 + r.range(-1, 1.5);
          x.fillStyle = '#05070D';
          x.beginPath(); x.arc(px, ry - s * 1.8, s * 0.62, 0, TAU); x.fill();
          rr(x, px - s, ry - s * 1.2, s * 2, s * 2.4, s * 0.7); x.fill();
        }
      }
    });
    const proj = { x: W * (W > 900 ? 0.6 : 0.88), y: H * 0.68 };

    /* blanket, record player, sleeves (static parts) */
    const set = { x: W * (W > 900 ? 0.36 : 0.4), y: H * 0.86, s: Math.min(W, H) * 0.0026 };
    const fgGrass = blurred(bake(W, H * 0.22, 0.5, (x, w, h) => {
      for (let k = 0; k < w * 0.25; k++) {
        const gx = r() * w, gh = r.range(h * 0.35, h * 0.85);
        x.strokeStyle = r.pick(['#0B140F', '#101C15', '#16241B']);
        x.lineWidth = r.range(3, 7);
        x.beginPath(); x.moveTo(gx, h + 4); x.quadraticCurveTo(gx + r.range(-14, 14), h - gh * 0.5, gx + r.range(-30, 30), h - gh); x.stroke();
      }
    }), 6);

    const blades = makeBlades(57, Math.round(CINEMA.grass * (mobile ? 0.55 : 1)), W, H * 0.72, H * 1.02, H * 0.08, H * 0.2);
    const stars = makeStars(58, mobile ? 120 : 220, W, hz, 1);
    const flies = field({ n: Math.round(CINEMA.fireflies * pscale), seed: 5, box: [0, H * 0.45, W, H * 0.5], vx: [-10, 10], vy: [-8, 6], size: [1.2, 2.2], life: [4, 9], color: '#E8FF9A', style: 'glow', wobble: 16 });
    const motes = field({ n: Math.round(CINEMA.motes * pscale), seed: 6, box: [scr.x, scr.y, proj.x - scr.x, proj.y - scr.y + 20], vx: [-4, 4], vy: [-5, 3], size: [0.5, 1.4], life: [3, 7], color: '#FFF4D6', style: 'dot', wobble: 5 });

    L = { W, H, hz, sky, hills, hill, townLights, scr, proj, set, fgGrass, blades, stars, flies, motes };
  }

  function beamPoly(s, swing) {
    const { scr, proj } = L;
    return [[proj.x, proj.y - 4], [proj.x, proj.y + 4], [scr.x + swing, scr.y + scr.h], [scr.x + swing, scr.y]].concat([[scr.x + scr.w + swing, scr.y], [scr.x + scr.w + swing, scr.y + scr.h]]);
  }
  function inBeam(px, py, swing) {
    const { scr, proj } = L;
    // projector at the right, screen at the left: interpolate the beam's vertical span by x
    const u = (proj.x - px) / (proj.x - (scr.x + scr.w * 0.5 + swing));
    if (u < 0 || u > 1.2) return 0;
    const top = lerp(proj.y - 4, scr.y, u), bot = lerp(proj.y + 4, scr.y + scr.h, u);
    if (py < top || py > bot) return 0;
    return 1;
  }

  function update(s) {
    if (!L) return;
    const beat = 60 / CINEMA.bpm;
    const kick = Math.exp(-((s.t % beat) / beat) * 6);
    const hat = Math.exp(-(((s.t + beat / 2) % beat) / beat) * 10);
    for (let b = 0; b < BANDS; b++) {
      const u = b / (BANDS - 1);
      const target = (1 - u) * kick * 0.9 + u * hat * 0.6 + 0.25 * Math.abs(Math.sin(s.t * (1.3 + u * 3.1) + b * 0.9)) ** 2;
      spec[b] += (target - spec[b]) * Math.min(1, s.dt * 14);
    }
    L.flies.update(s.dt);
    L.motes.update(s.dt);
  }

  function filmColor(t, p) {
    const k = (t * 0.25) % 1;
    const pal = [[90, 140, 255], [255, 120, 160], [255, 200, 110], [120, 230, 210]];
    const i = Math.floor(k * pal.length), f = (k * pal.length) % 1;
    return mixRGB(pal[i], pal[(i + 1) % pal.length], f);
  }

  function draw(ctx, s) {
    if (!L) return;
    const { W, H, p, t } = s;
    const { scr, proj, set } = L;
    const reel = bell(0.46, 0.54, p);
    const black = reel > 0.4 && Math.sin(t * 40) > 0.2;
    const swing = Math.sin(p * Math.PI * 2) * W * 0.004 + reel * Math.sin(t * 9) * 6;
    const fc = filmColor(t, p);
    const lum = black ? 0.15 : 1;

    layer(ctx, s, 0, () => {
      ctx.drawImage(L.sky, -20, -20, W + 40, H + 40);
      drawStars(ctx, L.stars, t, 0.9);
      // the music as a faint ribbon above the hills
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 2;
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (let k = 0; k <= 64; k++) {
          const u = k / 64, b = Math.min(BANDS - 1, Math.floor(u * BANDS));
          const y = L.hz - H * 0.17 - spec[b] * H * 0.06 * Math.sin(u * 40 + t * 3 + pass) - pass * 6;
          k ? ctx.lineTo(u * W, y) : ctx.moveTo(0, y);
        }
        const g = ctx.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0, 'rgba(127,224,255,.0)'); g.addColorStop(0.3, 'rgba(127,224,255,.22)'); g.addColorStop(0.7, 'rgba(195,139,255,.22)'); g.addColorStop(1, 'rgba(195,139,255,0)');
        ctx.strokeStyle = g;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    });

    layer(ctx, s, 0.06, () => {
      ctx.drawImage(L.hills, 0, L.hz - L.hills.h * 0.62, W, L.hills.h);
      for (const [x, y, ph, c] of L.townLights) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 1.7 + ph); ctx.fillStyle = c; ctx.fillRect(x, y, 1.6, 1.6); }
      ctx.globalAlpha = 1;
      haze(ctx, W, L.hz - 30, 60, '#2A3A70', 0.4);
    });

    /* screen, audience and the projector beam */
    layer(ctx, s, 0.15, () => {
      ctx.drawImage(L.hill, 0, H - L.hill.h, W, L.hill.h);
      // the film: an abstract colour loop
      ctx.save();
      ctx.beginPath(); ctx.rect(scr.x, scr.y, scr.w, scr.h); ctx.clip();
      ctx.fillStyle = rgb(mixRGB(fc, [20, 24, 40], 0.55), 1);
      ctx.fillRect(scr.x, scr.y, scr.w, scr.h);
      if (!black) {
        for (let k = 0; k < 3; k++) {
          const bx = scr.x + scr.w * (0.5 + 0.38 * Math.sin(t * (0.4 + k * 0.17) + k * 2)), by = scr.y + scr.h * (0.5 + 0.35 * Math.cos(t * (0.33 + k * 0.21) + k));
          glow(ctx, bx, by, scr.w * 0.5, rgb(filmColor(t + k * 1.3, p)), 0.6, 'screen');
        }
        ctx.fillStyle = 'rgba(0,0,0,.18)';
        for (let yy = scr.y; yy < scr.y + scr.h; yy += 3) ctx.fillRect(scr.x, yy, scr.w, 1);
      } else { ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(scr.x, scr.y, scr.w, scr.h); }
      ctx.restore();
      ctx.strokeStyle = '#D8D4C8'; ctx.lineWidth = 3; ctx.strokeRect(scr.x - 2, scr.y - 2, scr.w + 4, scr.h + 4);
      // spill on the audience and slope
      glow(ctx, scr.x + scr.w / 2, scr.y + scr.h * 1.3, scr.w * 1.1, rgb(fc), 0.28 * lum);
      // beam
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(proj.x, proj.y, scr.x + scr.w / 2, scr.y + scr.h / 2);
      g.addColorStop(0, `rgba(255,248,226,${0.5 * lum})`); g.addColorStop(0.5, `rgba(255,241,201,${0.12 * lum})`); g.addColorStop(1, `rgba(220,232,255,${0.05 * lum})`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(proj.x, proj.y - 4); ctx.lineTo(scr.x + swing, scr.y); ctx.lineTo(scr.x + scr.w + swing, scr.y); ctx.lineTo(scr.x + scr.w + swing, scr.y + scr.h); ctx.lineTo(scr.x + swing, scr.y + scr.h); ctx.lineTo(proj.x, proj.y + 4); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      L.motes.draw(ctx, lum, 0, 0, (q) => inBeam(q.x, q.y, swing));
      // projector
      ctx.fillStyle = '#1A1E2A'; rr(ctx, proj.x - 6, proj.y - 14, 34, 22, 4); ctx.fill();
      ctx.fillStyle = '#2A3040'; ctx.beginPath(); ctx.arc(proj.x + 6, proj.y - 20, 9, 0, TAU); ctx.arc(proj.x + 22, proj.y - 20, 9, 0, TAU); ctx.fill();
      glow(ctx, proj.x - 6, proj.y, 26, '#FFF1C9', 0.9 * lum);
    });

    /* the equaliser grass */
    layer(ctx, s, 0.4, () => {
      const moon = hex2rgb('#6F8F6A');
      for (const b of L.blades) {
        const band = Math.min(BANDS - 1, Math.floor((b.x / W) * BANDS));
        const e = spec[band];
        const sway = (Math.sin(t * 1.4 + b.ph + b.x * 0.004) * 0.25 + e * 0.9 * Math.sin(t * 6 + b.ph)) * b.k;
        const x = b.x, tipX = x + sway * b.h * 0.6, tipY = b.y - b.h * (0.85 + e * 0.25);
        const tint = mixRGB(hex2rgb('#7FE0FF'), hex2rgb('#C38BFF'), band / (BANDS - 1));
        const g = ctx.createLinearGradient(x, b.y, tipX, tipY);
        g.addColorStop(0, rgb(mixRGB(moon, [10, 20, 14], 0.6)));
        g.addColorStop(0.7, rgb(moon));
        g.addColorStop(1, rgb(mixRGB(moon, tint, 0.35 + e * 0.6)));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - b.w, b.y);
        ctx.quadraticCurveTo(x + sway * b.h * 0.25, b.y - b.h * 0.5, tipX, tipY);
        ctx.quadraticCurveTo(x + sway * b.h * 0.25 + b.w * 0.5, b.y - b.h * 0.5, x + b.w, b.y);
        ctx.fill();
      }
    });

    /* blanket, turntable, sleeves, lantern */
    layer(ctx, s, 0.7, () => {
      const k = Math.max(0.7, set.s);
      const bx = set.x, by = set.y;
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(k, k);
      // blanket in perspective
      ctx.fillStyle = '#7A2E36';
      ctx.beginPath(); ctx.moveTo(-150, 30); ctx.lineTo(170, 30); ctx.lineTo(130, -40); ctx.lineTo(-110, -40); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(240,220,190,.35)'; ctx.lineWidth = 3;
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 40 + 10, 30); ctx.lineTo(i * 32 + 10, -40); ctx.stroke(); }
      for (const yy of [-20, 4]) { ctx.beginPath(); ctx.moveTo(-140, yy + 4); ctx.lineTo(160, yy + 4); ctx.stroke(); }
      // turntable
      ctx.fillStyle = '#5A3B28'; rr(ctx, -70, -52, 110, 44, 5); ctx.fill();
      ctx.fillStyle = '#3E281B'; ctx.fillRect(-70, -12, 110, 6);
      ctx.fillStyle = '#121216'; ctx.beginPath(); ctx.ellipse(-20, -32, 38, 15, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
      for (let gR = 12; gR < 36; gR += 4) { ctx.beginPath(); ctx.ellipse(-20, -32, gR, gR * 0.4, 0, 0, TAU); ctx.stroke(); }
      // the rotating highlight in the grooves
      const a = t * 3.5;
      ctx.strokeStyle = 'rgba(255,240,210,.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(-20, -32, 30, 12, 0, a, a + 0.5); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-20, -32, 22, 9, 0, a + Math.PI, a + Math.PI + 0.4); ctx.stroke();
      ctx.fillStyle = '#E8503A'; ctx.beginPath(); ctx.ellipse(-20, -32, 9, 3.6, 0, 0, TAU); ctx.fill();
      // tonearm drops as you arrive
      const drop = ease(0.02, 0.18, p);
      ctx.save();
      ctx.translate(26, -44);
      ctx.rotate(lerp(-0.25, 0.42, drop));
      ctx.strokeStyle = '#C9CCD2'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-34, 8); ctx.stroke();
      ctx.fillStyle = '#C9CCD2'; ctx.fillRect(-40, 6, 8, 4);
      ctx.restore();
      ctx.fillStyle = '#9A9EA6'; ctx.beginPath(); ctx.arc(26, -44, 4, 0, TAU); ctx.fill();
      // record sleeves
      const sleeve = (sx, sy, rot, c1, c2) => {
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(rot);
        ctx.fillStyle = c1; ctx.fillRect(-26, -52, 52, 52);
        ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(0, -26, 14, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(-26, -52, 52, 6);
        ctx.restore();
      };
      sleeve(78, 0, 0.18, '#2B4A7A', '#FFB86B');
      sleeve(108, 6, 0.32, '#C3463A', '#F2E6C8');
      // lantern
      const fl = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3);
      glow(ctx, -120, -30, 150, '#FFB86B', 0.5 * fl);
      ctx.fillStyle = '#2A2420'; ctx.fillRect(-130, -18, 20, 4); ctx.fillRect(-128, -54, 16, 4);
      ctx.fillStyle = `rgba(255,200,120,${0.85 * fl})`; rr(ctx, -128, -50, 16, 32, 4); ctx.fill();
      ctx.strokeStyle = '#2A2420'; ctx.lineWidth = 1.5; ctx.strokeRect(-128, -50, 16, 32);
      ctx.restore();
    });

    // foreground grass tips, out of focus
    const fp = push(s, 1.3);
    ctx.drawImage(L.fgGrass, fp.x, H - L.fgGrass.h + fp.y + 6, W, L.fgGrass.h);
    L.flies.draw(ctx, 0.9);
  }

  return {
    build, update, draw,
    dispose() { L = null; },
    crane(s) {
      if (!L) return null;
      const u = inv(0.26, 0.72, s.p);
      if (u <= 0 || u >= 1) return null;
      const { scr, proj } = L;
      const x = lerp(proj.x, scr.x - s.W * 0.1, u), y = lerp(proj.y - 30, scr.y - 20, u) + Math.sin(u * 6) * 10;
      const lit = inBeam(x, y + 10, 0);
      return { x, y, size: Math.min(s.W, s.H) * 0.04, flap: Math.sin(s.t * 8), dir: -1, rot: -0.1, glow: lit, tint: lit ? null : 'rgba(40,50,90,.45)' };
    },
  };
}
