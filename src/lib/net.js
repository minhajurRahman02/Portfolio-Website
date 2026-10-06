/* The overlay menu's cover art: a drifting cloud of ~2,200 points joined by
   hairline edges, which reassembles into the icon of whichever link the
   pointer is on. Target points come from rasterising a 100×100 glyph path
   into an offscreen canvas and sampling the filled pixels, so adding a link
   means adding a path string and nothing else. */

const N = 2200;
const LINK = 26; // neighbour radius, in CSS px, for the edge pass

const GLYPH = {
  home: 'M14 52 L50 20 L86 52 L86 86 L62 86 L62 62 L38 62 L38 86 L14 86 Z',
  work: 'M16 34 H84 V84 H16 Z M36 34 V22 H64 V34',
  about:
    'M50 20 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0 M18 86 C18 62 32 52 50 52 C68 52 82 62 82 86',
  blog: 'M24 14 H62 L78 32 V88 H24 Z M36 50 H66 M36 64 H58',
  contact: 'M14 26 H86 V76 H14 Z M14 30 L50 56 L86 30',
  interests: 'M50 14 L61 40 L89 44 L69 64 L74 92 L50 78 L26 92 L31 64 L11 44 L39 40 Z',
};

function sample(d) {
  const off = document.createElement('canvas');
  off.width = 100;
  off.height = 100;
  const o = off.getContext('2d');
  o.strokeStyle = '#fff';
  o.lineWidth = 9;
  o.lineJoin = 'round';
  o.lineCap = 'round';
  o.stroke(new Path2D(d));
  const px = o.getImageData(0, 0, 100, 100).data;
  const hits = [];
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      if (px[(y * 100 + x) * 4 + 3] > 90) hits.push([x / 100, y / 100]);
    }
  }
  // shuffle, or point-to-pixel assignment produces visible banding
  for (let i = hits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = hits[i];
    hits[i] = hits[j];
    hits[j] = t;
  }
  return hits;
}

export function createNet(canvas) {
  const ctx = canvas ? canvas.getContext('2d') : null;
  let W = 0;
  let H = 0;
  let P = [];
  const shapes = {};
  let mix = 0;
  let mixT = 0;
  let live = false;

  function build() {
    P = [];
    for (let i = 0; i < N; i++) {
      P.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        tx: 0,
        ty: 0,
        r: Math.random() < 0.08 ? 1.3 : 0.65,
      });
    }
  }

  const api = {
    size() {
      if (!ctx) return;
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      const d = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = r.width * d;
      canvas.height = r.height * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      W = r.width;
      H = r.height;
      if (!P.length) build();
      else {
        P.forEach((p) => {
          if (p.x > W) p.x = Math.random() * W;
          if (p.y > H) p.y = Math.random() * H;
        });
      }
    },

    setLive(v) { live = v; },

    target(key) {
      if (!ctx) return;
      mixT = key ? 1 : 0;
      if (!key) return;
      if (!shapes[key]) shapes[key] = sample(GLYPH[key] || GLYPH.home);
      const pts = shapes[key];
      const n = pts.length;
      const S = Math.min(W, H) * 0.74;
      const ox = (W - S) / 2;
      const oy = (H - S) / 2;
      P.forEach((p, i) => {
        const q = pts[i % n];
        p.tx = ox + q[0] * S + (Math.random() - 0.5) * 2.4;
        p.ty = oy + q[1] * S + (Math.random() - 0.5) * 2.4;
      });
    },

    tick(dt) {
      if (!ctx || !W || !live) return;
      mix += (mixT - mix) * (1 - Math.pow(0.0015, dt / (mixT ? 0.42 : 0.75)));
      const f = dt * 60;
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        if (mix < 0.995) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
        }
        if (mix > 0.004) {
          p.x += (p.tx - p.x) * mix * 0.12 * f;
          p.y += (p.ty - p.y) * mix * 0.12 * f;
        }
      }

      /* edges via a uniform grid — O(n) instead of the O(n²) pair sweep */
      const cs = LINK;
      const cols = Math.ceil(W / cs) + 1;
      const grid = {};
      for (let i = 0; i < P.length; i++) {
        const k = Math.floor(P[i].y / cs) * cols + Math.floor(P[i].x / cs);
        (grid[k] || (grid[k] = [])).push(P[i]);
      }
      ctx.lineWidth = 0.45;
      ctx.strokeStyle = mix > 0.5 ? 'rgba(47,218,240,.5)' : 'rgba(150,140,230,.34)';
      ctx.beginPath();
      let drawn = 0;
      outer:
      for (const key in grid) {
        const cell = grid[key];
        const gx = key % cols;
        const gy = Math.floor(key / cols);
        for (let a = 0; a < cell.length; a++) {
          for (let dy = 0; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dy === 0 && dx < 0) continue;
              const nb = grid[(gy + dy) * cols + (gx + dx)];
              if (!nb) continue;
              for (let b = dy === 0 && dx === 0 ? a + 1 : 0; b < nb.length; b++) {
                const q = nb[b];
                const ddx = q.x - cell[a].x;
                const ddy = q.y - cell[a].y;
                if (ddx * ddx + ddy * ddy > cs * cs) continue;
                ctx.moveTo(cell[a].x, cell[a].y);
                ctx.lineTo(q.x, q.y);
                if (++drawn > 4200) break outer;
              }
            }
          }
        }
      }
      ctx.stroke();

      ctx.fillStyle = mix > 0.5 ? 'rgba(180,245,255,.9)' : 'rgba(205,200,255,.72)';
      for (let i = 0; i < P.length; i++) {
        ctx.beginPath();
        ctx.arc(P[i].x, P[i].y, P[i].r, 0, 6.283);
        ctx.fill();
      }
    },
  };

  return api;
}
