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
    window.scrollTo(0, y);
  }
}
