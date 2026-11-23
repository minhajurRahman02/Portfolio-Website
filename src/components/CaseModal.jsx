import { useEffect, useRef, useState } from 'react';
import { Ico } from './icons.jsx';
import { lockScroll } from '../lib/lock.js';
import { byId } from '../data/work.js';
import { education, posts } from '../data/site.js';

/* One details modal for everything that opens one: work items, blog notes
   and education entries. Each kind is mapped to the same shape here, so they
   all share the layout, the close behaviour and the styles.

   `media` is the optional image at the top. It renders only when a src is
   set, and it removes itself if the file fails to load — an empty or broken
   cover never leaves a blank frame behind. */

function fromWork(w) {
  return {
    label: 'Case study',
    title: w.title,
    sub: w.sub,
    chip: w.role,
    media: w.cover ? { src: w.cover, alt: `${w.title} cover`, fit: 'cover' } : null,
    kv: w.kv,
    sections: [
      { h: 'The problem', p: [w.problem] },
      { h: 'Approach', p: [w.approach] },
      { h: 'Detail', list: w.bullets },
      { h: 'Stack', p: [w.stack] },
    ],
  };
}

function fromPost(p) {
  return {
    label: 'Blog note',
    title: p.title,
    meta: [p.status, `${p.minutes} min`, p.topic].filter(Boolean),
    media: p.cover ? { src: p.cover, alt: `${p.title} cover`, fit: 'cover' } : null,
    sections: [{ p: p.body?.length ? p.body : [p.excerpt] }],
  };
}

function fromEdu(e) {
  const kv = [[e.years, e.flag ? `years · ${e.flag.toLowerCase()}` : 'years']];
  if (e.result) kv.unshift([e.result.replace(/^GPA\s*/i, ''), 'GPA']);
  const about = e.description || e.note;
  return {
    label: 'Education',
    title: e.degree,
    sub: e.school,
    // certificates are not 16:9, so they are shown whole rather than cropped
    media: e.certificate ? { src: e.certificate, alt: `${e.degree} certificate`, fit: 'contain' } : null,
    kv,
    sections: [
      about && { h: e.description ? 'About' : 'Focus', p: [about] },
      e.description && e.note && { h: 'Focus', p: [e.note] },
    ].filter(Boolean),
  };
}

function resolve(detail) {
  if (!detail) return null;
  if (detail.kind === 'post') {
    const p = posts.find((x) => x.slug === detail.id);
    return p ? fromPost(p) : null;
  }
  if (detail.kind === 'edu') {
    const e = education[detail.id];
    return e ? fromEdu(e) : null;
  }
  const w = byId(detail.id);
  return w ? fromWork(w) : null;
}

function Media({ media }) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [media?.src]);
  if (!media || bad) return null;
  return (
    <figure className={`case-media${media.fit === 'contain' ? ' is-doc' : ''}`}>
      <img src={media.src} alt={media.alt} decoding="async" onError={() => setBad(true)} />
    </figure>
  );
}

export default function CaseModal({ detail, close }) {
  const x = useRef(null);
  const body = useRef(null);
  const item = resolve(detail);
  const key = detail ? `${detail.kind}:${detail.id}` : '';
  // App hands over a new `close` every render; reading it through a ref keeps
  // the lock effect from unlocking and relocking the page on each of those
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!item) return undefined;
    lockScroll(true);
    x.current?.focus({ preventScroll: true });
    const esc = (e) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', esc);
    return () => { lockScroll(false); window.removeEventListener('keydown', esc); };
  }, [key]); // keyed on the item's identity, not the freshly built object

  // opening a second item while one is open starts it at the top
  useEffect(() => { if (body.current) body.current.scrollTop = 0; }, [key]);

  return (
    <div
      id="casewrap"
      className={item ? 'open' : ''}
      role="dialog"
      aria-modal="true"
      aria-label={item ? item.title : 'Details'}
      aria-hidden={!item}
    >
      <div className="case-bd" onClick={close} />
      {/* The close button lives outside the scrolling panel: inside it, the
          button scrolled away with the content, and the content (later in
          the DOM, same stacking level) sat on top of it — on phones and
          tablets the title covered the X, so a tap hit the title instead. */}
      <div className="case-shell" key={key}>
        <button className="case-x" ref={x} onClick={close} aria-label="Close" type="button">
          <Ico name="close" />
        </button>
        {/* data-lenis-prevent, or the smooth-scroll driver eats the wheel and
            the panel never scrolls */}
        <article className="case glass-card" data-lenis-prevent ref={body}>
          {item && (
            <div id="case-body">
              <Media media={item.media} />
              <p className="eyebrow mono">{item.label}</p>
              <h2>{item.title}</h2>
              {item.sub && <p className="lede">{item.sub}</p>}
              {item.meta && (
                <div className="case-meta mono xs">
                  {item.meta.map((m, i) => (
                    <span className={i === 0 ? 'chip' : 'dim'} key={m}>{m}</span>
                  ))}
                </div>
              )}
              {item.chip && <span className="role">{item.chip}</span>}
              {item.kv?.length > 0 && (
                <div className="kv">
                  {item.kv.map(([v, l]) => (
                    <div key={l}>
                      <b>{v}</b>
                      <span>{l}</span>
                    </div>
                  ))}
                </div>
              )}
              {item.sections.map((s, i) => (
                <section key={s.h || i}>
                  {s.h && <h3>{s.h}</h3>}
                  {s.p?.map((t) => <p key={t.slice(0, 32)}>{t}</p>)}
                  {s.list && <ul className="b">{s.list.map((b) => <li key={b}>{b}</li>)}</ul>}
                </section>
              ))}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
