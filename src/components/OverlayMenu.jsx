import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ico } from './icons.jsx';
import { createNet } from '../lib/net.js';
import { onFrame } from '../lib/loop.js';
import { lockScroll } from '../lib/lock.js';
import { profile, routes } from '../data/site.js';

/* The fullscreen menu both the top bar and the dock open. Links fill with
   water on hover; the panel beside them holds a point cloud that reassembles
   into the hovered link's icon. */
export default function OverlayMenu({ open, close }) {
  const canvas = useRef(null);
  const net = useRef(null);
  const [label, setLabel] = useState('network idle');
  const [lit, setLit] = useState(false);
  const [clock, setClock] = useState('--:--');

  /* point cloud */
  useEffect(() => {
    net.current = createNet(canvas.current);
    const off = onFrame((t, dt) => net.current.tick(dt));
    const onResize = () => net.current.size();
    window.addEventListener('resize', onResize);
    return () => { off(); window.removeEventListener('resize', onResize); };
  }, []);

  useEffect(() => {
    const n = net.current;
    if (!n) return;
    n.setLive(open);
    if (open) { n.size(); n.target(null); }
    else { n.target(null); setLit(false); setLabel('network idle'); }
  }, [open]);

  /* scroll lock + escape */
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('menuopen');
    lockScroll(true);
    const esc = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', esc);
    return () => {
      document.body.classList.remove('menuopen');
      lockScroll(false);
      window.removeEventListener('keydown', esc);
    };
  }, [open, close]);

  /* local clock, in the profile's timezone rather than the visitor's */
  useEffect(() => {
    if (!open) return;
    const tick = () => {
      try {
        setClock(
          new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit', minute: '2-digit', hour12: false, timeZone: profile.timezone,
          }).format(new Date())
        );
      } catch { setClock(new Date().toTimeString().slice(0, 5)); }
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [open]);

  const enter = (r) => {
    net.current?.target(r.key);
    setLit(true);
    setLabel(r.label);
  };
  const leave = () => {
    net.current?.target(null);
    setLit(false);
    setLabel('network idle');
  };

  return (
    <div
      id="overlay"
      className={open ? 'open' : ''}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      aria-hidden={!open}
    >
      <button className="ov-close" onClick={close} aria-label="Close menu" tabIndex={open ? 0 : -1}>
        <Ico name="close" />
      </button>

      <div className="ov-grid">
        <ul className="ov-links">
          {routes.map((r, i) => (
            <li key={r.key}>
              <Link
                to={r.path}
                style={{ '--d': i }}
                tabIndex={open ? 0 : -1}
                onClick={close}
                onPointerEnter={() => enter(r)}
                onPointerLeave={leave}
                onFocus={() => enter(r)}
                onBlur={leave}
              >
                <span className="ov-ic"><Ico name={r.key} /></span>
                <span className="wtxt" data-t={r.label}>{r.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="ov-side">
          <div className={`ov-prev${lit ? ' lit' : ''}`}>
            <canvas id="ov-net" ref={canvas} aria-hidden="true" />
            <span className="ov-prev-label mono">{label}</span>
          </div>
          <div className="ov-meta">
            <p className="mono xs dim">{profile.location} · {clock}</p>
            <p className="mono xs dim">Press <kbd>~</kbd> for terminal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
