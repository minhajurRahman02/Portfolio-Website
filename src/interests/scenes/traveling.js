/* 01 · Traveling — "The Meadow Line"
   A two-car local train crosses meadow country in one continuous day.
   Scroll is the clock: pre-dawn, first light, noon, golden hour, dusk, stars.

   Painted, not drawn: every land layer is rendered per pixel once (rock lit
   by slope, grass and crops with texture, volumetric clouds, foliage built
   from lit dabs) in neutral daylight, then multiplied by the time-of-day
   light each frame — so dusk and night darken and recolour the scene while
   all of its shading stays visible. */
import { TRAVEL } from '../config.js';
import { TAU, clamp, lerp, ease, inv, bell, track, trackNum, rgb, mixRGB, hex2rgb, drawTiled } from '../util.js';
import { vgrad, glow, sunDisc, makeStars, drawStars, rr, haze } from '../paint.js';
import { mulTinter } from '../realism.js';
import { baked } from '../bakery.js';
import { field } from '../particles.js';
import { layer } from '../depth.js';

/* The painted layers (traveling-paint.js) take a few hundred ms of pure
   maths; bakery.js renders them in a Web Worker and keeps them across the
   scene being disposed. Until they land the scene shows its sky and a
   plain ground. */
export default function create() {
  let L = null;       // baked layers + geometry
  let dist = 0;       // distance travelled, px at depth 1

  /** attach the painted layers once they exist */
  function attach(P) {
    Object.assign(L, {
      ready: true,
      clouds: P.clouds.map((c) => ({ ...c, tint: mulTinter(c.spr) })),
      far: P.far, farT: mulTinter(P.far), farG: mulTinter(P.far), hills: P.hills, hillsT: mulTinter(P.hills),
      fields: P.fields, fieldsT: mulTinter(P.fields), emb: P.emb, embT: mulTinter(P.emb),
      train: P.train, trainT: mulTinter(P.train), grass: P.grass, grassT: mulTinter(P.grass),
      pole: P.pole, poleT: mulTinter(P.pole), topY: P.topY,
      carW: P.carW, carH: P.carH, trW: P.trW, trH: P.trH, wins: P.wins, nWin: P.nWin,
      winSeed: Array.from({ length: P.nWin * 2 }, (_, k) => 0.7 + ((k * 7) % (P.nWin * 2)) / (P.nWin * 2) * 0.13),
    });
  }

  function build(env) {
    const { W, H, dpr, mobile, pscale } = env;
    const key = `${W}x${H}x${dpr}`;
    const horizon = H * 0.6;
    const railY = H * 0.8;

    const stars = makeStars(61, mobile ? 140 : 260, W, horizon, 1);
    const pollen = field({ n: Math.round(TRAVEL.pollen * pscale), seed: 3, box: [0, H * 0.3, W, H * 0.7], vx: [-60, -20], vy: [-10, 6], size: [0.8, 2], life: [5, 10], color: '#FFF3C4', style: 'dot', wobble: 14 });
    const flies = field({ n: Math.round(TRAVEL.fireflies * pscale), seed: 4, box: [0, H * 0.55, W, H * 0.45], vx: [-28, -8], vy: [-8, 8], size: [1.2, 2.4], life: [4, 9], color: '#FFE58A', style: 'glow', wobble: 18 });

    L = { key, env, W, H, horizon, railY, stars, pollen, flies, ready: false };
    const P = baked('traveling', env);
    if (P) attach(P);
  }

  function trainPos(s) {
    const { W } = s;
    const x = W * 0.16 + s.p * W * 0.07;
    const bob = Math.sin(s.t * 9) * 0.7 + Math.sin(s.t * 13.7) * 0.4;
    const y = L.railY - L.carH - 15 + bob;
    return { x, y };
  }

  function update(s) {
    if (!L) return;
    if (!L.ready) { const P = baked('traveling', L.env); if (P) attach(P); }
    dist += s.dt * TRAVEL.speed * (1 + Math.min(3, Math.abs(s.vel) / 700));
    L.pollen.update(s.dt);
    L.flies.update(s.dt);
  }

  function draw(ctx, s) {
    if (!L) return;
    const { W, H, p, t } = s;
    const K = TRAVEL.sky;
    const top = track(K, p, 1), mid = track(K, p, 2), hor = track(K, p, 3);
    const land = track(K, p, 4);
    const tintA = trackNum(K, p, 5);
    const cloudC = track(K, p, 6);
    const night = ease(0.74, 0.9, p);
    const D = TRAVEL.depth;

    // where the sun is: it climbs fast to noon and lingers low through golden hour
    const su = inv(0.06, 0.78, p);
    const el = p < 0.3 ? Math.sin(inv(0.06, 0.3, p) * Math.PI / 2) : 1 - Math.pow(inv(0.3, 0.76, p), 0.8);
    const sunX = lerp(0.1, 0.84, su) * W;
    const sunY = L.horizon + 14 - el * H * 0.48;
    const sunUp = su > 0 && su < 1;
    const low = sunUp ? 1 - el : 0;          // 1 at sunrise/sunset, 0 at noon

    /* sky: zenith → mid → horizon, with scattered light pooling around the sun */
    layer(ctx, s, 0, () => {
      ctx.fillStyle = vgrad(ctx, 0, 0, L.horizon + 20, [[0, rgb(top)], [0.5, rgb(mid)], [0.86, rgb(mixRGB(mid, hor, 0.7))], [1, rgb(hor)]]);
      ctx.fillRect(-40, -40, W + 80, L.horizon + 80);
      ctx.fillStyle = rgb(hor);
      ctx.fillRect(-40, L.horizon + 20, W + 80, H);
      drawStars(ctx, L.stars, t, night);
      if (sunUp) {
        const core = rgb(mixRGB(hex2rgb('#FFB070'), hex2rgb('#FFFBEA'), el));
        const halo = rgb(mixRGB(hex2rgb('#FF7A3C'), hex2rgb('#FFF4D0'), el));
        // a wide warm band along the horizon under a low sun
        if (low > 0.05) {
          const g = ctx.createRadialGradient(sunX, L.horizon, 0, sunX, L.horizon, W * 0.75);
          g.addColorStop(0, `rgba(255,170,100,${0.42 * low})`); g.addColorStop(0.45, `rgba(255,140,90,${0.16 * low})`); g.addColorStop(1, 'rgba(255,140,90,0)');
          ctx.fillStyle = g; ctx.fillRect(-40, 0, W + 80, L.horizon + 30);
        }
        glow(ctx, sunX, sunY, Math.max(W, H) * 0.55, halo, 0.32 * low + 0.06);
        glow(ctx, sunX, sunY, Math.min(W, H) * 0.14, '#FFF6DC', 0.5);
        sunDisc(ctx, sunX, sunY, Math.min(W, H) * (0.026 + low * 0.012), core, halo, 1);
      }
      // moon, with a soft halo and a few maria
      const mu = ease(0.72, 1, p);
      if (mu > 0) {
        const mxp = W * (0.22 + mu * 0.1), myp = L.horizon - mu * H * 0.42, mr = Math.min(W, H) * 0.022;
        glow(ctx, mxp, myp, H * 0.22, '#BFD2FF', 0.28 * mu);
        ctx.globalAlpha = mu;
        const g = ctx.createRadialGradient(mxp - mr * 0.3, myp - mr * 0.3, mr * 0.1, mxp, myp, mr);
        g.addColorStop(0, '#FBFAF2'); g.addColorStop(1, '#D9D7CC');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mxp, myp, mr, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(150,150,160,.28)';
        ctx.beginPath(); ctx.arc(mxp - mr * 0.3, myp - mr * 0.2, mr * 0.28, 0, TAU); ctx.arc(mxp + mr * 0.3, myp + mr * 0.25, mr * 0.18, 0, TAU); ctx.arc(mxp + mr * 0.1, myp - mr * 0.4, mr * 0.12, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    /* the painted layers are still on their way from the worker: a plain
       ground under the live sky, for the fraction of a second it takes */
    if (!L.ready) {
      ctx.fillStyle = vgrad(ctx, 0, L.horizon - 30, H, [[0, rgb(mixRGB(hor, [60, 80, 70], 0.5))], [0.25, rgb(mixRGB([70, 104, 58], land, tintA))], [1, rgb(mixRGB([34, 52, 30], land, tintA))]]);
      ctx.fillRect(-40, L.horizon - 30, W + 80, H);
      return;
    }

    /* clouds: lit like the land, plus a warm underside at sunrise and sunset */
    const cloudAmt = clamp(0.2 + tintA * 0.8);
    for (const c of L.clouds) {
      layer(ctx, s, c.d, () => {
        const span = W * 2.2 + c.spr.w;
        const x = ((c.x - dist * c.d * 0.6 - t * 6) % span + span) % span - c.spr.w;
        ctx.globalAlpha = 0.96 - night * 0.3;
        ctx.drawImage(c.tint(cloudC, cloudAmt), x, c.y, c.spr.w, c.spr.h);
        ctx.globalAlpha = 1;
      });
    }

    /* far ranges → hills → fields, each a little hazier than the next */
    layer(ctx, s, D.far, () => {
      const fy = L.horizon - L.far.h * 0.9;
      drawTiled(ctx, L.farT(land, clamp(tintA * 0.9 + 0.04)), dist * D.far, fy, W);
      // alpenglow: a low sun turns the snow pink-gold. Screening a warm copy
      // brightens the snow far more than the dark rock, as the real thing does.
      const glowA = low * (1 - night) * clamp((el < 0.5 ? 1 : 0) + 0.4);
      if (glowA > 0.03) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.55 * glowA;
        drawTiled(ctx, L.farG([255, 128, 88], 1), dist * D.far, fy, W);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      haze(ctx, W, L.horizon - L.far.h * 0.35, L.far.h * 0.6, rgb(hor), 0.4);
    });
    layer(ctx, s, D.hills, () => {
      drawTiled(ctx, L.hillsT(land, tintA), dist * D.hills, L.horizon - L.hills.h * 0.38, W);
      haze(ctx, W, L.horizon - 8, L.hills.h * 0.35, rgb(hor), 0.2);
    });
    layer(ctx, s, D.fields, () => {
      drawTiled(ctx, L.fieldsT(land, tintA), dist * D.fields, L.horizon + L.hills.h * 0.5, W);
      haze(ctx, W, L.horizon + L.hills.h * 0.5, L.fields.h * 0.3, rgb(hor), 0.12);
    });

    /* rail bank, train and its window light */
    layer(ctx, s, D.rail, () => {
      drawTiled(ctx, L.embT(land, tintA), dist * 1.0, L.railY - L.emb.h * 0.22, W);
      ctx.fillStyle = rgb(mixRGB(hex2rgb('#3F5530'), mixRGB(hex2rgb('#3F5530'), land, 0.5), tintA));
      ctx.fillRect(-40, L.railY - L.emb.h * 0.22 + L.emb.h - 1, W + 80, H);
      const { x, y } = trainPos(s);
      // contact shadow, longer and softer when the sun is low
      ctx.fillStyle = vgrad(ctx, 0, L.railY, L.railY + 9, [[0, `rgba(0,0,0,${0.32 * (1 - night)})`], [1, 'rgba(0,0,0,0)']]);
      ctx.fillRect(x + low * 30, L.railY + 1, L.trW - 20, 9);
      ctx.drawImage(L.trainT(land, tintA * 0.85), x, y, L.trW, L.trH);
      // a low sun rakes the body with warm light
      if (low > 0.2 && night < 0.5) {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = `rgba(255,160,80,${0.35 * low * (1 - night)})`;
        ctx.fillRect(x, y, L.trW, L.trH * 0.75);
        ctx.globalCompositeOperation = 'source-over';
      }
      // windows: sky reflections by day, warm light and passengers by night
      for (const wdw of L.wins) {
        const wx = x + wdw.x, wy = y + wdw.y;
        const on = ease(L.winSeed[wdw.k], L.winSeed[wdw.k] + 0.02, p);
        const flick = on > 0 && on < 1 ? (Math.sin(t * 60 + wdw.k) > 0 ? 1 : 0.4) : 1;
        ctx.save();
        rr(ctx, wx, wy, wdw.w, wdw.h, 3.5);
        ctx.clip();
        ctx.fillStyle = vgrad(ctx, 0, wy, wy + wdw.h, [[0, rgb(mixRGB(mid, [20, 28, 30], 0.35))], [0.6, rgb(mixRGB(hor, [20, 28, 30], 0.5))], [1, '#1A2220']]);
        ctx.fillRect(wx, wy, wdw.w, wdw.h);
        // the far horizon slides across the glass
        ctx.fillStyle = 'rgba(40,60,45,.35)';
        ctx.fillRect(wx, wy + wdw.h * 0.62, wdw.w, wdw.h * 0.4);
        ctx.fillStyle = 'rgba(255,255,255,.2)';
        ctx.beginPath(); ctx.moveTo(wx + wdw.w * 0.2, wy); ctx.lineTo(wx + wdw.w * 0.45, wy); ctx.lineTo(wx + wdw.w * 0.1, wy + wdw.h); ctx.lineTo(wx - wdw.w * 0.15, wy + wdw.h); ctx.fill();
        if (on > 0) {
          ctx.globalAlpha = on * flick;
          ctx.fillStyle = vgrad(ctx, 0, wy, wy + wdw.h, [[0, '#FFE6A6'], [1, '#F0B462']]);
          ctx.fillRect(wx, wy, wdw.w, wdw.h);
          if (wdw.k % 3 !== 1) {
            ctx.fillStyle = 'rgba(70,40,20,.55)';
            const hx = wx + wdw.w * (0.35 + (wdw.k % 2) * 0.3);
            ctx.beginPath(); ctx.arc(hx, wy + wdw.h * 0.55, wdw.h * 0.2, 0, TAU); ctx.fill();
            ctx.fillRect(hx - wdw.h * 0.28, wy + wdw.h * 0.72, wdw.h * 0.56, wdw.h * 0.4);
          }
          ctx.globalAlpha = 1;
        }
        ctx.restore();
        if (on > 0.05) {
          glow(ctx, wx + wdw.w / 2, wy + wdw.h / 2, wdw.w * 1.6, '#FFC36A', 0.35 * on * flick);
          // light pool thrown onto the bank, travelling with the train
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = `rgba(255,190,100,${0.16 * on * flick})`;
          const py = L.railY + 6;
          ctx.beginPath();
          ctx.moveTo(wx - 4, py); ctx.lineTo(wx + wdw.w + 4, py);
          ctx.lineTo(wx + wdw.w + 22, py + L.emb.h * 0.7); ctx.lineTo(wx + 8, py + L.emb.h * 0.7);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      // headlight
      const hl = ease(0.66, 0.78, p);
      if (hl > 0) {
        const hx = x + L.carW * 2 + 8 + 15, hy = y + L.carH * 0.76;
        glow(ctx, hx, hy, 40, '#FFF2C8', 0.8 * hl);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(hx, hy, hx + W * 0.4, hy);
        g.addColorStop(0, `rgba(255,240,200,${0.22 * hl})`); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(hx, hy - 3); ctx.lineTo(hx + W * 0.4, hy - 40); ctx.lineTo(hx + W * 0.4, hy + 30); ctx.closePath(); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    });

    /* telegraph poles and sagging wires, at foreground speed */
    layer(ctx, s, D.poles, () => {
      const S = Math.max(380, W * 0.78);
      const off = (dist * D.poles) % S;
      const topY = L.topY;
      const xs = [];
      for (let k = -1; k < W / S + 2; k++) xs.push(k * S - off + S * 0.5);
      const wireC = rgb(mixRGB(hex2rgb('#2A241F'), hex2rgb('#070A14'), clamp(tintA + night * 0.5)));
      ctx.strokeStyle = wireC;
      ctx.lineWidth = 1.1;
      for (let w = 0; w < 3; w++) {
        const ax = -31 + w * 30, wy = topY + 1.5;
        for (let k = 0; k < xs.length - 1; k++) {
          ctx.beginPath(); ctx.moveTo(xs[k] + ax, wy);
          ctx.quadraticCurveTo((xs[k] + xs[k + 1]) / 2 + ax, wy + H * 0.07, xs[k + 1] + ax, wy);
          ctx.stroke();
        }
      }
      const pole = L.poleT(land, clamp(tintA + night * 0.3));
      for (const px of xs) ctx.drawImage(pole, px - pole.w / 2, topY, pole.w, pole.h);
    });

    /* foreground meadow, blurred by speed */
    layer(ctx, s, D.grass, () => {
      drawTiled(ctx, L.grassT(land, tintA), dist * D.grass, H - L.grass.h * 0.92, W);
    });

    /* pollen by day, fireflies by night */
    L.pollen.draw(ctx, (1 - night) * bell(0.1, 0.75, p) * 0.8);
    L.flies.draw(ctx, night);
  }

  return {
    build, update, draw,
    dispose() { L = null; },
    anchor(s) {
      if (!L || !L.ready) return null;
      const { x, y } = trainPos(s);
      const w = L.wins[L.nWin + 2];
      return { x: x + w.x, y: y + w.y, w: w.w, h: w.h, r: 3.5 };
    },
    crane(s) {
      if (!L || !L.ready) return null;
      const { x, y } = trainPos(s);
      const roofX = x + L.carW * 0.55, roofY = y - 4;
      const size = Math.min(s.W, s.H) * 0.05;
      if (s.p < 0.3) return { x: roofX, y: roofY - size * 0.25, size, flap: -0.2 + Math.sin(s.t * 1.3) * 0.05, dir: 1, rot: 0 };
      const u = ease(0.3, 0.68, s.p);
      if (u >= 1) return null;
      return {
        x: lerp(roofX, s.W * 1.08, u), y: lerp(roofY - size * 0.25, s.H * 0.16, Math.pow(u, 0.7)),
        size: size * (1 - u * 0.3), flap: Math.sin(s.t * 8), dir: 1, rot: -0.2 * Math.sin(u * Math.PI),
      };
    },
  };
}
