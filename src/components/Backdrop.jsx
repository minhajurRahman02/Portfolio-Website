import { useEffect, useRef } from 'react';
import Sky from '../lib/sky.js';
import { onFrame } from '../lib/loop.js';
import { useApp } from '../context/AppState.jsx';
import { backdrops } from '../data/interests.js';

/* Six clips crossfade across the Interests scroll. Weights are triangular so
   adjacent clips always sum to 1 and the last lands exactly at the end. Each
   layer sits on a phase-coloured gradient, so a missing file, an unsupported
   codec or a slow network still leaves the right colour on screen rather than
   black. */
const BG_GRAD = [
  'linear-gradient(170deg,#010206,#0A0C22 55%,#05071A)',
  'linear-gradient(170deg,#050A1E,#101A3C 55%,#1F2154)',
  'linear-gradient(170deg,#1A1434,#3A2250 50%,#6B3A5A)',
  'linear-gradient(170deg,#48283E,#8C4A46 45%,#DE8C4E)',
  'linear-gradient(170deg,#8BA6C8,#BACCE0 50%,#F2D4AE)',
  'linear-gradient(170deg,#BBDEF2,#8FBF6A 58%,#1E4A2C)',
];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Lazily hang <source> tags on a video the first time it is actually needed. */
function attach(v, base) {
  if (!v || v._base === base) return;
  v.innerHTML = '';
  v._base = base;
  ['webm', 'mp4'].forEach((ext) => {
    const s = document.createElement('source');
    s.src = `/media/${base}.${ext}`;
    s.type = ext === 'webm' ? 'video/webm' : 'video/mp4';
    v.appendChild(s);
  });
  v.load();
}

const playSafe = (v) => {
  if (!v) return;
  const q = v.play();
  if (q && q.catch) q.catch(() => {});
};

export default function Backdrop() {
  const { skyClear, clip, routeKey, setClear, features } = useApp();

  const glRef = useRef(null);
  const starRef = useRef(null);
  const layerRefs = useRef([]);
  const vidRefs = useRef([]);
  const skyA = useRef(null);
  const skyB = useRef(null);

  const routeRef = useRef(routeKey);
  routeRef.current = routeKey;
  const clearRef = useRef(skyClear);
  clearRef.current = skyClear;
  const stillRef = useRef(false);
  stillRef.current = features.nomotion;

  /* ---------------- shader sky ---------------- */
  useEffect(() => {
    Sky.init(glRef.current, starRef.current);

    const onMove = (e) => {
      Sky.setMouse(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
      Sky.setPointer(e.clientX, e.clientY);
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      Sky.setVel(y - lastY);
      Sky.setScroll(y);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const off = onFrame((t, dt) => Sky.tick(t, dt, stillRef.current));
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      off();
    };
  }, []);

  /* ---------------- journey crossfade + loop-seam crossfade ---------------- */
  useEffect(() => {
    const bgTick = (p) => {
      const n = backdrops.length;
      for (let i = 0; i < n; i++) {
        const d = Math.abs(p * (n - 1) - i);
        const w = Math.max(0, 1 - d);
        const v = vidRefs.current[i];
        if (d < 1.6) {
          attach(v, backdrops[i]);
          if (w > 0 && v && v.paused) playSafe(v);
        }
        const l = layerRefs.current[i];
        if (l) l.style.opacity = w.toFixed(3);
      }
    };

    const bgOff = () => {
      layerRefs.current.forEach((l, i) => {
        if (l) l.style.opacity = '0';
        const v = vidRefs.current[i];
        if (v && !v.paused) v.pause();
      });
    };

    let wasJourney = false;

    const off = onFrame(() => {
      /* backdrop journey — Interests only */
      if (routeRef.current === 'interests') {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        const p = h > 0 ? clamp(window.scrollY / h, 0, 1) : 0;
        bgTick(p);
        document.body.classList.toggle('daylight', p > 0.58);
        wasJourney = true;
      } else if (wasJourney) {
        bgOff();
        document.body.classList.remove('daylight');
        wasJourney = false;
      }

      /* cleared sky — two copies of one clip, crossfaded over the seam */
      const a = skyA.current;
      const b = skyB.current;
      if (!clearRef.current || !a || !b) return;
      const D = a.duration;
      if (!D || !isFinite(D) || D < 2) {
        a.style.opacity = '1';
        b.style.opacity = '0';
        return;
      }
      const X = Math.min(1.1, D * 0.14);
      const w = (t) => (t < X ? t / X : t > D - X ? (D - t) / X : 1);
      const wa = Math.max(0, w(a.currentTime));
      const wb = Math.max(0, w(b.currentTime));
      const s = wa + wb || 1;
      a.style.opacity = (wa / s).toFixed(3);
      b.style.opacity = (wb / s).toFixed(3);
    });

    return () => { off(); bgOff(); };
  }, []);

  /* ---------------- start / stop the cleared-sky clip ---------------- */
  useEffect(() => {
    const a = skyA.current;
    const b = skyB.current;
    if (!a || !b) return;

    if (!skyClear || !clip) {
      a.style.opacity = '0';
      b.style.opacity = '0';
      const t = setTimeout(() => { a.pause(); b.pause(); }, 900);
      return () => clearTimeout(t);
    }

    attach(a, clip);
    attach(b, clip);
    playSafe(a);
    playSafe(b);

    // offset the second copy by half the clip so the two never seam together
    const offset = () => {
      const D = a.duration;
      if (D && isFinite(D) && D > 2) { try { b.currentTime = D / 2; } catch { /* seek refused */ } }
    };
    if (a.readyState >= 1) offset();
    else a.addEventListener('loadedmetadata', offset, { once: true });
    return () => a.removeEventListener('loadedmetadata', offset);
  }, [skyClear, clip]);

  return (
    <>
      <canvas id="sky-gl" ref={glRef} aria-hidden="true" />
      <canvas id="sky-stars" ref={starRef} aria-hidden="true" />

      <div id="vidstack" aria-hidden="true">
        <div id="bgvids">
          {backdrops.map((base, i) => (
            <div
              className="bglayer"
              key={base}
              ref={(el) => { layerRefs.current[i] = el; }}
              style={{ background: BG_GRAD[i], opacity: 0 }}
            >
              <video
                ref={(el) => { vidRefs.current[i] = el; }}
                muted
                loop
                playsInline
                preload="none"
              />
            </div>
          ))}
        </div>
        <video className="skyvid" ref={skyA} muted loop playsInline preload="none" />
        <video className="skyvid" ref={skyB} muted loop playsInline preload="none" />
      </div>

      <div id="grain" aria-hidden="true" />
      <div id="flashlight" aria-hidden="true" />
      <div id="themewipe" aria-hidden="true" />

      <button id="clearhint" hidden={!skyClear} onClick={() => setClear(false)}>
        <span className="mono">press esc or click to return</span>
      </button>
    </>
  );
}
