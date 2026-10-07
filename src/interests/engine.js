/* =====================================================================
   INTERESTS — scroll engine
   One full-viewport canvas draws whichever scene is on screen (two during
   a transition). The scroll position is the only input: it picks the
   scene, its progress p ∈ [0,1], and the transition mix. Everything runs
   from one ticker callback — the site's shared loop, or GSAP's ticker in
   the standalone demo — and only transform/opacity are written to the DOM.

   mountInterests(host, {
     ticker:  (fn) => unsubscribe   // fn(timeSec, dtSec); defaults to gsap.ticker
     lenis:   () => Lenis | null    // for scrollTo and the sheet's scroll lock
     reduced: () => boolean         // prefers-reduced-motion or a site switch
     media:   { gallery: [], travel: { cover, caption, grid: [] }, slots: { 'editing-1': src } }
     links:   [{ label, href }]     // buttons on the closing card
     onNavigate: (href) => void     // SPA navigation for those links
   }) → { goTo(id, instant), destroy() }
   ===================================================================== */
import { gsap } from 'gsap';
import { SCENES, INTRO_LEN, OUTRO_LEN, TRANSITION, CARD_FADE, QUALITY, GLASS } from './config.js';
import { clamp, inv, ease, approach, lerp, hex2rgb, rgb, mixRGB, smooth } from './util.js';
import { INTERESTS, INTRO, OUTRO, byId } from './content.js';
import { icon } from './icons.js';
import { ensureGlassDefs } from './glass.js';
import { createSheet } from './sheet.js';
import { drawCrane } from './crane.js';
import { TRANSITIONS } from './transitions.js';

import traveling from './scenes/traveling.js';
import photography from './scenes/photography.js';
import editing from './scenes/editing.js';
import gaming from './gaming/index.js';
import cinema from './scenes/cinema.js';
import reading from './scenes/reading.js';
import swimming from './scenes/swimming.js';
import food from './scenes/food.js';
import teaching from './scenes/teaching.js';

const FACTORIES = { traveling, photography, editing, gaming, cinema, reading, swimming, food, teaching };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function grainTile() {
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const x = c.getContext('2d');
  const im = x.createImageData(160, 160);
  for (let i = 0; i < im.data.length; i += 4) {
    const v = Math.random() * 255;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
    im.data[i + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return c.toDataURL();
}

function ensureFont() {
  if (document.querySelector('link[data-ix-font]')) return null;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap';
  l.dataset.ixFont = '1';
  document.head.appendChild(l);
  return l;
}

export function mountInterests(host, opts = {}) {
  const o = {
    ticker: null,
    lenis: () => null,
    reduced: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    media: {},
    links: [],
    onNavigate: null,
    ...opts,
  };
  const N = SCENES.length;
  const injected = [ensureGlassDefs(), ensureFont()].filter(Boolean);

  /* ------------------------------------------------------------ DOM */
  host.classList.add('ix-host');
  host.innerHTML = `
    <canvas class="ix-canvas" aria-hidden="true"></canvas>
    <div class="ix-grain" aria-hidden="true"></div>
    <div class="ix-vignette" aria-hidden="true"></div>
    <header class="ix-intro">
      <p class="ix-eyebrow">${esc(INTRO.eyebrow)}</p>
      <h1>${esc(INTRO.title)}</h1>
      <p class="ix-intro-sub">${esc(INTRO.sub)}</p>
      <span class="ix-cue" aria-hidden="true"><i></i>scroll</span>
    </header>
    <div class="ix-track">
      <div class="ix-sec ix-sec-intro"></div>
      ${SCENES.map((sc, i) => {
        const it = byId(sc.id);
        return `<section class="ix-sec" id="${sc.id}" aria-labelledby="ix-t-${sc.id}">
          <article class="ix-card ix-glass side-${sc.side}${sc.m === 'top' ? ' m-top' : ''}${it.pixel ? ' is-pixel' : ''}" data-id="${sc.id}" style="--acc:${sc.accent}">
            <p class="ix-eyebrow"><span class="ix-num">${it.n}</span>${icon(it.icon)}<span>${esc(it.title)}</span></p>
            <h2 id="ix-t-${sc.id}">${esc(it.scene)}</h2>
            <p class="ix-sub">${esc(it.sub)}</p>
            <button class="ix-expand" type="button" aria-haspopup="dialog">Expand ${icon('expand')}</button>
          </article>
          ${it.pixel ? `<button class="ix-mini ix-glass" type="button" data-id="${sc.id}" aria-haspopup="dialog"><span class="ix-px">1UP</span>${esc(it.title)} <b>Expand</b>${icon('expand')}</button>` : ''}
        </section>`;
      }).join('')}
      <div class="ix-sec ix-sec-outro"></div>
    </div>
    <nav class="ix-rail ix-glass" aria-label="Interests chapters">
      ${SCENES.map((sc, i) => {
        const it = byId(sc.id);
        return `<button type="button" data-go="${sc.id}" aria-label="${esc(it.title)}" style="--acc:${sc.accent}">${icon(it.icon)}<span class="ix-tip">${esc(it.title)}</span><i></i></button>`;
      }).join('')}
    </nav>
    <div class="ix-outro ix-glass">
      <h2>${esc(OUTRO.title)}</h2>
      <p>${esc(OUTRO.sub)}</p>
      <div class="ix-outro-row">
        <button type="button" class="ix-btn ix-glass" data-top>${icon('up')} Back to the top</button>
        ${o.links.map((l) => `<a class="ix-btn ix-glass" href="${esc(l.href)}" data-nav>${esc(l.label)}</a>`).join('')}
      </div>
    </div>`;

  const cv = host.querySelector('.ix-canvas');
  const ctx = cv.getContext('2d');
  const intro = host.querySelector('.ix-intro');
  const outro = host.querySelector('.ix-outro');
  const secIntro = host.querySelector('.ix-sec-intro');
  const secOutro = host.querySelector('.ix-sec-outro');
  const secs = SCENES.map((sc) => host.querySelector(`#${sc.id}`));
  const cards = SCENES.map((sc) => host.querySelector(`.ix-card[data-id="${sc.id}"]`));
  const minis = SCENES.map((sc) => host.querySelector(`.ix-mini[data-id="${sc.id}"]`));
  const railBtns = [...host.querySelectorAll('.ix-rail button')];
  host.querySelector('.ix-grain').style.backgroundImage = `url(${grainTile()})`;

  /* ------------------------------------------------------------ sheet */
  const sheet = createSheet({
    getLenis: o.lenis,
    reduced: o.reduced,
    media: o.media,
    accentFor: (id) => SCENES.find((s) => s.id === id)?.accent || '#fff',
    onState: (open) => host.classList.toggle('ix-sheet-open', open),
  });

  /* ------------------------------------------------------------ scenes */
  const scenes = SCENES.map((sc) => {
    const s = FACTORIES[sc.id]();
    s.built = false;
    return s;
  });

  /* ------------------------------------------------------------ layout */
  let W = 0, H = 0, dpr = 1, vh = 0, Tpx = 0, hostTop = 0;
  const starts = new Array(N).fill(0), lens = new Array(N).fill(0);
  let endY = 0, totalY = 0, introPx = 0;
  const scratch = [];

  function env() {
    return { W, H, dpr: Math.min(dpr, QUALITY.bakeDPR), mobile: W < 720, pscale: (W < 720 ? 0.5 : 1) * QUALITY.particleScale };
  }

  function getScratch(k) {
    let c = scratch[k];
    if (!c) { c = document.createElement('canvas'); c.x = c.getContext('2d'); scratch[k] = c; }
    if (c.width !== cv.width || c.height !== cv.height) { c.width = cv.width; c.height = cv.height; }
    c.x.setTransform(1, 0, 0, 1, 0, 0);
    c.x.clearRect(0, 0, c.width, c.height);
    c.x.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.x.globalAlpha = 1;
    c.x.globalCompositeOperation = 'source-over';
    return c;
  }

  function measure() {
    vh = window.innerHeight;
    introPx = INTRO_LEN * vh;
    Tpx = TRANSITION * vh;
    let y = introPx;
    SCENES.forEach((sc, i) => { starts[i] = y; lens[i] = sc.len * vh; y += lens[i]; });
    endY = y;
    totalY = y + OUTRO_LEN * vh;
    secIntro.style.height = `${introPx}px`;
    secs.forEach((el, i) => { el.style.height = `${lens[i]}px`; });
    secOutro.style.height = `${OUTRO_LEN * vh + vh}px`;
    hostTop = host.getBoundingClientRect().top + window.scrollY;
  }

  function sizeCanvas() {
    const w = cv.clientWidth || window.innerWidth;
    const h = cv.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, W < 720 ? 1.25 : QUALITY.maxDPR);
    const changed = Math.abs(w - W) > 0.5 || Math.abs(h - H) > 0.5;
    W = w; H = h;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    if (changed) scenes.forEach((s) => { if (s.built) { s.dispose && s.dispose(); s.built = false; } });
  }

  function ensure(i) {
    const s = scenes[i];
    if (!s || s.built) return false;
    s.build(env());
    s.built = true;
    return true;
  }

  let lastW = 0, lastH = 0, rzT = 0;
  function onResize() {
    clearTimeout(rzT);
    rzT = setTimeout(() => {
      const w = window.innerWidth, h = window.innerHeight;
      // ignore mobile URL-bar wobble: only a width change or a big height change relayouts
      if (Math.abs(w - lastW) < 1 && Math.abs(h - lastH) < 140) return;
      lastW = w; lastH = h;
      measure();
      sizeCanvas();
      dirty = true;
    }, 160);
  }

  /* ------------------------------------------------------------ input */
  let tmx = 0.5, tmy = 0.5, mx = 0.5, my = 0.5, ptr = false, pxX = -999, pxY = -999;
  const onMove = (e) => {
    if (e.pointerType === 'touch') return;
    tmx = e.clientX / Math.max(1, W); tmy = e.clientY / Math.max(1, H);
    pxX = e.clientX; pxY = e.clientY; ptr = true;
  };
  const onLeave = () => { ptr = false; tmx = 0.5; tmy = 0.5; pxX = pxY = -999; };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('resize', onResize);

  /* Arriving from another route, the page height has only just changed:
     Lenis still holds the previous page's scroll limit (so a jump gets clamped
     short — every link used to land in about the same scene) and the site's
     route swap can reset scroll right after mount. So: re-measure, make Lenis
     re-read the page, jump, and for instant jumps check again until it sticks. */
  let goT = [];
  function goTo(id, instant = false) {
    const k = SCENES.findIndex((s) => s.id === id);
    if (k < 0) return;
    goT.forEach(clearTimeout); goT = [];
    const target = () => {
      measure();
      const r = SCENES[k].rest;
      return hostTop + starts[k] + ((r[0] + r[1]) / 2) * lens[k];
    };
    const jump = () => {
      const y = target();
      const L = o.lenis && o.lenis();
      if (L) {
        L.resize && L.resize();
        L.scrollTo(y, { immediate: instant, duration: instant ? 0 : 1.8, force: true });
      } else window.scrollTo({ top: y, behavior: instant || o.reduced() ? 'auto' : 'smooth' });
      return y;
    };
    jump();
    if (instant) {
      for (const ms of [180, 450, 900]) {
        goT.push(setTimeout(() => { if (Math.abs(window.scrollY - target()) > 4) jump(); }, ms));
      }
    }
  }

  host.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) { goTo(go.dataset.go); return; }
    if (e.target.closest('[data-top]')) {
      const L = o.lenis && o.lenis();
      if (L) L.scrollTo(0, { duration: 2.2 }); else window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const nav = e.target.closest('[data-nav]');
    if (nav && o.onNavigate) { e.preventDefault(); o.onNavigate(nav.getAttribute('href')); return; }
    const card = e.target.closest('.ix-card, .ix-mini');
    if (card) sheet.open(card.dataset.id, card.querySelector('.ix-expand') || card);
  });

  /* ------------------------------------------------------------ frame */
  let vel = 0, lastY = 0, yFrozen = 0, dirty = true, calmKey = '', fast = false, slowSince = 0;
  let lastCardA = new Array(N).fill(-1), lastMini = new Array(N).fill(-1);
  let lastIntro = -1, lastOutro = -1, lastRail = -2, destroyed = false, frameNo = 0;
  const grades = SCENES.map((s) => hex2rgb(s.grade));

  function sceneState(k, p, t, dt, calm) {
    return {
      i: k, id: SCENES[k].id, p, t, dt, W, H, dpr, vel, calm,
      mx, my, ptr, px: pxX, py: pxY,
      sheet: sheet.state.v, mobile: W < 720,
      pscale: (W < 720 ? 0.5 : 1) * QUALITY.particleScale,
    };
  }

  function cardAlpha(k, y, calm, cur, nxt) {
    if (k !== cur && k !== nxt) return [0, 0];
    const pk = (y - starts[k]) / lens[k];
    const [r0, r1] = SCENES[k].rest;
    if (calm) {
      const a = k === cur ? 1 - ease(0, 1, (y - (starts[k + 1] ?? 1e12) + Tpx) / Tpx) : ease(0.4, 1, (y - starts[k] + Tpx) / Tpx);
      return [clamp(a), 0];
    }
    const a = ease(r0 - CARD_FADE, r0, pk) * (1 - ease(r1, r1 + CARD_FADE, pk));
    const dy = (1 - ease(r0 - CARD_FADE, r0, pk)) * 38 - ease(r1, r1 + CARD_FADE, pk) * 38;
    return [a, dy];
  }

  function updateDOM(y, cur, nxt, tt, calm) {
    for (let k = 0; k < N; k++) {
      const [a, dy] = cardAlpha(k, y, calm, cur, nxt);
      const q = Math.round(a * 400) / 400;
      if (q !== lastCardA[k]) {
        lastCardA[k] = q;
        const c = cards[k];
        c.style.opacity = q.toFixed(3);
        c.style.transform = `translate3d(0,${dy.toFixed(1)}px,0)`;
        c.style.visibility = q < 0.01 ? 'hidden' : 'visible';
        c.classList.toggle('is-live', q > 0.6);
      }
      if (minis[k]) {
        const pk = (y - starts[k]) / lens[k];
        const r1 = SCENES[k].rest[1] + CARD_FADE;
        const hand = 1 - Tpx / lens[k];
        const m = calm ? 0 : ease(r1, r1 + 0.03, pk) * (1 - ease(hand - 0.04, hand - 0.005, pk));
        const mq = Math.round(m * 100) / 100;
        if (mq !== lastMini[k]) {
          lastMini[k] = mq;
          minis[k].style.opacity = mq;
          minis[k].style.visibility = mq < 0.01 ? 'hidden' : 'visible';
          minis[k].style.transform = `translate3d(0,${((1 - mq) * 16).toFixed(1)}px,0)`;
        }
      }
    }
    const ia = Math.round((1 - ease(0.04, 0.5, y / introPx)) * 200) / 200;
    if (ia !== lastIntro) {
      lastIntro = ia;
      intro.style.opacity = ia;
      intro.style.transform = `translate3d(0,${((1 - ia) * -40).toFixed(1)}px,0)`;
      intro.style.visibility = ia < 0.01 ? 'hidden' : 'visible';
    }
    const oa = Math.round(ease(endY - 0.25 * vh, endY + 0.25 * vh, y) * 200) / 200;
    if (oa !== lastOutro) {
      lastOutro = oa;
      outro.style.opacity = oa;
      outro.style.transform = `translate3d(-50%,${((1 - oa) * 30).toFixed(1)}px,0)`;
      outro.style.visibility = oa < 0.01 ? 'hidden' : 'visible';
      host.classList.toggle('ix-at-end', oa > 0.5);
    }
    const active = y < starts[0] - Tpx * 0.5 ? -1 : (nxt >= 0 && tt > 0.5 ? nxt : cur);
    if (active !== lastRail) {
      lastRail = active;
      railBtns.forEach((b, k) => {
        b.classList.toggle('on', k === active);
        if (k === active) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      host.classList.toggle('ix-rail-on', active >= 0);
    }
    if (active >= 0 && (frameNo & 3) === 0) {
      const pk = clamp((y - starts[active]) / lens[active]);
      railBtns[active].style.setProperty('--p', pk.toFixed(3));
    }
  }

  let restingBehindSheet = false;
  function frame(time, dt) {
    if (destroyed || !W) return;
    /* With the sheet fully open the scene is hidden behind it: draw one last
       frame and then stop, so the page's only moving part is the sheet's own
       scroll (this is what made sheet scrolling lag in heavier browsers). */
    const full = sheet.state.open && sheet.state.v >= 0.999;
    if (full && restingBehindSheet) return;
    if (full !== host.classList.contains('ix-sheet-full')) host.classList.toggle('ix-sheet-full', full);
    restingBehindSheet = full;
    frameNo++;
    const calm = o.reduced();
    const yRaw = window.scrollY - hostTop;
    const y = sheet.state.open ? yFrozen : yRaw;
    if (!sheet.state.open) yFrozen = yRaw;
    const dts = Math.max(dt, 1e-3);
    vel = lerp(vel, (y - lastY) / dts, approach(0.15, dt));
    lastY = y;
    const k = approach(0.35, dt);
    mx += (tmx - mx) * k; my += (tmy - my) * k;

    /* liquid glass: refraction at rest, blur-only while flying (T3) */
    const now = performance.now();
    if (Math.abs(vel) > GLASS.fastVelocity) { slowSince = 0; if (!fast) { fast = true; host.classList.add('ix-fast'); } }
    else if (fast) { if (!slowSince) slowSince = now; else if (now - slowSince > GLASS.settleMs) { fast = false; host.classList.remove('ix-fast'); } }

    /* which scene, and are we crossing into the next? */
    let i = 0;
    while (i < N - 1 && y >= starts[i + 1]) i++;
    let j = -1, tt = 0;
    if (i < N - 1 && y > starts[i + 1] - Tpx) { j = i + 1; tt = clamp((y - (starts[i + 1] - Tpx)) / Tpx); }

    let built = ensure(i);
    if (j >= 0) built = ensure(j) || built;
    /* bake ahead in quiet frames, one scene at a time; drop far-away ones */
    if (!built && (frameNo % 20) === 0) {
      for (const n of [i + 1, i - 1, i + 2]) { if (n >= 0 && n < N && !scenes[n].built) { ensure(n); break; } }
      scenes.forEach((s, n) => { if (s.built && Math.abs(n - i) > QUALITY.keepBaked + 1) { s.dispose && s.dispose(); s.built = false; } });
    }

    updateDOM(y, i, j, tt, calm);

    /* calm mode: one still per scene at its rest pose, crossfaded */
    let pA = clamp((y - starts[i]) / lens[i]);
    let tA = time, dA = dt;
    if (calm) {
      const r = SCENES[i].rest;
      pA = (r[0] + r[1]) / 2;
      tA = 12; dA = 0;
      const key = `${i}|${j}|${tt.toFixed(3)}|${sheet.state.v.toFixed(3)}|${W}|${H}|${dirty}`;
      if (key === calmKey) return;
      calmKey = key;
    }
    dirty = false;
    const sA = sceneState(i, pA, tA, dA, calm);
    let sB = null;
    if (j >= 0) {
      const pB = calm ? (SCENES[j].rest[0] + SCENES[j].rest[1]) / 2 : 0;
      sB = sceneState(j, pB, tA, dA, calm);
    }
    if (!calm) {
      scenes[i].update && scenes[i].update(sA);
      if (sB) scenes[j].update && scenes[j].update(sB);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const drawA = (c) => scenes[i].draw(c, sA);
    const drawB = (c) => scenes[j].draw(c, sB);

    if (j < 0) drawA(ctx);
    else if (calm) {
      drawA(ctx);
      const b = getScratch(0);
      drawB(b.x);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = smooth(tt);
      ctx.drawImage(b, 0, 0);
      ctx.globalAlpha = 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      TRANSITIONS[i](ctx, tt, drawA, drawB, { W, H, dpr, scratch: getScratch, sA, sB, A: scenes[i], B: scenes[j], time });
    }

    /* the paper crane */
    if (!calm) {
      const pose = j >= 0 && tt > 0.5 ? scenes[j].crane && scenes[j].crane(sB) : scenes[i].crane && scenes[i].crane(sA);
      if (pose) {
        const fade = j >= 0 ? Math.abs(tt - 0.5) * 2 : 1;
        drawCrane(ctx, pose.x, pose.y, pose.size, { ...pose, a: (pose.a ?? 1) * fade * (1 - sheet.state.v * 0.7) });
      }
    }

    /* colour-grade bridge: the light shifts toward the next scene before the geometry does */
    if (i < N - 1) {
      const u = inv(starts[i + 1] - Tpx - 0.45 * vh, starts[i + 1], y);
      if (u > 0 && u < 1) {
        const c = mixRGB(grades[i], grades[i + 1], smooth(u));
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = rgb(c, 0.3 * Math.sin(u * Math.PI));
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }

  /* ------------------------------------------------------------ start */
  lastW = window.innerWidth; lastH = window.innerHeight;
  measure();
  sizeCanvas();
  ensure(0);
  const off = o.ticker
    ? o.ticker(frame)
    : (() => { const f = (time, deltaTime) => frame(time, deltaTime / 1000); gsap.ticker.add(f); return () => gsap.ticker.remove(f); })();

  /* fonts and late layout (route curtain, images above) can move the host */
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { hostTop = host.getBoundingClientRect().top + window.scrollY; }) : null;
  ro && ro.observe(document.body);

  return {
    goTo,
    open: (id) => sheet.open(id),
    relayout() { measure(); sizeCanvas(); dirty = true; },
    destroy() {
      destroyed = true;
      goT.forEach(clearTimeout);
      off && off();
      ro && ro.disconnect();
      clearTimeout(rzT);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', onResize);
      sheet.destroy();
      scenes.forEach((s) => s.built && s.dispose && s.dispose());
      injected.forEach((n) => n.remove());
      host.innerHTML = '';
      host.classList.remove('ix-host', 'ix-fast', 'ix-sheet-open', 'ix-at-end', 'ix-rail-on');
    },
  };
}
