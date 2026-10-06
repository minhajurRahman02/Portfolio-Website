import { useEffect, useRef, useState } from 'react';
import { Cube, SplitHeading } from './primitives.jsx';
import { onFrame } from '../lib/loop.js';
import { ZONE_LIMIT, byZone } from '../data/work.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;

/* ===================== procedural neural graph =====================
   The Research zone's backdrop: nodes drifting on a bounded field,
   edges drawn only while a pair is close enough, and pulses travelling
   along edges. Node count scales with width so a phone does not draw a
   graph meant for a desktop. */
export function NeuralCanvas() {
  const cv = useRef(null);

  useEffect(() => {
    const canvas = cv.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let nodes = [];
    let edges = [];
    let pulses = [];
    let W = 0;
    let H = 0;

    const size = () => {
      const r = canvas.parentElement.getBoundingClientRect();
      if (!r.width) return;
      const cw = Math.min(r.width, 1600);
      const ch = Math.min(r.height, 2000);
      canvas.width = Math.round(cw);
      canvas.height = Math.round(ch);
      ctx.setTransform(cw / r.width, 0, 0, ch / r.height, 0, 0);
      W = r.width;
      H = r.height;

      nodes = [];
      edges = [];
      const n = Math.round(clamp(r.width / 32, 18, 46));
      for (let i = 0; i < n; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
        });
      }
      for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) if (Math.random() < 0.055) edges.push([a, b]);
      }
    };

    size();
    window.addEventListener('resize', size);

    const off = onFrame((t, dt) => {
      if (!W) { size(); return; }
      const f = dt * 60;
      const L = document.body.classList.contains('lightmode');
      ctx.clearRect(0, 0, W, H);

      nodes.forEach((p) => {
        p.x += p.vx * f;
        p.y += p.vy * f;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      });

      ctx.lineWidth = 1;
      edges.forEach((e) => {
        const a = nodes[e[0]];
        const b = nodes[e[1]];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > 230) return;
        ctx.strokeStyle = `${L ? 'rgba(67,56,202,' : 'rgba(145,104,242,'}${0.32 * (1 - d / 230)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });

      if (pulses.length < 10 && Math.random() < 3 * dt && edges.length) {
        pulses.push({ e: edges[Math.floor(Math.random() * edges.length)], t: 0 });
      }
      pulses = pulses.filter((p) => {
        const a = nodes[p.e[0]];
        const b = nodes[p.e[1]];
        p.t += 0.8 * dt;
        if (p.t > 1) return false;
        ctx.fillStyle = L ? 'rgba(14,116,144,.95)' : 'rgba(47,218,240,.95)';
        ctx.beginPath();
        ctx.arc(lerp(a.x, b.x, p.t), lerp(a.y, b.y, p.t), 2.4, 0, 6.283);
        ctx.fill();
        return true;
      });

      nodes.forEach((p) => {
        ctx.fillStyle = L ? 'rgba(109,40,217,.55)' : 'rgba(176,186,255,.6)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8, 0, 6.283);
        ctx.fill();
      });
    });

    return () => { off(); window.removeEventListener('resize', size); };
  }, []);

  return <canvas className="neural" ref={cv} aria-hidden="true" />;
}

/* ============================ one card ============================ */
function Card({ item, onOpen }) {
  return (
    <article
      className="wcard glass-card"
      tabIndex={0}
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(item.id); }
      }}
    >
      <div className="w-num mono">{item.num}</div>
      <h3>{item.title}</h3>
      <p className="w-sub">{item.sub}</p>
      <dl className="w-facts">
        {item.facts.map(([dt, dd]) => (
          <div key={dt}>
            <dt>{dt}</dt>
            <dd>{dd}</dd>
          </div>
        ))}
      </dl>
      <span className="w-open mono">open case study →</span>
    </article>
  );
}

/* How many horizontal pixels the rail travels per pixel of vertical scroll.
   Above 1 the rail outruns the page, which is what makes it feel quick. */
const RAIL_SPEED = 1.35;

/* ======================= a zone: the rail =======================
   Vertical scroll is translated into sideways travel while the zone is
   pinned. The rail shows ZONE_LIMIT cards; past that it ends in a round
   arrow that loads the rest into the same flex rather than switching to a
   different layout.

   The pinned track's height is measured from how far the rail actually
   overflows, not fixed in CSS. A fixed 260vh meant three cards crawled
   through 160vh of dead scroll, and every card added made it slower still. */
export default function WorkZone({ zone, letter, label, note, children, onOpen }) {
  const items = byZone(zone);
  const track = useRef(null);
  const rail = useRef(null);
  const sticky = useRef(null);
  const [all, setAll] = useState(false);

  const shown = all ? items : items.slice(0, ZONE_LIMIT);
  const more = items.length - ZONE_LIMIT;

  useEffect(() => {
    const measure = () => {
      const tr = track.current;
      const r = rail.current;
      const st = sticky.current;
      if (!tr || !r || !st) return 0;
      if (window.innerWidth <= 760) { tr.style.height = ''; return 0; }
      const over = Math.max(0, r.scrollWidth - st.clientWidth + 8);
      tr.style.height = `${window.innerHeight + over / RAIL_SPEED}px`;
      return over;
    };

    let over = measure();
    const onResize = () => { over = measure(); };
    window.addEventListener('resize', onResize);

    // remeasure once the newly revealed cards have been laid out
    const settle = setTimeout(() => { over = measure(); }, 60);

    const off = onFrame(() => {
      if (window.innerWidth <= 760) return;
      const tr = track.current;
      const r = rail.current;
      if (!tr || !r || over <= 0) return;
      const total = tr.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const p = clamp(-tr.getBoundingClientRect().top / total, 0, 1);
      r.style.transform = `translate3d(${-p * over}px,0,0)`;
    });

    return () => { off(); clearTimeout(settle); window.removeEventListener('resize', onResize); };
  }, [all, items.length]);

  return (
    <div
      className={`zone zone-${zone === 'research' ? 'research' : 'eng'}`}
      data-zone={zone === 'research' ? 'glass' : 'panel'}
    >
      {children}
      <div className="zone-label">
        <Cube face={letter} />
        <SplitHeading text={label} />
        {note && <p className="sect-note">{note}</p>}
      </div>

      <div className="htrack" ref={track}>
        <div className="hsticky" ref={sticky}>
          <div className="hrail" ref={rail}>
            {shown.map((it) => <Card item={it} key={it.id} onOpen={onOpen} />)}
            {!all && more > 0 && (
              <button
                className="rail-more"
                onClick={() => setAll(true)}
                aria-label={`Show ${more} more project${more > 1 ? 's' : ''}`}
              >
                <span className="rm-ring">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h13M12 5l7 7-7 7" />
                  </svg>
                </span>
                <span className="rm-label mono">{more} more</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
