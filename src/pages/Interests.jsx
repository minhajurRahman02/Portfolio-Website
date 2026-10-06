import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Ico } from '../components/icons.jsx';
import { SplitHeading } from '../components/primitives.jsx';
import InterestModal from '../components/InterestModal.jsx';
import { interests } from '../data/interests.js';

/* The journey page. Its backdrop is the six-clip video stack in Backdrop.jsx,
   crossfading on scroll progress from deep space down to the forest floor —
   which is why the procedural sky stands down on this route. Each section is
   positioned above that stack rather than beside it: a fixed, z-index:0
   backdrop outranks non-positioned in-flow siblings, so the sections need a
   stacking context of their own. */
export default function Interests() {
  const [open, setOpen] = useState(null);
  const { hash } = useLocation();

  /* arriving from the About carousel: /interests#int-photo */
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (!el) return;
    const t = setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 160);
    return () => clearTimeout(t);
  }, [hash]);

  return (
    <section className="page page-journey" data-page="interests">
      <div className="jrny-head">
        <p className="eyebrow mono">Personal interests</p>
        <SplitHeading text="From orbit to the forest floor" as="h1" big />
        <p className="lede">
          Six things I do when I am not measuring joules. Keep scrolling — the sky comes with you.
        </p>
        <span className="scroll-hint mono xs">scroll ↓</span>
      </div>

      {interests.map((it) => (
        <article className="jsec glass-card" id={`int-${it.id}`} key={it.id}>
          <button className="jexp" onClick={() => setOpen(it.id)} aria-label={`Expand ${it.title}`}>
            Expand <Ico name="expand" />
          </button>
          <span className="jnum mono">{it.num}</span>
          <h2>{it.title}</h2>
          <p>{it.page[0]}</p>
          <p className="jtags mono xs">{it.tags}</p>
        </article>
      ))}

      <div className="jrny-end">
        <p className="mono xs dim">You have landed. Stop here a while.</p>
      </div>

      <InterestModal id={open} close={() => setOpen(null)} />
    </section>
  );
}
