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

    const HOT = 'a,button,[data-magnetic],.feat,.post,.wcard,.skill-card,.cs-panel';
    const onOver = (e) => {
      if (!e.target.closest) return;
      ring.current?.classList.toggle('on', !!e.target.closest(HOT));
      magnet = e.target.closest('[data-magnetic]');
    };
    const onOut = (e) => {
      const m = e.target.closest ? e.target.closest('[data-magnetic]') : null;
      if (m && m._mv) { m.style.transform = ''; m._mv = 0; }
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
    document.addEventListener('pointerout', onOut);

    const off = onFrame((t, dt) => {
      const k = approach(0.12, dt);
      rp.x = lerp(rp.x, cp.x, k);
      rp.y = lerp(rp.y, cp.y, k);
      let tx = cp.x;
      let ty = cp.y;
      if (magnet && magnet.isConnected) {
        const r = magnet.getBoundingClientRect();
        tx = r.left + r.width / 2;
        ty = r.top + r.height / 2;
        magnet.style.transform = `translate(${(cp.x - tx) * 0.22}px,${(cp.y - ty) * 0.22}px)`;
        magnet._mv = 1;
      }
      if (dot.current) dot.current.style.transform = `translate(${cp.x}px,${cp.y}px)`;
      if (ring.current) {
        const m = magnet ? 0.6 : 0;
        ring.current.style.transform = `translate(${lerp(rp.x, tx, m)}px,${lerp(rp.y, ty, m)}px)`;
      }
    });

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointermove', onSheen);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
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
   macOS-style magnification, but only once the pointer is actually
   inside the dock's own box — a wide radius made it twitch from far
   away. The scale eases on a time basis so it glides rather than
   snapping to the cursor. */
export function Dock({ onMenu, onFeatures, featOpen, featBtnRef }) {
  const inner = useRef(null);
  const { toggleTheme } = useApp();

  useEffect(() => {
    const host = inner.current;
    if (!host) return;
    const items = Array.from(host.querySelectorAll('.dk'));
    items.forEach((d) => { d._s = 1; d._t = 1; });

    const magnify = (x, y) => {
      const r = host.getBoundingClientRect();
      const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      items.forEach((d) => {
        if (!inside) { d._t = 1; return; }
        const b = d.getBoundingClientRect();
        const dist = Math.abs(x - (b.left + b.width / 2));
        d._t = 1 + 0.88 * Math.exp(-(dist * dist) / (2 * 84 * 84));
      });
    };

    const onMove = (e) => magnify(e.clientX, e.clientY);
    const onLeave = () => items.forEach((d) => { d._t = 1; });
    window.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave);

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
      host.removeEventListener('pointerleave', onLeave);
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
      <div className="assist-ring">
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
            onPointerEnter={() => setLabel(f.label)}
            onPointerLeave={() => setLabel('')}
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
