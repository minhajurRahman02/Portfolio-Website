import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cube, CountUp, Reveal, SplitHeading } from '../components/primitives.jsx';
import SkillDeck from '../components/SkillDeck.jsx';
import { profile, identities, stats, posts } from '../data/site.js';
import { featured } from '../data/work.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* The one permanently looping motion on the hero: identities typed and
   deleted under the name. Timing is per-character rather than per-frame so a
   slow tab does not turn it into a stutter. */
function Typewriter() {
  const [txt, setTxt] = useState('');
  useEffect(() => {
    let i = 0;
    let c = 0;
    let typing = true;
    let id;
    const step = () => {
      const s = identities[i];
      if (typing) {
        c += 1;
        setTxt(s.slice(0, c));
        if (c >= s.length) { typing = false; id = setTimeout(step, 1500); return; }
      } else {
        c -= 1;
        setTxt(s.slice(0, c));
        if (c <= 0) { typing = true; i = (i + 1) % identities.length; id = setTimeout(step, 320); return; }
      }
      id = setTimeout(step, typing ? 72 : 36);
    };
    id = setTimeout(step, 600);
    return () => clearTimeout(id);
  }, []);
  return (
    <p className="type-line reveal lit">
      <span className="caret-pre mono">&gt;</span> <span>{txt}</span>
      <span className="caret">|</span>
    </p>
  );
}

/* Extruded type with a parallax tilt. The depth is a stack of ::before
   shadows in CSS; only the tilt needs the pointer. */
function Name3D() {
  const el = useRef(null);
  useEffect(() => {
    const onMove = (e) => {
      const n = el.current;
      if (!n || document.body.classList.contains('nomotion')) return;
      const r = n.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      n.style.transform = `perspective(900px) rotateX(${clamp(-dy * 9, -11, 11)}deg) rotateY(${clamp(dx * 13, -16, 16)}deg)`;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const lines = profile.name.split(' ').slice(-2);
  return (
    <h1 className="name3d reveal lit" ref={el} aria-label={profile.name}>
      {lines.map((l) => (
        <span className="n-line" key={l}>
          <span className="n-ext" data-t={l}>{l}</span>
        </span>
      ))}
    </h1>
  );
}

export default function Home({ onCase }) {
  return (
    <section className="page" data-page="home">
      <div className="hero">
        <div className="hero-copy">
          <Reveal as="p" className="eyebrow mono">{profile.availability}</Reveal>
          <Name3D />
          <Typewriter />
          <Reveal as="p" className="hero-sub">{profile.tagline}</Reveal>
          <Reveal className="hero-cta">
            <Link className="btn btn-solid" to="/work" data-magnetic>See the work</Link>
            <Link className="btn btn-ghost" to="/contact" data-magnetic>Get in touch</Link>
          </Reveal>
        </div>
        <Reveal className="hero-portrait">
          <div className="pf-ring" />
          <div className="pf-glass">
            <div className="pf-img">
              <img src="/images/portrait.jpg" alt={profile.name} width="900" height="959" />
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal className="stats glass-card">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <CountUp value={s.value} suffix={s.suffix || ''} />
            <span>{s.label}</span>
          </div>
        ))}
      </Reveal>

      <section className="sect" data-zone="glass">
        <div className="sect-head">
          <Cube face="01" />
          <SplitHeading text="Selected work" />
          <p className="sect-note">The things I am actually building right now.</p>
          <Link className="sect-all" to="/work" data-magnetic>
            View all <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="feat-grid">
          {featured().map((w) => (
            <article
              className="feat glass-card"
              key={w.id}
              tabIndex={0}
              onClick={() => onCase(w.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCase(w.id); }
              }}
            >
              <div className="feat-top">
                <span className={`chip${w.chip === 'Live' ? ' chip-live' : ''}`}>{w.chip}</span>
                <span className="mono xs dim">{w.year}</span>
              </div>
              <h3>{w.title}</h3>
              <p>{w.teaser}</p>
              <div className="tags">{w.tags.map((t) => <span key={t}>{t}</span>)}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="sect" data-zone="glass" id="skills-sect">
        <div className="sect-head">
          <Cube face="02" />
          <SplitHeading text="Technical skills" />
          <p className="sect-note">Hover to part the deck. Click any card to see where it was actually used.</p>
        </div>
        <SkillDeck />
      </section>

      <section className="sect" data-zone="glass">
        <div className="sect-head">
          <Cube face="03" />
          <SplitHeading text="Latest writing" />
        </div>
        <Link className="post-row glass-card" to="/blog">
          <span className="mono xs dim">{posts[0].status}</span>
          <h3>{posts[0].title}</h3>
          <span className="arrow">→</span>
        </Link>
      </section>
    </section>
  );
}
