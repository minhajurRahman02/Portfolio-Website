import { useEffect, useRef } from 'react';
import { skills } from '../data/site.js';
import { useInView } from './primitives.jsx';

const CW = 200; // card width, matched to .skill-card in the stylesheet
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* ====================================================================
   The card deck. This is the one piece carried over from the original
   site unchanged: cards land one at a time from a stack at the centre,
   the deck parts around whichever card you point at, and a second click
   flips that card to show the projects it was used in.

   Positions are absolute and written in JS rather than CSS, because the
   layout depends on how many cards there are and on the available width
   at the same time. Below 760px the whole mechanism stands down and the
   cards become an ordinary grid.
   ==================================================================== */
export default function SkillDeck() {
  const deck = useRef(null);
  const cards = useRef([]);
  const pos = useRef([]);
  const live = useRef(false);
  const armed = useRef(false);
  const flown = useRef(false);
  const spread = useRef(180);

  const lit = useInView(deck, { threshold: 0.18 });

  const layout = () => {
    const el = deck.current;
    if (!el) return;
    const list = cards.current.filter(Boolean);

    if (window.innerWidth <= 760) {
      live.current = false;
      flown.current = true;
      list.forEach((c) => { c.style.left = ''; c.style.zIndex = ''; c.style.opacity = ''; });
      return;
    }

    live.current = true;
    const W = el.clientWidth;
    const n = list.length;
    // shrink the fan rather than overflow once the viewport gets tight
    const s = clamp((W - 40) / ((n - 1) * 60 + CW + 360), 0.52, 1);
    const overlap = 60 * s;
    spread.current = 180 * s;
    const mid = (n - 1) / 2;
    list.forEach((c, i) => {
      pos.current[i] = W / 2 - CW / 2 + (i - mid) * overlap;
      c.style.zIndex = String(i);
      c.style.left = `${armed.current && !flown.current ? W / 2 - CW / 2 : pos.current[i]}px`;
    });
  };

  /* Arm only if the deck is still below the fold: if it is already on
     screen at load there is no entrance to play, and stacking the cards
     invisibly would just hide them. */
  useEffect(() => {
    const el = deck.current;
    if (!el) return;
    if (window.innerWidth > 760 && el.getBoundingClientRect().top >= window.innerHeight * 0.9) {
      armed.current = true;
      cards.current.filter(Boolean).forEach((c) => {
        c.style.opacity = '0';
        c.style.left = `${el.clientWidth / 2 - CW / 2}px`;
      });
    }
    layout();
    window.addEventListener('resize', layout);
    return () => window.removeEventListener('resize', layout);
  }, []);

  /* deal the cards out */
  useEffect(() => {
    if (!lit || flown.current) return;
    flown.current = true;
    const list = cards.current.filter(Boolean);
    if (!live.current || !armed.current) {
      list.forEach((c) => { c.style.opacity = '1'; });
      layout();
      return;
    }
    const timers = [];
    list.forEach((c, i) => {
      c.classList.add('fly');
      timers.push(
        setTimeout(() => {
          c.style.opacity = '1';
          c.style.left = `${pos.current[i]}px`;
          timers.push(setTimeout(() => c.classList.remove('fly'), 950));
        }, 70 * i)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [lit]);

  const part = (active) => {
    cards.current.filter(Boolean).forEach((c, i) => {
      if (i === active) {
        c.classList.add('hovered');
        c.style.left = `${pos.current[i]}px`;
        c.style.zIndex = '999';
      } else {
        c.classList.remove('hovered', 'flipped');
        c.style.left = `${pos.current[i] + (i < active ? -1 : 1) * spread.current}px`;
        c.style.zIndex = String(i);
      }
    });
  };

  const reset = () => {
    cards.current.filter(Boolean).forEach((c, i) => {
      c.classList.remove('hovered', 'flipped');
      if (live.current) {
        c.style.left = `${pos.current[i]}px`;
        c.style.zIndex = String(i);
      }
    });
  };

  const onMove = (e) => {
    if (!live.current || !flown.current) return;
    const c = e.target.closest?.('.skill-card');
    if (!c) return;
    const i = cards.current.indexOf(c);
    if (i < 0 || c.classList.contains('hovered')) return;
    part(i);
  };

  const onPick = (i) => {
    const c = cards.current[i];
    if (!c) return;
    // first click brings the card forward, second one flips it
    if (live.current && !c.classList.contains('hovered')) return part(i);
    c.classList.toggle('flipped');
  };

  return (
    <>
      <div
        className="skills-deck"
        id="deck"
        ref={deck}
        onPointerMove={onMove}
        onPointerLeave={() => live.current && reset()}
      >
        {skills.map((s, i) => (
          <div
            className="skill-card"
            key={s.title}
            data-i={i}
            tabIndex={0}
            ref={(el) => { cards.current[i] = el; }}
            onClick={() => onPick(i)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              if (live.current) part(i);
              cards.current[i]?.classList.toggle('flipped');
            }}
          >
            <div className="sc-face sc-front">
              <span className="sheen" />
              <h3>
                {s.title.split('\n').map((l, k, arr) => (
                  <span key={l}>{l}{k < arr.length - 1 ? <br /> : null}</span>
                ))}
              </h3>
              <ul>{s.items.map((it) => <li key={it}>{it}</li>)}</ul>
              <span className="sc-hint mono">click →</span>
            </div>
            <div className="sc-face sc-back">
              <span className="sheen" />
              <h4>Used in</h4>
              <ul className="used">{s.usedIn.map((u) => <li key={u}>{u}</li>)}</ul>
              <span className="sc-hint mono">← back</span>
            </div>
          </div>
        ))}
      </div>
      <p className="deck-mobile-note mono xs dim">Tap a card to part the deck · tap again to flip</p>
    </>
  );
}
