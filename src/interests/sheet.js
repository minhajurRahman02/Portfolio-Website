/* The bottom sheet. Slides up to leave a gap at the top, so the scene stays
   visible behind it; the engine reads `state.v` (0..1) to dolly the scene
   back while it is open. Background scroll is locked (Lenis stopped, root
   overflow hidden, stray wheel/touch swallowed), focus is trapped inside,
   Escape and the sticky X close it, and focus returns to whatever opened it. */
import { gsap } from 'gsap';
import { SHEET } from './config.js';
import { byId } from './content.js';
import { icon } from './icons.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

function placeholder({ slot, ratio, label, wide }, src) {
  if (src) {
    return `<figure class="ix-media${wide ? ' wide' : ''}" style="aspect-ratio:${ratio}"><img src="${esc(src)}" alt="${esc(label)}" loading="lazy"/></figure>`;
  }
  return `<figure class="ix-ph${wide ? ' wide' : ''}" style="aspect-ratio:${ratio}" data-slot="${esc(slot)}">
    ${icon('image')}
    <figcaption><b>Image placeholder · ${esc(ratio.replace('/', ':'))}</b><span>${esc(label)}</span><code>${esc(slot)}</code></figcaption>
  </figure>`;
}

function mediaHTML(it, media) {
  const m = it.media || {};
  const slots = media.slots || {};
  if (m.kind === 'travel') {
    const tr = media.travel;
    if (tr && tr.cover) {
      return `<figure class="ix-media wide ix-cover" style="aspect-ratio:16/8"><img src="${esc(tr.cover)}" alt="${esc(tr.caption || 'Travel')}" loading="lazy"/><figcaption>${esc(tr.caption || '')}</figcaption></figure>
        <div class="ix-grid6">${(tr.grid || []).map((s, i) => `<figure class="ix-media" style="aspect-ratio:1/1"><img src="${esc(s)}" alt="Travel photo ${i + 1}" loading="lazy"/></figure>`).join('')}</div>`;
    }
    return placeholder({ slot: 'travel-cover', ratio: '16/8', label: 'Cover photo from a trip', wide: true })
      + `<div class="ix-grid6">${[1, 2, 3, 4, 5, 6].map((i) => placeholder({ slot: `travel-${i}`, ratio: '1/1', label: 'Trip photo' })).join('')}</div>`;
  }
  if (m.kind === 'gallery') {
    const g = media.gallery || [];
    if (g.length) {
      return `<div class="ix-reveal" data-reveal><span class="ix-reveal-hint">move the cursor</span>${g.map((s, i) => `<img src="${esc(s)}" alt="" data-i="${i}" draggable="false"/>`).join('')}</div>
        <div class="ix-grid6 ix-reveal-touch">${g.slice(0, 6).map((s) => `<figure class="ix-media" style="aspect-ratio:1/1"><img src="${esc(s)}" alt="" loading="lazy"/></figure>`).join('')}</div>`;
    }
    // no photos yet: the same cursor-trail gallery runs on labelled placeholder frames
    const ph = Array.from({ length: 10 }, (_, i) => `<div class="ix-reveal-ph" data-i="${i}"><b>${String(i + 1).padStart(2, '0')}</b><span>Photo slot · 4:5</span><code>gallery[${i}]</code></div>`).join('');
    return `<div class="ix-reveal" data-reveal><span class="ix-reveal-hint">move the cursor — placeholder frames until photos are added</span>${ph}</div>
      <div class="ix-grid6 ix-reveal-touch">${[1, 2, 3, 4, 5, 6].map((i) => placeholder({ slot: `gallery[${i - 1}]`, ratio: '4/5', label: 'Photograph' })).join('')}</div>`;
  }
  if (m.kind === 'slots') {
    return `<div class="ix-slots n${m.slots.length}">${m.slots.map((s) => placeholder(s, slots[s.slot] || s.src)).join('')}</div>`;
  }
  return '';
}

function gameHTML(g) {
  if (!g) return '';
  return `<div class="ix-game">
    <div class="ix-statcard">
      <p class="ix-px">PLAYER 1</p>
      <p class="ix-px big">${esc(g.cls)} <span>LV ${g.lvl}</span></p>
      ${g.stats.map(([k, v]) => `<div class="ix-stat"><span class="ix-px">${k}</span><i>${'<b></b>'.repeat(v)}${'<em></em>'.repeat(10 - v)}</i></div>`).join('')}
      <p class="ix-px blink">PRESS START</p>
    </div>
    ${g.lists.map((l) => `<div class="ix-glist"><p class="ix-px">${esc(l.title)}</p><ol>${l.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>`).join('')}
  </div>`;
}

function render(it, media, accent) {
  return `
    <header class="ix-sh-head" style="--acc:${accent}">
      <p class="ix-eyebrow">${it.n} · ${esc(it.title)}${it.draft ? '<span class="ix-draft">draft copy</span>' : ''}</p>
      <h2 id="ix-sheet-title" class="${it.pixel ? 'ix-px-h' : ''}">${esc(it.scene)}</h2>
      <p class="ix-sh-sub">${esc(it.sub)}</p>
    </header>
    <div class="ix-sh-cols">
      <div class="ix-sh-body">${it.body.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
      <aside class="ix-sh-hl ix-glass">
        <p class="ix-eyebrow">Highlights</p>
        <ul>${it.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
      </aside>
    </div>
    ${gameHTML(it.game)}
    <section class="ix-sh-media">${mediaHTML(it, media)}</section>`;
}

/* cursor-trail gallery: a frame blurs in under the cursor and out as it drifts */
function wireReveal(box) {
  if (!box) return () => {};
  const imgs = [...box.querySelectorAll('[data-i]')];
  let gi = 0, last = { x: -999, y: -999 };
  const move = (e) => {
    const r = box.getBoundingClientRect();
    const lx = e.clientX - r.left, ly = e.clientY - r.top;
    if (lx < 0 || ly < 0 || lx > r.width || ly > r.height) return;
    if (Math.hypot(lx - last.x, ly - last.y) < r.width / 7) return;
    last = { x: lx, y: ly };
    box.classList.add('active');
    const lead = imgs[gi % imgs.length];
    const tail = imgs[(gi - 5 + imgs.length * 2) % imgs.length];
    lead.style.left = `${lx}px`; lead.style.top = `${ly}px`; lead.style.zIndex = String(gi);
    lead.classList.remove('off'); void lead.offsetWidth; lead.classList.add('on');
    if (tail && tail !== lead) { tail.classList.remove('on'); tail.classList.add('off'); }
    gi++;
  };
  const out = () => { imgs.forEach((im) => { im.classList.remove('on'); im.classList.add('off'); }); box.classList.remove('active'); last = { x: -999, y: -999 }; };
  box.addEventListener('pointermove', move);
  box.addEventListener('pointerleave', out);
  return () => { box.removeEventListener('pointermove', move); box.removeEventListener('pointerleave', out); };
}

export function createSheet({ getLenis, reduced, media = {}, accentFor, onState }) {
  const state = { v: 0, open: null };
  const root = document.createElement('div');
  root.className = 'ix-sheet-root';
  root.hidden = true;
  root.innerHTML = `
    <div class="ix-scrim"></div>
    <div class="ix-sheet" role="dialog" aria-modal="true" aria-labelledby="ix-sheet-title" style="--gap:${SHEET.topGap};--rad:${SHEET.radius}px">
      <div class="ix-sheet-scroll" data-lenis-prevent tabindex="-1">
        <div class="ix-sheet-bar"><button class="ix-close ix-glass" type="button" aria-label="Close">${icon('close')}</button></div>
        <div class="ix-sheet-inner"></div>
      </div>
    </div>`;
  document.body.appendChild(root);
  const sheet = root.querySelector('.ix-sheet');
  const scroller = root.querySelector('.ix-sheet-scroll');
  const inner = root.querySelector('.ix-sheet-inner');
  const scrim = root.querySelector('.ix-scrim');
  const closeBtn = root.querySelector('.ix-close');
  let opener = null, unReveal = () => {}, tl = null;

  /* ---- scroll lock ----
     The sheet's own scroller must never be blocked, whatever else on the page
     listens for wheel/touch (Lenis, the lock below, site handlers). So:
     1. wheel/touch events stop at the scroller and never reach window;
     2. anything that still reaches window from outside the sheet is cancelled;
     3. if a wheel tick somehow did not move the scroller although it could
        move, it is applied by hand on the next frame. */
  const inSheet = (e) => (e.composedPath ? e.composedPath().includes(scroller) : scroller.contains(e.target));
  const swallow = (e) => { if (!inSheet(e) && e.cancelable) e.preventDefault(); };
  const stopHere = (e) => e.stopPropagation();
  const onWheel = (e) => {
    e.stopPropagation();
    if (e.ctrlKey) return; // pinch-zoom
    const before = scroller.scrollTop;
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? scroller.clientHeight : 1;
    const dy = e.deltaY * unit;
    requestAnimationFrame(() => {
      const max = scroller.scrollHeight - scroller.clientHeight;
      const room = dy > 0 ? before < max - 1 : before > 0;
      if (scroller.scrollTop === before && room && Math.abs(dy) > 0) scroller.scrollTop = before + dy;
    });
  };
  scroller.addEventListener('wheel', onWheel, { passive: true });
  scroller.addEventListener('touchmove', stopHere, { passive: true });
  function lock(on) {
    const L = getLenis && getLenis();
    document.documentElement.classList.toggle('ix-locked', on);
    if (on) {
      L && L.stop();
      window.addEventListener('wheel', swallow, { passive: false });
      window.addEventListener('touchmove', swallow, { passive: false });
    } else {
      L && L.start();
      window.removeEventListener('wheel', swallow);
      window.removeEventListener('touchmove', swallow);
    }
  }

  /* ---- focus trap + escape ---- */
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...sheet.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === closeBtn);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!sheet.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  }

  function open(id, from) {
    const it = byId(id);
    if (!it || state.open) return;
    state.open = id;
    opener = from || document.activeElement;
    const accent = accentFor ? accentFor(id) : '#fff';
    sheet.style.setProperty('--acc', accent);
    sheet.classList.toggle('is-pixel', !!it.pixel);
    inner.innerHTML = render(it, media, accent);
    unReveal = wireReveal(inner.querySelector('[data-reveal]'));
    scroller.scrollTop = 0;
    root.hidden = false;
    lock(true);
    document.addEventListener('keydown', onKey, true);
    onState && onState(true, id);
    tl && tl.kill();
    const calm = reduced();
    tl = gsap.timeline();
    if (calm) {
      tl.fromTo(sheet, { yPercent: 0, opacity: 0 }, { opacity: 1, duration: 0.25 }, 0)
        .fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0)
        .to(state, { v: 1, duration: 0.01 }, 0);
    } else {
      tl.fromTo(sheet, { yPercent: 102, opacity: 1 }, { yPercent: 0, duration: SHEET.openDur, ease: 'power3.out' }, 0.04)
        .fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.out' }, 0)
        .to(state, { v: 1, duration: SHEET.openDur * 1.15, ease: 'power2.out' }, 0)
        // drop the compositing hint once it has landed; a lingering transform
        // layer around a scroller is a known source of stuck scrolling in Safari
        .set(sheet, { clearProps: 'transform', willChange: 'auto' });
    }
    // focus the scroll area itself: arrow keys, Space and Page Down then scroll
    // the sheet (Space on the close button would close it); Tab reaches the X
    requestAnimationFrame(() => scroller.focus({ preventScroll: true }));
  }

  function close() {
    if (!state.open) return;
    const calm = reduced();
    tl && tl.kill();
    tl = gsap.timeline({
      onComplete: () => {
        root.hidden = true;
        inner.innerHTML = '';
        unReveal();
        state.open = null;
        lock(false);
        onState && onState(false);
        if (opener && opener.focus) opener.focus({ preventScroll: true });
      },
    });
    document.removeEventListener('keydown', onKey, true);
    if (calm) {
      tl.to(sheet, { opacity: 0, duration: 0.2 }, 0).to(scrim, { opacity: 0, duration: 0.2 }, 0).to(state, { v: 0, duration: 0.01 }, 0);
    } else {
      tl.to(sheet, { yPercent: 102, duration: SHEET.closeDur, ease: 'power3.in' }, 0)
        .to(scrim, { opacity: 0, duration: SHEET.closeDur, ease: 'power1.in' }, 0.05)
        .to(state, { v: 0, duration: SHEET.closeDur * 1.4, ease: 'power2.inOut' }, 0.05);
    }
  }

  closeBtn.addEventListener('click', close);
  scrim.addEventListener('click', close);

  return {
    state, open, close,
    destroy() {
      tl && tl.kill();
      if (state.open) lock(false);
      document.removeEventListener('keydown', onKey, true);
      unReveal();
      scroller.removeEventListener('wheel', onWheel);
      scroller.removeEventListener('touchmove', stopHere);
      root.remove();
    },
  };
}
