import { useEffect, useRef, useState } from 'react';
import { Mark } from './icons.jsx';

const KEY = 'mr_seen2';

export function alreadyBooted() {
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
}

/* Real progress, not a fixed animation: the counter tracks how many images
   have actually decoded, with a time-based floor so a warm cache still gets a
   visible count-up and a 2.5s ceiling so a stalled asset can never trap the
   visitor behind the curtain. Skipped entirely on later navigations in the
   same tab. */
export default function Preloader({ onDone }) {
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    document.body.classList.add('loading');
    const imgs = Array.from(document.images);
    let loaded = 0;
    const bump = () => { loaded += 1; };
    imgs.forEach((im) => {
      if (im.complete) loaded += 1;
      else {
        im.addEventListener('load', bump, { once: true });
        im.addEventListener('error', bump, { once: true });
      }
    });

    const start = performance.now();
    let p = 0;
    const iv = setInterval(() => {
      const real = imgs.length ? loaded / imgs.length : 1;
      const el = (performance.now() - start) / 1000;
      const cap = Math.max(real * 100, Math.min(el / 1.5, 1) * 100);
      p = Math.min(100, p + Math.max(1.2, (cap - p) * 0.18));
      setPct(Math.floor(p));

      if (p >= 99.4 || el > 2.5) {
        clearInterval(iv);
        setPct(100);
        try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode */ }
        setTimeout(() => {
          setDone(true);
          document.body.classList.remove('loading');
          if (!fired.current) { fired.current = true; onDone?.(); }
        }, 320);
      }
    }, 40);

    return () => {
      clearInterval(iv);
      document.body.classList.remove('loading');
    };
  }, [onDone]);

  return (
    <div id="preloader" className={done ? 'done' : ''}>
      <div className="pre-inner">
        <Mark className="mark mark-lg" />
        <div className="pre-count"><span>{pct}</span><i>%</i></div>
      </div>
      <div className="curtain curtain-t" />
      <div className="curtain curtain-b" />
    </div>
  );
}
