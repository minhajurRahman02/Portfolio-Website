/* The paper crane that travels through every scene. Flat origami facets,
   two tones per facet so it reads as folded paper under any light. Scenes
   return a pose from `crane(s)`; the engine draws it last. */
import { TAU } from './util.js';

const PAPER = { lit: '#FFF8EC', mid: '#EDE2CF', dark: '#C9B9A0', edge: 'rgba(80,60,40,.35)' };

/** flap: −1 (wings down) … 1 (wings up). dir: 1 = facing right. */
export function drawCrane(ctx, x, y, size, { flap = 0, rot = 0, dir = 1, a = 1, tint = null, glow = 0 } = {}) {
  if (a <= 0.01) return;
  const s = size / 40;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s * dir, s);
  ctx.globalAlpha = a;
  if (glow > 0) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 46);
    g.addColorStop(0, `rgba(255,236,200,${0.35 * glow})`);
    g.addColorStop(1, 'rgba(255,236,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-46, -46, 92, 92);
  }
  const wy = -flap * 22;      // wing tip height
  const wf = 10 + flap * 4;   // far wing shortening
  const poly = (pts, fill) => {
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (tint) { ctx.fillStyle = tint; ctx.fill(); }  // shade facet by facet, never the backdrop
    ctx.strokeStyle = PAPER.edge;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  };
  // far wing
  poly([[-4, -2], [6, -3], [2 - wf * 0.3, wy * 0.85 - 4]], PAPER.dark);
  // tail
  poly([[-6, 0], [-24, -16], [-10, -1]], PAPER.mid);
  // body (two facets)
  poly([[-10, -1], [0, -6], [12, -2], [0, 4]], PAPER.mid);
  poly([[-10, -1], [0, 4], [12, -2], [2, 1]], PAPER.lit);
  // neck and head
  poly([[8, -3], [22, -18], [12, -1]], PAPER.lit);
  poly([[22, -18], [27, -15], [21, -15.5]], PAPER.dark);
  // near wing
  poly([[-6, -2], [8, -2], [0, wy - 6], [-10, wy - 2]], PAPER.lit);
  poly([[-6, -2], [8, -2], [2, wy * 0.6 - 3]], PAPER.mid);
  ctx.restore();
}

/** keyframed path: [[p, x, y, size, perched], …] in viewport fractions */
export function pathPose(keys, p, t, W, H) {
  if (p < keys[0][0] || p > keys[keys.length - 1][0]) return null;
  let i = 1;
  while (i < keys.length - 1 && p > keys[i][0]) i++;
  const a = keys[i - 1], b = keys[i];
  const u = (p - a[0]) / Math.max(1e-4, b[0] - a[0]);
  const e = u * u * (3 - 2 * u);
  const x = (a[1] + (b[1] - a[1]) * e) * W;
  const y = (a[2] + (b[2] - a[2]) * e) * H;
  const size = (a[3] + (b[3] - a[3]) * e) * Math.min(W, H);
  const perched = a[4] && b[4];
  const dx = b[1] - a[1];
  const flap = perched ? -0.2 + Math.sin(t * 1.2) * 0.06 : Math.sin(t * 7.5);
  const bob = perched ? 0 : Math.sin(t * 7.5 + 1.2) * size * 0.06;
  return { x, y: y + bob, size, flap, dir: dx < 0 ? -1 : 1, rot: perched ? 0 : Math.max(-0.3, Math.min(0.3, (b[2] - a[2]) * 2)) };
}

export const CRANE_TAU = TAU;
