import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Mark, ThemeIcon, MenuIcon, Ico } from './icons.jsx';
import { useApp } from '../context/AppState.jsx';
import { onFrame } from '../lib/loop.js';
import { scrollTop } from '../lib/motion.js';
import Sky from '../lib/sky.js';
import { Aud, Term } from '../lib/terminal.js';
import { profile, routes } from '../data/site.js';

const lerp = (a, b, k) => a + (b - a) * k;
/* time-based easing: the same feel at 30fps and at 144fps */
const approach = (sec, dt) => 1 - Math.pow(0.0015, dt / sec);

/* ============================ cursor ============================ */
export function Cursor() {
  const dot = useRef(null);
  const ring = useRef(null);

  useEffect(() => {
    const cp = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const rp = { ...cp };
    let magnet = null;

    const onMove = (e) => {
      if (e.pointerType === 'mouse') document.body.classList.add('has-cursor');
      cp.x = e.clientX;
      cp.y = e.clientY;
      const fl = document.getElementById('flashlight');
      if (fl) {
        fl.style.setProperty('--fx', `${e.clientX}px`);
        fl.style.setProperty('--fy', `${e.clientY}px`);
      }
    };

    /* A magnetic element moves toward the cursor, which moves its own hit box,
       which changes what the cursor is over — so hit-testing cannot decide
       when to let go. Each capture records the element's REST rect (measured
       with the transform cleared) and the release test runs against that rect
       inflated by a margin, in the frame loop. Nothing oscillates because the
       geometry the test reads never moves. */
    const RELEASE_PAD = 16;
    let magnetRest = null;

    const release = () => {
      if (magnet) { magnet.style.transform = ''; magnet._mv = 0; }
      magnet = null;
      magnetRest = null;
    };

    const capture = (el) => {
      if (el === magnet) return;
      release();
      if (!el) return;
      const prev = el.style.transform;
      el.style.transform = 'none';
      const r = el.getBoundingClientRect();
      el.style.transform = prev;
      magnet = el;
      magnetRest = { l: r.left, t: r.top, r: r.right, b: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    };

    const HOT = 'a,button,[data-magnetic],.feat,.post,.wcard,.skill-card,.cs-panel';
    let hot = false;
    const onOver = (e) => {
      if (!e.target.closest) return;
      // only touch the class when the answer actually changes, or the ring
      // restarts its transition on every pointerover event
      const next = !!e.target.closest(HOT);
      if (next !== hot) { hot = next; ring.current?.classList.toggle('on', next); }
      const m = e.target.closest('[data-magnetic]');
      if (m) capture(m);
    };

    /* pointer-tracked specular highlight on the glass skill cards */
    const onSheen = (e) => {
      const c = e.target.closest ? e.target.closest('.skill-card') : null;
      if (!c) return;
      const r = c.getBoundingClientRect();
      const f = c.querySelector('.sheen');
      if (!f) return;
      f.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      f.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointermove', onSheen, { passive: true });
    document.addEventListener('pointerover', onOver);

    // last written transforms: identical strings are not written again, so a
    // resting cursor costs no style work at all
    let lastDot = '', lastRing = '', lastMag = '';
    const off = onFrame((t, dt) => {
      const k = approach(0.12, dt);
      rp.x = lerp(rp.x, cp.x, k);
      rp.y = lerp(rp.y, cp.y, k);

      if (magnet && (!magnet.isConnected ||
        cp.x < magnetRest.l - RELEASE_PAD || cp.x > magnetRest.r + RELEASE_PAD ||
        cp.y < magnetRest.t - RELEASE_PAD || cp.y > magnetRest.b + RELEASE_PAD)) {
        release();
      }

      let tx = cp.x;
      let ty = cp.y;
      if (magnet) {
        tx = magnetRest.cx;
        ty = magnetRest.cy;
        const mt = `translate(${(cp.x - tx) * 0.22}px,${(cp.y - ty) * 0.22}px)`;
        if (mt !== lastMag || magnet.style.transform !== mt) { magnet.style.transform = mt; lastMag = mt; }
        magnet._mv = 1;
      } else lastMag = '';

      const dt2 = `translate(${cp.x}px,${cp.y}px)`;
      if (dot.current && dt2 !== lastDot) { dot.current.style.transform = dt2; lastDot = dt2; }
      if (ring.current) {
        const m = magnet ? 0.6 : 0;
        const rt = `translate(${lerp(rp.x, tx, m)}px,${lerp(rp.y, ty, m)}px)`;
        if (rt !== lastRing) { ring.current.style.transform = rt; lastRing = rt; }
      }
    });

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointermove', onSheen);
      document.removeEventListener('pointerover', onOver);
      release();
      off();
    };
  }, []);

  return (
    <>
      <div id="cur-ring" ref={ring} aria-hidden="true" />
      <div id="cur-dot" ref={dot} aria-hidden="true" />
    </>
  );
}

/* ====================== body.scrolled flag ====================== */
export function ScrollFlag() {
  useEffect(() => {
    const h = () => {
      document.body.classList.toggle('scrolled', (window.scrollY || 0) > window.innerHeight * 0.14);
    };
    h();
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return null;
}

/* ============================ top bar ============================ */
export function TopBar({ onMenu }) {
  const { toggleTheme } = useApp();
  return (
    <header id="topbar">
      <Link className="brand" to="/" data-magnetic aria-label="Home">
        <Mark />
        <span className="brand-txt">{profile.short}</span>
      </Link>
      <div className="top-right">
        <button
          className="icon-btn theme-btn"
          onClick={toggleTheme}
          data-magnetic
          aria-label="Switch theme"
        >
          <ThemeIcon />
        </button>
        <button className="icon-btn menu-btn" onClick={onMenu} data-magnetic aria-label="Open menu">
          <MenuIcon />
        </button>
      </div>
    </header>
  );
}

/* ============================== dock ==============================
   macOS-style magnification on a plain pill.

   The one thing that matters: a magnified icon changes its own LAYOUT width
   (--s drives width/height), so growing one icon shifts its neighbours
   sideways. If the magnifier reads live bounding rects, scale feeds into
   position and position feeds back into scale, and the row shakes — worst
   exactly between two icons. So the distance field is measured from REST
   centres, captured once with every scale forced to 1 and remeasured only on
   resize. */
const DOCK_MAX = 0.88;   // peak extra scale
const DOCK_SIGMA = 84;   // falloff of the magnification, px
const NEAR_MARGIN = 14;  // how much nearer a challenger must be to steal the highlight

export function Dock({ onMenu, onFeatures, featOpen, featBtnRef }) {
  const inner = useRef(null);
  const { toggleTheme } = useApp();

  useEffect(() => {
    const host = inner.current;
    if (!host) return;
    const items = Array.from(host.querySelectorAll('.dk'));

    let rest = [];     // icon centre x, relative to the dock box, at rest
    let rects = [];    // icon boxes at rest, relative to the dock box
    let near = -1;     // which icon currently owns the highlight
    let active = false; // magnifying right now?
    let box = { w: 0, h: 0, left: 0, top: 0, bottom: 0 };

    const measure = () => {
      // force rest scale so the geometry we cache is the undisturbed one
      items.forEach((d) => { d.style.setProperty('--s', '1'); d._s = 1; d._t = 1; });
      const hr = host.getBoundingClientRect();
      box.w = hr.width;
      box.h = hr.height;
      rects = items.map((d) => {
        const b = d.getBoundingClientRect();
        return { l: b.left - hr.left, r: b.right - hr.left, t: b.top - hr.top, b: b.bottom - hr.top };
      });
      rest = rects.map((q) => (q.l + q.r) / 2);
      anchor();
    };

    /* Only the SIZE is cached; the position is re-derived, because the dock
       slides in on scroll without firing a resize. Both anchors are immune to
       magnification: #dock is centred with translateX(-50%) so its centre is
       always the viewport centre however wide the row grows, and the icons
       are flex-end aligned so they rise off a fixed bottom edge. */
    const anchor = () => {
      if (!box.w) return;
      box.bottom = host.getBoundingClientRect().bottom;
      box.top = box.bottom - box.h;
      box.left = window.innerWidth / 2 - box.w / 2;
    };

    const magnify = (x, y) => {
      anchor();
      /* The dock wakes only when the pointer touches an icon itself — not the
         pill around the icons, and not the air above it. Once awake it stays
         awake while the pointer is anywhere on the pill (which grows with the
         risen icons, so gaps between icons never drop it), and resets the
         moment the pointer leaves the pill's background. */
      const lx = x - box.left;
      const ly = y - box.top;
      if (!rects.length) return;
      const onIcon = rects.some((q) => lx >= q.l && lx <= q.r && ly >= q.t && ly <= q.b);
      const pill = host.getBoundingClientRect();
      const onPill = x >= pill.left && x <= pill.right && y >= pill.top && y <= pill.bottom;
      active = active ? onPill : onIcon;
      const inside = active;

      /* Which icon is "under" the cursor is decided here, by nearest rest
         centre, not by :hover. There is a 5px gap between icons, and in it
         :hover matches nothing — so the highlight and the tooltip blinked out
         and back as the cursor crossed, which reads as the dock being unable
         to decide what it is pointing at. Nearest-centre has no dead zone and,
         because the centres never move, no feedback either. */
      let best = Infinity;
      let cand = -1;
      items.forEach((d, i) => {
        if (!inside) { d._t = 1; return; }
        const dist = lx - rest[i];
        d._t = 1 + DOCK_MAX * Math.exp(-(dist * dist) / (2 * DOCK_SIGMA * DOCK_SIGMA));
        const ad = Math.abs(dist);
        if (ad < best) { best = ad; cand = i; }
      });

      if (!inside) {
        near = -1;
      } else if (near !== cand) {
        /* Hysteresis. Nearest-centre on its own has a knife edge exactly
           halfway between two icons, where a hand resting with half a pixel
           of tremor flips the selection every frame. A challenger has to be
           nearer by NEAR_MARGIN before it takes over, so the midpoint becomes
           a band the current pick simply holds. */
        const held = near < 0 ? Infinity : Math.abs(lx - rest[near]);
        if (best < held - NEAR_MARGIN) near = cand;
      }
      items.forEach((d, i) => d.classList.toggle('near', i === near));
    };

    measure();
    const onMove = (e) => magnify(e.clientX, e.clientY);
    const onResize = () => measure();
    const onLeave = () => { active = false; near = -1; items.forEach((d) => { d._t = 1; d.classList.remove('near'); }); };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('resize', onResize);
    // leaving the pill's background (or the window) resets the dock at once
    host.addEventListener('pointerleave', onLeave);
    document.documentElement.addEventListener('pointerleave', onLeave);

    const off = onFrame((t, dt) => {
      const k = approach(0.17, dt);
      items.forEach((d) => {
        if (Math.abs(d._s - d._t) < 0.002) return;
        d._s = lerp(d._s, d._t, k);
        d.style.setProperty('--s', d._s.toFixed(3));
      });
    });

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onResize);
      host.removeEventListener('pointerleave', onLeave);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      off();
    };
  }, []);

  return (
    <nav id="dock" aria-label="Primary">
      <div className="dock-in" ref={inner}>
        {routes.slice(0, 5).map((r) => (
          <NavLink
            className={({ isActive }) => `dk${isActive ? ' on' : ''}`}
            to={r.path}
            key={r.key}
            data-tip={r.label}
            aria-label={r.label}
            end={r.path === '/'}
          >
            <Ico name={r.key} />
          </NavLink>
        ))}
        <span className="dock-sep" />
        <button className="dk" onClick={toggleTheme} data-tip="Theme" aria-label="Switch theme">
          <ThemeIcon />
        </button>
        <button
          className={`dk${featOpen ? ' on' : ''}`}
          ref={featBtnRef}
          onClick={(e) => { e.stopPropagation(); onFeatures(); }}
          data-tip="Features"
          aria-label="Features"
        >
          <Ico name="features" />
        </button>
        <button className="dk" onClick={onMenu} data-tip="Menu" aria-label="Open menu">
          <MenuIcon />
        </button>
      </div>
    </nav>
  );
}

/* ====================== assistive-touch fan ======================
   CSS cos()/sin() is not dependable yet, so the ring positions are
   computed here and written as inline transforms. */
const FAN = [
  { fx: 'clear', label: 'Clear the sky', icon: 'clear' },
  { fx: 'flash', label: 'Flashlight', icon: 'flash' },
  { fx: 'audio', label: 'Ambient audio', icon: 'audio' },
  { fx: 'term', label: 'Terminal', icon: 'term' },
  { fx: 'motion', label: 'Reduce motion', icon: 'motion' },
];

export function AssistMenu({ open, close, anchorRef }) {
  const { skyClear, setClear, features, toggleFeature, setTermOpen } = useApp();
  const [label, setLabel] = useState('');
  const [pos, setPos] = useState({ left: 0, bottom: 0 });
  const [spread, setSpread] = useState([]);

  /* radius and angles depend on viewport width, so recompute on resize */
  useEffect(() => {
    const layout = () => {
      const R = window.innerWidth < 760 ? 88 : 108;
      setSpread(
        FAN.map((_, i) => {
          const a = ((202 + i * 34) * Math.PI) / 180;
          return { x: Math.cos(a) * R, y: Math.sin(a) * R };
        })
      );
    };
    layout();
    window.addEventListener('resize', layout);
    return () => window.removeEventListener('resize', layout);
  }, []);

  /* the fan should radiate from the Features button, not the dock centre */
  useEffect(() => {
    if (!open) { setLabel(''); return; }
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ left: r.left + r.width / 2, bottom: window.innerHeight - r.top + 12 });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const away = (e) => {
      if (!e.target.closest('#assist') && e.target !== anchorRef.current && !anchorRef.current?.contains(e.target)) close();
    };
    document.addEventListener('click', away);
    return () => document.removeEventListener('click', away);
  }, [open, close, anchorRef]);

  const active = {
    clear: skyClear,
    flash: features.flash,
    audio: features.audio,
    term: false,
    motion: features.nomotion,
  };

  const run = (fx) => {
    if (fx === 'clear') { close(); setClear(!skyClear, true); return; }
    if (fx === 'term') { close(); Aud.unlock(); Term.show(); setTermOpen(true); return; }
    if (fx === 'flash') return toggleFeature('flash');
    if (fx === 'audio') return toggleFeature('audio');
    if (fx === 'motion') return toggleFeature('nomotion');
  };

  return (
    <div
      id="assist"
      className={open ? 'open' : ''}
      aria-hidden={!open}
      style={{ left: `${pos.left}px`, bottom: `${pos.bottom}px` }}
    >
      {/* The label is tracked on the ring, not on each button. Per-button
          enter/leave made it blink every time the cursor crossed the gap
          between two buttons; here it only clears when the ring itself is
          left, and only changes when a different button is actually under
          the cursor. */}
      <div
        className="assist-ring"
        onPointerMove={(e) => {
          const b = e.target.closest?.('.asb');
          const next = b ? b.dataset.label : label;
          if (next !== label) setLabel(next);
        }}
        onPointerLeave={() => setLabel('')}
      >
        {FAN.map((f, i) => (
          <button
            className={`asb${active[f.fx] ? ' on' : ''}`}
            key={f.fx}
            tabIndex={open ? 0 : -1}
            aria-label={f.label}
            style={{
              transform: open && spread[i]
                ? `translate(${spread[i].x}px,${spread[i].y}px) scale(1)`
                : undefined,
            }}
            data-label={f.label}
            onClick={() => run(f.fx)}
          >
            <Ico name={f.icon} />
          </button>
        ))}
      </div>
      <span className={`assist-label mono${label ? ' show' : ''}`}>{label}</span>
    </div>
  );
}

/* ========================= back to top =========================
   The button is a spaceship: it lights its engine, the screen fills
   with velocity streaks, and the page is already moving by the time
   the flame is up. */
export function BackToTop() {
  const btn = useRef(null);
  const streaks = useRef(null);
  const [bars] = useState(() =>
    Array.from({ length: 26 }, () => ({
      left: `${Math.random() * 100}%`,
      height: `${40 + Math.random() * 130}px`,
      animationDelay: `${-Math.random() * 0.5}s`,
      animationDuration: `${0.28 + Math.random() * 0.4}s`,
    }))
  );

  const launch = () => {
    const b = btn.current;
    if (!b || b.classList.contains('launch')) return;
    b.classList.add('launch');
    streaks.current?.classList.add('on');
    Aud.unlock();
    Aud.zap();
    Sky.burstComets(2);
    setTimeout(() => scrollTop(false), 240);
    setTimeout(() => streaks.current?.classList.remove('on'), 1100);
    setTimeout(() => b.classList.remove('launch'), 1500);
  };

  return (
    <>
      <button id="totop" ref={btn} onClick={launch} aria-label="Back to top">
        <svg className="ship" viewBox="0 0 40 60" aria-hidden="true">
          <g className="ship-body">
            <path className="hull" d="M20 2c7 8 10 18 10 28v10H10V30C10 20 13 10 20 2Z" />
            <path className="fin" d="M10 30 2 46l8-4zM30 30l8 16-8-4z" />
            <circle className="port" cx="20" cy="24" r="5" />
            <path className="nose" d="M20 2c3 4 5 8 6 12H14c1-4 3-8 6-12Z" />
          </g>
          <g className="flame">
            <path d="M14 40h12l-6 16z" />
            <path className="f2" d="M16.5 40h7l-3.5 10z" />
          </g>
        </svg>
        <Ico name="up" className="arrowup" />
      </button>
      <div className="streaks" ref={streaks} aria-hidden="true">
        {bars.map((s, i) => <i style={s} key={i} />)}
      </div>
    </>
  );
}

/* ============================= toast ============================= */
export function Toast() {
  const { toastMsg } = useApp();
  return (
    <div id="toast" className={toastMsg ? 'on' : ''} role="status">
      {toastMsg}
    </div>
  );
}
