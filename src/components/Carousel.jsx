import { useCallback, useEffect, useRef, useState } from 'react';
import { interests } from '../data/interests.js';

const lerp = (a, b, k) => a + (b - a) * k;

/* ====================== 3D carousel ======================
   Panels sit on the inside of a cylinder, so the radius has to come from the
   panel count and the container width rather than being a fixed number:
   r = (w/2) / tan(π/n), plus a little breathing room. Drag to spin, click a
   near panel to jump to that section of /interests. */
export default function Carousel({ onPick }) {
  const host = useRef(null);
  const panels = useRef([]);
  const angle = useRef(0);
  const target = useRef(0);
  const radius = useRef(280);
  const raf = useRef(0);
  const [name, setName] = useState(interests[0].title);

  const STEP = 360 / interests.length;

  const render = useCallback(() => {
    panels.current.filter(Boolean).forEach((p, i) => {
      const a = i * STEP + angle.current;
      p.style.transform = `rotateY(${a}deg) translateZ(${radius.current}px)`;
      const norm = ((a % 360) + 360) % 360;
      // panels on the far side must not swallow clicks meant for the front
      p.classList.toggle('far', !(norm < 40 || norm > 320));
    });
    const n = interests.length;
    const idx = ((Math.round(-angle.current / STEP) % n) + n) % n;
    setName(interests[idx].title);
  }, [STEP]);

  const animate = useCallback(() => {
    angle.current = lerp(angle.current, target.current, 0.14);
    render();
    if (Math.abs(target.current - angle.current) > 0.05) {
      raf.current = requestAnimationFrame(animate);
    } else {
      angle.current = target.current;
      render();
    }
  }, [render]);

  const layout = useCallback(() => {
    const el = host.current;
    if (!el) return;
    const w = el.clientWidth || 300;
    radius.current = Math.round(w / 2 / Math.tan(Math.PI / interests.length)) + 46;
    render();
  }, [render]);

  useEffect(() => {
    layout();
    window.addEventListener('resize', layout);
    return () => { window.removeEventListener('resize', layout); cancelAnimationFrame(raf.current); };
  }, [layout]);

  /* drag */
  const drag = useRef(null);
  const moved = useRef(0);

  const down = (e) => {
    // setPointerCapture retargets later events to the carousel itself, so the
    // panel has to be captured here, on press, not read back on pointerup.
    drag.current = { x: e.clientX, a: target.current, panel: e.target.closest('.cs-panel') };
    moved.current = 0;
    host.current?.setPointerCapture?.(e.pointerId);
  };

  const move = (e) => {
    if (!drag.current) return;
    moved.current = Math.abs(e.clientX - drag.current.x);
    target.current = drag.current.a + (e.clientX - drag.current.x) * 0.45;
    angle.current = target.current;
    render();
  };

  const up = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const wasDrag = moved.current > 6;
    target.current = Math.round(target.current / STEP) * STEP;
    cancelAnimationFrame(raf.current);
    animate();
    if (!wasDrag && d.panel && !d.panel.classList.contains('far')) {
      onPick?.(d.panel.dataset.go);
    }
  };

  const spin = (dir) => {
    target.current += dir * STEP;
    cancelAnimationFrame(raf.current);
    animate();
  };

  return (
    <div className="carousel-wrap">
      <div
        className="carousel"
        ref={host}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => { drag.current = null; }}
      >
        {interests.map((it, i) => (
          <div
            className="cs-panel"
            key={it.id}
            data-go={it.id}
            ref={(el) => { panels.current[i] = el; }}
          >
            <span className="cs-ico">{it.icon}</span>
            <h3>{it.title}</h3>
            <p>{it.blurb}</p>
            <span className="cs-more mono">open →</span>
          </div>
        ))}
      </div>
      <div className="cs-ctrl">
        <button className="rnd" onClick={() => spin(1)} aria-label="Previous">‹</button>
        <span className="cs-name mono">{name}</span>
        <button className="rnd" onClick={() => spin(-1)} aria-label="Next">›</button>
      </div>
    </div>
  );
}
