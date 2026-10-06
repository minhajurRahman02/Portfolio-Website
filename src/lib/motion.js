/* Lenis smooth scroll + GSAP/ScrollTrigger, wired to the shared rAF loop.
   Both collapse under prefers-reduced-motion or the Reduce-motion feature. */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { onFrame, prefersReducedMotion } from './loop.js';

gsap.registerPlugin(ScrollTrigger);

let lenis = null;
let detach = null;

export function startSmoothScroll() {
  if (lenis || prefersReducedMotion()) return;
  lenis = new Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
  });
  lenis.on('scroll', ScrollTrigger.update);
  detach = onFrame((t) => lenis && lenis.raf(t * 1000));
}

export function stopSmoothScroll() {
  if (detach) { detach(); detach = null; }
  if (lenis) { lenis.destroy(); lenis = null; }
}

export function setSmoothScroll(on) {
  if (on) startSmoothScroll(); else stopSmoothScroll();
}

/** Jump to top without the smooth-scroll easing fighting it. */
export function scrollTop(instant = true) {
  if (lenis) lenis.scrollTo(0, { immediate: instant });
  else window.scrollTo({ top: 0, behavior: instant ? 'auto' : 'smooth' });
}

export function scrollToEl(el, opts = {}) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: opts.offset ?? -120, duration: 1.2 });
  else el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function refreshTriggers() {
  ScrollTrigger.refresh();
}

export { gsap, ScrollTrigger };
