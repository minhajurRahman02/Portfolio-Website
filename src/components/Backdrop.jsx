import { useEffect, useRef } from 'react';
import Sky from '../lib/sky.js';
import { onFrame } from '../lib/loop.js';
import { createFireflies } from '../lib/fireflies.js';
import { useApp } from '../context/AppState.jsx';

/* The procedural sky, the cleared-sky fireflies and the global overlays.
   (The Interests page used to crossfade six backdrop videos here; it now
   paints its own scenes — see src/interests/.) */
export default function Backdrop() {
  const { skyClear, setClear, features } = useApp();

  const glRef = useRef(null);
  const starRef = useRef(null);
  const flyRef = useRef(null);
  const flies = useRef(null);

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

  /* ---------------- fireflies ---------------- */
  useEffect(() => {
    flies.current = createFireflies(flyRef.current);
    const off = onFrame((t, dt) => flies.current.tick(t, dt));
    return () => { off(); flies.current.destroy(); };
  }, []);

  useEffect(() => { flies.current?.set(skyClear); }, [skyClear]);

  return (
    <>
      <canvas id="sky-gl" ref={glRef} aria-hidden="true" />
      <canvas id="sky-stars" ref={starRef} aria-hidden="true" />

      {/* the cleared sky: darkness with fireflies punching light through it */}
      <canvas id="fireflies" ref={flyRef} aria-hidden="true" />

      <div id="grain" aria-hidden="true" />
      <div id="flashlight" aria-hidden="true" />
      <div id="themewipe" aria-hidden="true" />

      <button id="clearhint" hidden={!skyClear} onClick={() => setClear(false)}>
        <span className="mono">press esc or click to return</span>
      </button>
    </>
  );
}
