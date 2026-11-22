import { useEffect, useState } from 'react';
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

const city = profile.location.split(',')[0];

export default function SevenSegClock() {
  const [t, setT] = useState(() => ({ h: 0, m: 0, s: 0 }));
  useEffect(() => {
    /* Built once: constructing an Intl formatter is expensive, and the old
       loop built one on every animation frame. */
    let fmt = null;
    try {
      fmt = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hourCycle: 'h23', timeZone: profile.timezone, // the profile's timezone, not the visitor's; h23 so midnight reads 00, never 24
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
      className="segclock"
      role="img"
      aria-label={`${city} time ${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`}
    >
      {/* A static 3D pose: .seg-rot holds the yaw, .seg-stage the Z push.
          No looping animation — see the note on .seg-rot in index.css. */}
      <div className="seg-rot">
        <div className="seg-stage">
          <Face h={t.h} m={t.m} s={t.s} cls="" />
          <Face h={t.h} m={t.m} s={t.s} cls="seg-shadow seg-shadow1" />
          <Face h={t.h} m={t.m} s={t.s} cls="seg-shadow seg-shadow2" />
        </div>
      </div>
      <span className="mono xs dim seg-cap">{city}</span>
    </div>
  );
}