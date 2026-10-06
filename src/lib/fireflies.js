/* ===================== the cleared sky =====================
   Nothing plays here. The screen goes dark and a handful of fireflies drift
   through it, pulsing slowly; each one's light is a hole punched in the
   darkness, so the page underneath shows only where a firefly happens to be
   — the same reveal the flashlight does, but moving and on its own schedule.

   All of it is one canvas:
     1. fill the whole screen with the veil
     2. destination-out a soft radial per firefly  → the hole
     3. lighter, draw the body and its halo        → the glow

   Keeping the veil and the reveal on the same canvas is what makes this
   cheap. The alternative — a mask-image rebuilt from N radial-gradients
   every frame — restyles the whole element 60 times a second. */

const VEIL = 'rgba(2,3,10,0.955)';

/* The reveal must be dimmer than the glow or the page reads as simply
   un-dimmed rather than lit. 0.88 leaves a trace of veil inside the pool. */
const REVEAL = 0.88;

function makeFly(W, H) {
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    /* a heading that wanders, rather than a fixed velocity — fireflies do not
       travel in straight lines */
    a: Math.random() * Math.PI * 2,
    spd: 9 + Math.random() * 16,          // px/s
    turn: (Math.random() - 0.5) * 0.9,    // rad/s
    // pulse: slow, and each one on its own clock
    rate: 0.22 + Math.random() * 0.34,
    phase: Math.random() * Math.PI * 2,
    r: 108 + Math.random() * 86,          // reach of its light
    hue: 52 + Math.random() * 20,         // warm yellow-green
  };
}

export function createFireflies(canvas) {
  const ctx = canvas ? canvas.getContext('2d') : null;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let flies = [];
  let amount = 0;      // 0 → 1, fades the whole effect in and out
  let want = 0;

  const count = () => (window.innerWidth < 760 ? 8 : 14);

  function size() {
    if (!ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = count();
    if (flies.length !== n) {
      flies = Array.from({ length: n }, () => makeFly(W, H));
    }
  }

  size();
  window.addEventListener('resize', size);

  return {
    set(on) { want = on ? 1 : 0; },
    active: () => amount > 0.002,

    tick(t, dt) {
      if (!ctx) return;
      // ease the veil in and out rather than cutting to it
      amount += (want - amount) * (1 - Math.pow(0.0015, dt / (want ? 1.1 : 0.7)));
      if (amount < 0.002) {
        if (canvas.style.opacity !== '0') {
          canvas.style.opacity = '0';
          ctx.clearRect(0, 0, W, H);
        }
        return;
      }
      canvas.style.opacity = '1';
      if (!W) size();

      /* drift */
      for (const f of flies) {
        f.a += f.turn * dt;
        f.turn += (Math.random() - 0.5) * 1.6 * dt;
        f.turn = Math.max(-1.1, Math.min(1.1, f.turn));
        f.x += Math.cos(f.a) * f.spd * dt;
        f.y += Math.sin(f.a) * f.spd * dt;
        // wrap with a margin so they re-enter instead of popping at the edge
        const m = f.r;
        if (f.x < -m) f.x = W + m;
        if (f.x > W + m) f.x = -m;
        if (f.y < -m) f.y = H + m;
        if (f.y > H + m) f.y = -m;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      /* 1 — the dark */
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = amount;
      ctx.fillStyle = VEIL;
      ctx.fillRect(0, 0, W, H);

      /* 2 — punch the reveal */
      ctx.globalCompositeOperation = 'destination-out';
      for (const f of flies) {
        // a long dark trough and a short bloom reads as breathing, where a
        // plain sine reads as a throb
        const s = Math.pow(0.5 + 0.5 * Math.sin(t * f.rate * Math.PI * 2 + f.phase), 2.4);
        if (s < 0.01) continue;
        const r = f.r * (0.55 + 0.45 * s);
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
        g.addColorStop(0, `rgba(0,0,0,${(REVEAL * s * amount).toFixed(3)})`);
        g.addColorStop(0.45, `rgba(0,0,0,${(REVEAL * s * amount * 0.45).toFixed(3)})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r, 0, 6.283);
        ctx.fill();
      }

      /* 3 — the insects themselves */
      ctx.globalCompositeOperation = 'lighter';
      for (const f of flies) {
        const s = Math.pow(0.5 + 0.5 * Math.sin(t * f.rate * Math.PI * 2 + f.phase), 2.4);
        if (s < 0.01) continue;
        const halo = 26 * (0.5 + 0.5 * s);
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, halo);
        g.addColorStop(0, `hsla(${f.hue},95%,74%,${(0.85 * s * amount).toFixed(3)})`);
        g.addColorStop(0.35, `hsla(${f.hue},92%,62%,${(0.3 * s * amount).toFixed(3)})`);
        g.addColorStop(1, `hsla(${f.hue},90%,55%,0)`);
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, halo, 0, 6.283);
        ctx.fill();

        ctx.fillStyle = `hsla(${f.hue + 6},100%,88%,${(0.95 * s * amount).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 1.5 + 1.1 * s, 0, 6.283);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    },

    destroy() { window.removeEventListener('resize', size); },
  };
}
