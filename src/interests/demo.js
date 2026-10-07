/* Standalone demo entry: the same module the site mounts, driven by
   Lenis + GSAP's ticker (one loop), with the site's real photos passed
   in as media so the Traveling and Photography sheets are populated. */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { mountInterests } from './engine.js';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let lenis = null;
if (!reduced()) {
  lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  gsap.ticker.add((time) => lenis && lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

const media = window.__IX_MEDIA__ || {};
const app = mountInterests(document.getElementById('interests'), {
  lenis: () => lenis,
  reduced,
  media,
});
if (location.hash) requestAnimationFrame(() => app.goTo(location.hash.slice(1), true));
window.__ix = app;
