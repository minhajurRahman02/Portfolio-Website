import { useEffect, useRef } from 'react';
import { Ico } from './icons.jsx';
import { lockScroll } from '../lib/lock.js';
import { byId } from '../data/work.js';

/* A case study, opened from a work card. Role is deliberately marked
   unconfirmed rather than guessed — it is the one fact on this site I cannot
   supply for someone else. */
export default function CaseModal({ id, close }) {
  const x = useRef(null);
  const item = id ? byId(id) : null;

  useEffect(() => {
    if (!item) return;
    lockScroll(true);
    x.current?.focus();
    const esc = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', esc);
    return () => { lockScroll(false); window.removeEventListener('keydown', esc); };
  }, [item, close]);

  return (
    <div
      id="casewrap"
      className={item ? 'open' : ''}
      role="dialog"
      aria-modal="true"
      aria-label="Case study"
      aria-hidden={!item}
    >
      <div className="case-bd" onClick={close} />
      <article className="case glass-card">
        <button className="case-x" ref={x} onClick={close} aria-label="Close">
          <Ico name="close" />
        </button>
        {item && (
          <div id="case-body">
            <h2>{item.title}</h2>
            <p className="lede">{item.sub}</p>
            <span className="role">Role: to be confirmed — team project</span>
            <div className="kv">
              {item.kv.map(([v, l]) => (
                <div key={l}>
                  <b>{v}</b>
                  <span>{l}</span>
                </div>
              ))}
            </div>
            <h3>The problem</h3>
            <p>{item.problem}</p>
            <h3>Approach</h3>
            <p>{item.approach}</p>
            <h3>Detail</h3>
            <ul className="b">{item.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
            <h3>Stack</h3>
            <p>{item.stack}</p>
          </div>
        )}
      </article>
    </div>
  );
}
