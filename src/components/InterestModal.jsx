import { useEffect, useRef } from 'react';
import { Ico } from './icons.jsx';
import { lockScroll } from '../lib/lock.js';
import { byInterestId, galleryShots, travelShots } from '../data/interests.js';

/* ================= cursor-trail gallery =================
   The original hid and showed frames outright; here a frame blurs and
   scales in under the cursor and blurs out as it drifts, with a trail of
   five alive at once. New frames are only placed once the cursor has
   actually moved a seventh of the box, or a slow drag would machine-gun
   the whole set. */
function RevealBox({ shots }) {
  const box = useRef(null);
  const imgs = useRef([]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let gi = 0;
    let last = { x: -999, y: -999 };

    const move = (e) => {
      const r = el.getBoundingClientRect();
      const lx = e.clientX - r.left;
      const ly = e.clientY - r.top;
      if (lx < 0 || ly < 0 || lx > r.width || ly > r.height) return;
      if (Math.hypot(lx - last.x, ly - last.y) < r.width / 7) return;
      last = { x: lx, y: ly };
      el.classList.add('active');

      const list = imgs.current.filter(Boolean);
      if (!list.length) return;
      const lead = list[gi % list.length];
      const tail = list[(gi - 5 + list.length * 2) % list.length];
      lead.style.left = `${lx}px`;
      lead.style.top = `${ly}px`;
      lead.style.zIndex = String(gi);
      lead.classList.remove('off');
      void lead.offsetWidth; // restart the transition
      lead.classList.add('on');
      if (tail && tail !== lead) { tail.classList.remove('on'); tail.classList.add('off'); }
      gi += 1;
    };

    const out = () => {
      imgs.current.filter(Boolean).forEach((im) => { im.classList.remove('on'); im.classList.add('off'); });
      el.classList.remove('active');
      last = { x: -999, y: -999 };
    };

    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', out);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', out); };
  }, []);

  return (
    <div className="revealbox" ref={box}>
      <span className="rv-hint">move the cursor</span>
      {shots.map((src, i) => (
        <img
          className="rv"
          key={src}
          src={src}
          alt=""
          loading="lazy"
          ref={(el) => { imgs.current[i] = el; }}
        />
      ))}
    </div>
  );
}

export default function InterestModal({ id, close }) {
  const x = useRef(null);
  const body = useRef(null);
  const d = id ? byInterestId(id) : null;

  useEffect(() => {
    if (!d) return;
    lockScroll(true);
    if (body.current) body.current.scrollTop = 0;
    x.current?.focus();
    const esc = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', esc);
    return () => { lockScroll(false); window.removeEventListener('keydown', esc); };
  }, [d, close]);

  return (
    <div
      id="imodal"
      className={d ? 'open' : ''}
      role="dialog"
      aria-modal="true"
      aria-label="Interest detail"
      aria-hidden={!d}
    >
      <div className="im-bd" onClick={close} />
      <article className="im-panel glass-card">
        <button className="im-x" ref={x} onClick={close} aria-label="Close">
          <Ico name="close" />
        </button>
        <header className="im-head">
          <span className="im-num mono">{d?.num}</span>
          <h2>{d?.title}</h2>
          <p className="im-sub">{d?.sub}</p>
        </header>
        {/* data-lenis-prevent: Lenis captures the wheel globally and routes it
            to window scroll, so without this the modal cannot be scrolled. */}
        <div className="im-body" ref={body} data-lenis-prevent>
          {d?.page?.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}

          {d?.list && (
            <>
              <h4>{d.listTitle}</h4>
              <ul className="b">{d.list.map((l) => <li key={l}>{l}</li>)}</ul>
            </>
          )}

          {d?.kind === 'gallery' && (
            <>
              <RevealBox shots={galleryShots} />
              <p className="ph-note">Placeholder frames — swap in gal-01…gal-10.jpg.</p>
            </>
          )}

          {d?.kind === 'travel' && (
            <>
              <figure className="tv-cover">
                <img src={travelShots.cover} alt="" loading="lazy" />
                <figcaption className="tv-cap">{travelShots.caption}</figcaption>
              </figure>
              <div className="tv-grid">
                {travelShots.grid.map((src) => (
                  <figure key={src}><img src={src} alt="" loading="lazy" /></figure>
                ))}
              </div>
              <p className="ph-note">Placeholder frames — swap in travel-cover.jpg and travel-01…06.jpg.</p>
            </>
          )}

          {d?.kind === 'text' && (
            <p className="ph-note">Placeholder copy — send me what you actually want here.</p>
          )}
        </div>
      </article>
    </div>
  );
}
