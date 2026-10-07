/* Scene-to-scene transitions. TRANSITIONS[i] carries scene i into i+1.
   Each gets the main context, the mix t ∈ [0,1], draw callbacks for both
   scenes, and env (size, scratch buffers, both scene states). */
import { TAU, clamp, lerp, ease, smooth, bell, rng } from './util.js';
import { rr, glow } from './paint.js';

const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

let tiny = null;
function pixelate(ctx, src, W, H, dpr, block) {
  const w = Math.max(8, Math.round(W / block)), h = Math.max(6, Math.round(H / block));
  if (!tiny) { tiny = document.createElement('canvas'); tiny.x = tiny.getContext('2d'); }
  if (tiny.width !== w || tiny.height !== h) { tiny.width = w; tiny.height = h; }
  tiny.x.imageSmoothingEnabled = true;
  tiny.x.drawImage(src, 0, 0, w, h);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tiny, 0, 0, W * dpr, H * dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.restore();
}

/** Draw a scene into a scratch buffer and composite it at alpha `a`.
 *  Scenes set globalAlpha themselves, so fading them in place would not work. */
function fade(ctx, draw, a, env, k = 0) {
  if (a <= 0.003) return;
  const b = env.scratch(k);
  draw(b.x);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = a;
  ctx.drawImage(b, 0, 0);
  ctx.restore();
}

function hexPath(ctx, cx, cy, r, rot) {
  for (let i = 0; i < 6; i++) {
    const a = rot + (i / 6) * TAU;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function wavyEdge(ctx, W, y, amp, t, below) {
  ctx.beginPath();
  ctx.moveTo(0, below ? ctx.canvas.height : -10);
  ctx.lineTo(0, y);
  for (let x = 0; x <= W + 8; x += 8) {
    ctx.lineTo(x, y + Math.sin(x * 0.012 + t * 3) * amp + Math.sin(x * 0.031 - t * 5) * amp * 0.4);
  }
  ctx.lineTo(W, below ? ctx.canvas.height : -10);
  ctx.closePath();
}

function foam(ctx, W, y, amp, t, a) {
  ctx.beginPath();
  for (let x = 0; x <= W + 8; x += 8) {
    const yy = y + Math.sin(x * 0.012 + t * 3) * amp + Math.sin(x * 0.031 - t * 5) * amp * 0.4;
    x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
  }
  ctx.strokeStyle = `rgba(235,255,252,${0.75 * a})`;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.strokeStyle = `rgba(200,250,255,${0.25 * a})`;
  ctx.lineWidth = 9;
  ctx.stroke();
}

function bird(ctx, x, y, s, flap, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, s * 0.13);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s, y - flap * s * 0.6);
  ctx.quadraticCurveTo(x - s * 0.45, y - s * 0.15, x, y);
  ctx.quadraticCurveTo(x + s * 0.45, y - s * 0.15, x + s, y - flap * s * 0.6);
  ctx.stroke();
}

export const TRANSITIONS = [
  /* 0 · Traveling → Photography: push into a lit window, its frame becomes the viewfinder */
  (ctx, t, A, B, env) => {
    const { W, H } = env;
    const an = (env.A.anchor && env.A.anchor(env.sA)) || { x: W * 0.5 - 30, y: H * 0.6, w: 60, h: 40, r: 8 };
    const cx = an.x + an.w / 2, cy = an.y + an.h / 2;
    const e = inOut(ease(0, 0.7, t));
    const z = 1 + e * 5;
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy);
    A(ctx);
    ctx.restore();
    const f = inOut(ease(0.25, 1, t));
    const zw = an.w * z, zh = an.h * z;
    const x = lerp(cx - zw / 2, 0, f), y = lerp(cy - zh / 2, 0, f);
    const w = lerp(zw, W, f), h = lerp(zh, H, f);
    const r = lerp(an.r * z, 0, f);
    ctx.save();
    rr(ctx, x, y, w, h, r);
    ctx.clip();
    B(ctx);
    ctx.restore();
    // the warm window edge, fading as it grows
    rr(ctx, x, y, w, h, r);
    ctx.strokeStyle = `rgba(255,214,140,${0.7 * (1 - f)})`;
    ctx.lineWidth = 3 + 10 * (1 - f);
    ctx.stroke();
  },

  /* 1 · Photography → Editing: the aperture irises shut on a click, then open on the suite */
  (ctx, t, A, B, env) => {
    const { W, H } = env;
    const maxR = Math.hypot(W, H) * 0.62;
    const closing = t < 0.5;
    const u = closing ? inOut(t / 0.5) : inOut((t - 0.5) / 0.5);
    const r = closing ? maxR * (1 - u) : maxR * u;
    const rot = (closing ? u : 1 - u) * 0.9;
    (closing ? A : B)(ctx);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-10, -10, W + 20, H + 20);
    hexPath(ctx, W / 2, H / 2, Math.max(0.1, r), rot);
    ctx.fillStyle = '#07070B';
    ctx.fill('evenodd');
    // blade seams
    ctx.strokeStyle = 'rgba(120,120,140,.35)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const a = rot + (i / 6) * TAU;
      ctx.beginPath();
      ctx.moveTo(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r);
      ctx.lineTo(W / 2 + Math.cos(a + 0.9) * maxR * 1.2, H / 2 + Math.sin(a + 0.9) * maxR * 1.2);
      ctx.stroke();
    }
    ctx.restore();
    const flash = bell(0.46, 0.56, t);
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.55})`; ctx.fillRect(0, 0, W, H); }
  },

  /* 2 · Editing → Gaming: the picture degrades to 8-bit, we fall through the screen, a CRT powers on */
  (ctx, t, A, B, env) => {
    const { W, H, dpr } = env;
    if (t < 0.56) {
      const u = t / 0.56;
      const an = (env.A.anchor && env.A.anchor(env.sA)) || { x: W * 0.4, y: H * 0.5, w: W * 0.2, h: H * 0.15 };
      const cx = an.x + an.w / 2, cy = an.y + an.h / 2;
      const z = 1 + Math.pow(u, 2.2) * 7;
      const buf = env.scratch(1);
      buf.x.save();
      buf.x.translate(cx, cy); buf.x.scale(z, z); buf.x.translate(-cx, -cy);
      A(buf.x);
      buf.x.restore();
      const block = 1 + Math.pow(u, 1.6) * 30;
      if (block < 1.6) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(buf, 0, 0); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
      else pixelate(ctx, buf, W, H, dpr, block);
      // glitch bars
      const r = rng(Math.floor(env.time * 24));
      const n = Math.floor(u * 9);
      for (let k = 0; k < n; k++) {
        const y = r() * H, h = r.range(3, 22);
        ctx.fillStyle = r.pick(['rgba(255,0,90,.35)', 'rgba(0,255,220,.3)', 'rgba(255,255,255,.25)']);
        ctx.fillRect(r.range(-40, 40), y, W, h);
      }
      const fade = ease(0.75, 1, u);
      if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
      return;
    }
    const u = (t - 0.56) / 0.44;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const wx = ease(0, 0.3, u), hy = inOut(ease(0.28, 1, u));
    const w = Math.max(2, W * wx), h = Math.max(2, H * hy);
    ctx.save();
    ctx.beginPath(); ctx.rect(W / 2 - w / 2, H / 2 - h / 2, w, h); ctx.clip();
    if (hy > 0.01) B(ctx);
    ctx.restore();
    const line = 1 - ease(0.3, 0.75, u);
    if (line > 0) {
      ctx.fillStyle = `rgba(255,255,255,${line})`;
      ctx.fillRect(W / 2 - w / 2, H / 2 - h / 2 - 1, w, 2);
      ctx.fillRect(W / 2 - w / 2, H / 2 + h / 2 - 1, w, 2);
      glow(ctx, W / 2, H / 2, W * 0.4 * wx, '#BFE8FF', 0.4 * line);
    }
  },

  /* 3 · Gaming → Cinema: the tally collapses to a bright line that becomes the projector beam */
  (ctx, t, A, B, env) => {
    const { W, H } = env;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const bIn = ease(0.38, 0.9, t);
    fade(ctx, B, bIn, env);
    const c = inOut(ease(0, 0.5, t));
    if (c < 1) {
      const h = Math.max(2, H * (1 - c));
      ctx.save();
      ctx.beginPath(); ctx.rect(0, H / 2 - h / 2, W, h); ctx.clip();
      A(ctx);
      ctx.fillStyle = `rgba(255,255,255,${c * 0.6})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    const line = bell(0.3, 0.95, t);
    if (line > 0) {
      const lw = W * (1 - ease(0.5, 0.95, t) * 0.9);
      ctx.fillStyle = `rgba(255,248,226,${line})`;
      ctx.fillRect(W / 2 - lw / 2, H / 2 - 1.5, lw, 3);
      glow(ctx, W / 2, H / 2, lw * 0.6, '#FFF1C9', line * 0.5);
    }
  },

  /* 4 · Cinema → Reading: dawn rises; the beam narrows into a sunbeam */
  (ctx, t, A, B, env) => {
    const { W, H } = env;
    A(ctx);
    const b = ease(0.3, 0.8, t);
    fade(ctx, B, b, env);
    const warm = bell(0.05, 0.95, t);
    glow(ctx, W * 0.6, H * 0.35, Math.max(W, H) * 0.8, '#FFD9A0', warm * 0.55);
    ctx.fillStyle = `rgba(255,226,170,${warm * 0.18})`;
    ctx.fillRect(0, 0, W, H);
  },

  /* 5 · Reading → Swimming: the page-birds sweep across; one dives and we follow it under */
  (ctx, t, A, B, env) => {
    const { W, H } = env;
    A(ctx);
    const e = inOut(ease(0.2, 1, t));
    const y = H * (1.05 - e * 1.15);
    ctx.save();
    wavyEdge(ctx, W, y, 10 + 18 * (1 - e), env.time, true);
    ctx.clip();
    B(ctx);
    ctx.restore();
    foam(ctx, W, y, 10 + 18 * (1 - e), env.time, 1 - ease(0.85, 1, t));
    // birds
    const r = rng(11);
    for (let k = 0; k < 11; k++) {
      const sp = r.range(0.8, 1.3);
      const bx = lerp(-0.1, 1.15, clamp(t * sp * 1.4 - r() * 0.25)) * W;
      let by = H * r.range(0.12, 0.38) + Math.sin(t * 8 + k) * 6;
      if (k === 0) by = lerp(H * 0.25, y + 30, ease(0.15, 0.55, t));
      const flap = Math.sin(env.time * 10 + k * 1.3);
      const s = r.range(9, 15);
      if (bx > -20 && bx < W + 20) bird(ctx, bx, by, s, flap, k === 0 ? '#FFF8EC' : 'rgba(255,248,236,.85)');
    }
  },

  /* 6 · Swimming → Market: we break the surface at twilight; bubbles become lanterns */
  (ctx, t, A, B, env) => {
    const { W, H } = env;
    A(ctx);
    const e = inOut(ease(0.12, 0.9, t));
    const y = H * (-0.06 + e * 1.14);
    ctx.save();
    wavyEdge(ctx, W, y, 9 + 14 * (1 - e), env.time, false);
    ctx.clip();
    B(ctx);
    ctx.restore();
    foam(ctx, W, y, 9 + 14 * (1 - e), env.time, 1 - ease(0.8, 1, t));
    // rising bubbles that warm into lantern glows as they cross the surface
    const r = rng(5);
    for (let k = 0; k < 18; k++) {
      const bx = r() * W;
      const by = H * (1.1 - ((t * r.range(0.9, 1.6) + r()) % 1.2));
      const above = by < y;
      const s = r.range(3, 7);
      if (above) {
        glow(ctx, bx, by, s * 8, '#FFB347', 0.5);
        ctx.fillStyle = 'rgba(255,214,140,.9)';
        ctx.beginPath(); ctx.arc(bx, by, s * 0.7, 0, TAU); ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(220,255,255,.55)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(bx, by, s * 0.6, 0, TAU); ctx.stroke();
      }
    }
    // droplets on the lens just after breaking through
    const d = bell(0.55, 1, t);
    if (d > 0) {
      const rr2 = rng(9);
      for (let k = 0; k < 14; k++) {
        const x = rr2() * W, yy = rr2() * H, s = rr2.range(6, 22);
        ctx.fillStyle = `rgba(255,255,255,${0.08 * d})`;
        ctx.beginPath(); ctx.arc(x, yy, s, 0, TAU); ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${0.35 * d})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, yy, s, Math.PI * 0.9, Math.PI * 1.6); ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${0.6 * d})`;
        ctx.beginPath(); ctx.arc(x - s * 0.35, yy - s * 0.35, s * 0.16, 0, TAU); ctx.fill();
      }
    }
  },

  /* 7 · Market → Teaching: the steam thickens and clears into chalk dust in a lamp beam */
  (ctx, t, A, B, env) => {
    const { W, H } = env;
    A(ctx);
    const b = ease(0.38, 0.72, t);
    fade(ctx, B, b, env);
    const fog = bell(0.04, 0.98, t);
    const r = rng(21);
    for (let k = 0; k < 16; k++) {
      const x = r() * W, y = H * (0.2 + r() * 0.9) - t * H * 0.35 * r.range(0.6, 1.2);
      const rad = Math.max(W, H) * r.range(0.18, 0.4);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(238,230,242,${0.55 * fog})`);
      g.addColorStop(1, 'rgba(238,230,242,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    ctx.fillStyle = `rgba(228,222,236,${fog * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  },
];
