import { useEffect, useRef, useState } from 'react';
import { profile } from '../data/site.js';

/* ================= seven-segment clock =================
   Each digit is seven clipped bars. Which bars light is decided purely in
   CSS from data-digit, so this component only ever writes six characters —
   no per-segment bookkeeping in JS.

   Two more copies of the whole display sit underneath as the reflection:
   one rotated flat into the floor and heavily blurred, one sharper and
   masked to fade out. Both are aria-hidden. */

const BARS = [
  ['end', 'top'],
  ['side', 'top', 'left'],
  ['side', 'top', 'right'],
  ['middle'],
  ['side', 'bottom', 'left'],
  ['side', 'bottom', 'right'],
  ['end', 'bottom'],
];

function Digit({ value }) {
  return (
    <figure className="digit" data-digit={value}>
      {BARS.map((cls) => <span className={cls.join(' ')} key={cls.join('-')} />)}
    </figure>
  );
}

function Group({ value }) {
  const s = String(value).padStart(2, '0');
  return (
    <div className="group">
      <Digit value={s[0]} />
      <Digit value={s[1]} />
    </div>
  );
}

/** One copy of the display: the lit one, or one of the two reflections.
    The glow/mask live on an inner wrapper and the blur on the outer one on
    purpose — CSS applies an element's own mask after its own filter, so a
    mask sitting on the SAME element as the blur crops the already-soft glow
    into a hard edge. Putting blur one level further out lets it smooth over
    the inner mask's edge instead of being cut by it. */
function Face({ h, m, s, cls }) {
  return (
    <div className={`seg-face ${cls}`} aria-hidden={cls ? 'true' : undefined}>
      <div className="seg-glow">
        <Group value={h} />
        <span className="colon"><i /><i /></span>
        <Group value={m} />
        <span className="colon"><i /><i /></span>
        <Group value={s} />
      </div>
    </div>
  );
}

export default function SevenSegClock() {
  const [t, setT] = useState(() => ({ h: 0, m: 0, s: 0 }));
  const [visible, setVisible] = useState(true);
  const host = useRef(null);

  /* The yaw/drift wobble is a decorative 3D animation running on an element
     tree full of drop-shadow filters and blur()'d reflections — the single
     most expensive thing this component does, every frame, forever. None of
     that is paid for while the clock has scrolled out of view, so pause the
     animation (and, with it, the filter/compositing work) the moment it's
     not on screen, and resume it the moment it is. */
  useEffect(() => {
    const el = host.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '64px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    /* Built once: constructing an Intl formatter is expensive, and the old
       loop built one on every animation frame. */
    let fmt = null;
    try {
      fmt = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, timeZone: profile.timezone, // the profile's timezone, not the visitor's
      });
    } catch { fmt = null; }

    const read = () => {
      const d = new Date();
      if (!fmt) return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() };
      const parts = fmt.formatToParts(d);
      const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
      return { h: get('hour'), m: get('minute'), s: get('second') };
    };

    /* Wake once per second, just after it turns over, instead of polling
       every frame — the display changes once a second either way. */
    let timer;
    let last = -1;
    const tick = () => {
      const now = read();
      if (now.s !== last) { last = now.s; setT(now); }
      timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 8);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`segclock${visible ? '' : ' seg-paused'}`}
      ref={host}
      role="img"
      aria-label={`Dhaka time ${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`}
    >
      {/* Two nested wrappers on purpose. The reference puts a slow yaw on one
          element and a drift on another with a different period, so the two
          never line up and the whole thing reads as a camera that will not
          quite settle. One combined keyframe looks mechanical. */}
      <div className="seg-rot">
        <div className="seg-stage">
          <Face h={t.h} m={t.m} s={t.s} cls="" />
          <Face h={t.h} m={t.m} s={t.s} cls="seg-shadow seg-shadow1" />
          <Face h={t.h} m={t.m} s={t.s} cls="seg-shadow seg-shadow2" />
        </div>
      </div>
      <span className="mono xs dim seg-cap">{profile.location.split(',')[0]}</span>
    </div>
  );
}