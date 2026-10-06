/* One requestAnimationFrame loop for the whole app.
   Every canvas, the cursor, the dock magnifier and the terminal all
   subscribe here rather than starting loops of their own. */

const subs = new Set();
let running = false;
let t0 = 0;
let prev = 0;

function tick(now) {
  if (!running) return;
  if (!t0) { t0 = now; prev = now; }
  const t = (now - t0) / 1000;
  const dt = Math.min((now - prev) / 1000, 0.12);
  prev = now;
  for (const fn of subs) {
    try { fn(t, dt); } catch (err) {
      // one broken subscriber must not take the whole loop down
      if (import.meta.env.DEV) console.error('[loop]', err);
    }
  }
  requestAnimationFrame(tick);
}

export function onFrame(fn) {
  subs.add(fn);
  if (!running) { running = true; requestAnimationFrame(tick); }
  return () => subs.delete(fn);
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
