import { useEffect, useRef, useState } from 'react';

/* ---------- in-view hook: the animation is an enhancement, never the
   only path to visible content, so there is a hard fallback timer ---------- */
export function useInView(ref, { threshold = 0.12, fallback = 2400 } = {}) {
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    const light = () => { if (!done) { done = true; setLit(true); } };
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.94 && r.bottom > -40) light();
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && light()),
      { threshold, rootMargin: '0px 0px -6% 0px' }
    );
    io.observe(el);
    const t = setTimeout(light, fallback);
    return () => { io.disconnect(); clearTimeout(t); };
  }, [ref, threshold, fallback]);
  return lit;
}

export function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);
  const lit = useInView(ref);
  return (
    <Tag ref={ref} className={`reveal ${lit ? 'lit' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/** Characters animate individually; each word stays one unbreakable unit, and
 *  the last word carries a travelling colour wave. */
export function SplitHeading({ text, as: Tag = 'h2', className = '', big = false }) {
  const ref = useRef(null);
  const lit = useInView(ref);
  const parts = String(text).split(/(\s+)/).filter(Boolean);
  const words = parts.filter((p) => !/^\s+$/.test(p));
  const last = words[words.length - 1];
  let ci = 0;
  let seen = 0;
  return (
    <Tag ref={ref} className={`split ${lit ? 'lit' : ''} ${big ? 'big' : ''} ${className}`}>
      {parts.map((p, i) => {
        if (/^\s+$/.test(p)) return ' ';
        seen += 1;
        const hl = seen === words.length && words.length > 1 && last.length > 2;
        return (
          <span className={`wd${hl ? ' hl' : ''}`} key={i}>
            {Array.from(p).map((ch) => (
              <span className="ch" style={{ '--c': ci++ }} key={ci}>
                {ch}
              </span>
            ))}
          </span>
        );
      })}
    </Tag>
  );
}

export function Cube({ face }) {
  const ref = useRef(null);
  const lit = useInView(ref);
  return (
    <span ref={ref} className={`cube ${lit ? 'spin' : ''}`} aria-hidden="true">
      <i>{face}</i>
    </span>
  );
}

export function CountUp({ value, suffix = '' }) {
  const ref = useRef(null);
  const lit = useInView(ref);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!lit) return;
    const start = performance.now();
    let raf;
    const step = (now) => {
      const p = Math.min(1, (now - start) / 1400);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [lit, value]);
  return (
    <b ref={ref}>
      {n}
      {suffix}
    </b>
  );
}

export function SectionHead({ num, title, note, children }) {
  return (
    <div className="sect-head">
      {num && <Cube face={num} />}
      <SplitHeading text={title} />
      {note && <p className="sect-note">{note}</p>}
      {children}
    </div>
  );
}

export function PlaceholderNote({ children }) {
  return <p className="placeholder-note mono xs">{children}</p>;
}
