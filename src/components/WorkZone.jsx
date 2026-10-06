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

/* ====================== a zone: rail + see all ======================
   Vertical scroll is translated into sideways travel while the zone is
   pinned. The "See all" switch only exists once a zone holds more than
   three items — below that the rail already shows everything and the
   button would be a lie. */
export default function WorkZone({ zone, letter, label, note, children, onOpen }) {
  const items = byZone(zone);
  const track = useRef(null);
  const rail = useRef(null);
  const sticky = useRef(null);
  const [all, setAll] = useState(false);
  const many = items.length > ZONE_LIMIT;

  useEffect(() => {
    if (all) return;
    const off = onFrame(() => {
      if (window.innerWidth <= 760) return;
      const tr = track.current;
      const r = rail.current;
      const st = sticky.current;
      if (!tr || !r || !st) return;
      const total = tr.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const p = clamp(-tr.getBoundingClientRect().top / total, 0, 1);
      const max = Math.max(0, r.scrollWidth - st.clientWidth + 8);
      r.style.transform = `translate3d(${-p * max}px,0,0)`;
    });
    return off;
  }, [all]);

  return (
    <div className={`zone zone-${zone === 'research' ? 'research' : 'eng'}`} data-zone={zone === 'research' ? 'glass' : 'panel'}>
      {children}
      <div className="zone-label">
        <Cube face={letter} />
        <SplitHeading text={label} />
        {note && <p className="sect-note">{note}</p>}
        {many && (
          <button className="seeall" onClick={() => setAll((v) => !v)}>
            {all ? 'Back to the rail →' : <>See all <span className="n">{items.length}</span> →</>}
          </button>
        )}
      </div>

      {!all && (
        <div className="htrack" ref={track}>
          <div className="hsticky" ref={sticky}>
            <div className="hrail" ref={rail}>
              {items.map((it) => <Card item={it} key={it.id} onOpen={onOpen} />)}
            </div>
          </div>
        </div>
      )}

      {all && (
        <div className="grid-all">
          {items.map((it) => <Card item={it} key={it.id} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  );
}
