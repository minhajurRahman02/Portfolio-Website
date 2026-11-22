import { getLenis } from './motion.js';

/* Scroll lock for overlays. position:fixed on <body> rather than
   overflow:hidden, because overflow on the body would turn it into a scroll
   container and quietly break every position:sticky on the page. Depth is
   counted so two overlays open at once do not unlock each other. */
let depth = 0;
let y = 0;

export function lockScroll(on) {
  const b = document.body;
  if (on) {
    if (depth++ > 0) return;
    y = window.scrollY;
    getLenis()?.stop();
    b.classList.add('locked');
    b.style.position = 'fixed';
    b.style.top = `${-y}px`;
    b.style.width = '100%';
  } else {
    if (depth === 0) return;
    if (--depth > 0) return;
    b.classList.remove('locked');
    b.style.position = '';
    b.style.top = '';
    b.style.width = '';
    // 'instant', explicitly: html has scroll-behavior:smooth, so a plain
    // scrollTo(0, y) animated the page down from the top on every close
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    // Lenis re-reads the native position on start(). Do not hand it y via
    // its own scrollTo: its page-height cache still holds the locked
    // (viewport-tall) body, so it clamps y to 0 and throws the visitor to
    // the top.
    const l = getLenis();
    if (l) { l.resize?.(); l.start(); }
  }
}
