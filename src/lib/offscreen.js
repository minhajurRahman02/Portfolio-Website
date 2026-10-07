/* Pause decorative CSS loops while they are off screen.
   Every element matching SEL gets `.anim-off` whenever it is outside the
   viewport (with a margin), and index.css pauses its infinite animations
   under that class. Nothing changes while an element is visible — a paused
   loop simply resumes where it stopped when it scrolls back in — but the
   browser stops repainting and recompositing things nobody can see.

   One IntersectionObserver for the whole app; a MutationObserver picks up
   elements as routes mount and drops them as they unmount. */
const SEL = '.split, .segclock, .n-ext, .pf-ring, .caret';

export function startOffscreenPause(root = document.body) {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return () => {};
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle('anim-off', !e.isIntersecting)),
    { rootMargin: '160px 0px' }
  );
  const watched = new Set();
  const each = (node, fn) => {
    if (node.nodeType !== 1) return;
    if (node.matches(SEL)) fn(node);
    node.querySelectorAll(SEL).forEach(fn);
  };
  const add = (el) => { if (!watched.has(el)) { watched.add(el); io.observe(el); } };
  const drop = (el) => { if (watched.delete(el)) io.unobserve(el); };

  each(root, add);
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      m.removedNodes.forEach((n) => each(n, drop));
      m.addedNodes.forEach((n) => each(n, add));
    }
  });
  mo.observe(root, { childList: true, subtree: true });
  return () => { mo.disconnect(); io.disconnect(); watched.clear(); };
}
