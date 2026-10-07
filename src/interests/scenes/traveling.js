/* 01 · Traveling — "The Meadow Line"
   A two-car local train crosses meadow country in one continuous day.
   Scroll is the clock: pre-dawn, first light, noon, golden hour, dusk, stars.
   Land layers are baked once in neutral daylight and re-tinted per frame
   from the time-of-day track, so one grade washes the whole scene. */
import { TRAVEL } from '../config.js';
import { TAU, rng, clamp, lerp, ease, inv, smooth, bell, track, trackNum, rgb, mixRGB, hex2rgb, bake, tinter, drawTiled, smeared, blurred, pnoise } from '../util.js';
import { vgrad, glow, sunDisc, ridge, cloudSprite, treeClump, makeStars, drawStars, rr, haze, speckle } from '../paint.js';
import { field } from '../particles.js';
import { layer } from '../depth.js';

export default function create() {
  let L = null;       // baked layers + geometry
  let dist = 0;       // distance travelled, px at depth 1

  function build(env) {
    const { W, H, dpr, mobile, pscale } = env;
    const horizon = H * 0.6;
    const r = rng(101);

    /* clouds: a handful of sprites spread over a wrapping 2.2W band */
    const clouds = [];
    const nC = mobile ? 5 : 8;
    for (let i = 0; i < nC; i++) {
      const cw = W * r.range(0.22, 0.42) * (mobile ? 1.6 : 1);
      const ch = cw * r.range(0.32, 0.46);
      const spr = cloudSprite(200 + i, Math.round(cw), Math.round(ch), { soft: 2.5 });
      clouds.push({ spr, tint: tinter(spr), x: r() * W * 2.2, y: H * r.range(0.06, 0.36), d: r.range(0.03, 0.08) });
    }

    /* far mountains: two hazed ranges with snow on the tallest */
    const farW = Math.round(Math.max(W * 1.4, 1000));
    const farH = Math.round(H * 0.34);
    const far = bake(farW, farH, dpr, (x, w, h) => {
      ridge(x, w, h, { base: h * 0.45, amp: h * 0.32, seed: 11, oct: 6, rough: 0.52, sharp: 0.4,
        fill: vgrad(x, 0, h * 0.1, h, [[0, '#B7C9E2'], [1, '#C9D7E8']]) });
      const top = ridge(x, w, h, { base: h * 0.66, amp: h * 0.3, seed: 12, oct: 6, rough: 0.55, sharp: 0.5,
        fill: vgrad(x, 0, h * 0.3, h, [[0, '#8FA6C6'], [1, '#A9BCD6']]), rim: 'rgba(255,255,255,.35)' });
      // snow caps where the near range peaks
      x.fillStyle = 'rgba(245,248,255,.8)';
      for (let px = 0; px < w; px += 2) {
        const y = top(px / w);
        if (y < h * 0.46) x.fillRect(px, y, 2, (h * 0.46 - y) * 0.55);
      }
    });

    /* rolling hills with tree lines and a few farmhouses */
    const hillW = Math.round(W * 1.6), hillH = Math.round(H * 0.3);
    const hills = bake(hillW, hillH, dpr, (x, w, h) => {
      const top = ridge(x, w, h, { base: h * 0.42, amp: h * 0.18, seed: 21, oct: 4, rough: 0.5,
        fill: vgrad(x, 0, h * 0.2, h, [[0, '#7FAE6A'], [1, '#5E8F4E']]), rim: 'rgba(230,255,200,.5)', rimW: 1.6 });
      const rr2 = rng(22);
      for (let px = 0; px < w; px += rr2.range(10, 26)) {
        const y = top(px / w);
        if (rr2() < 0.55) treeClump(x, px, y + 2, rr2.range(5, 11), rr2, '#3E6B3A', '#4F7F45', '#6C9C55');
      }
      // farmhouses
      for (let k = 0; k < 5; k++) {
        const px = rr2() * (w - 40) + 20;
        const y = top(px / w) + h * rr2.range(0.12, 0.3);
        const s = rr2.range(8, 13);
        x.fillStyle = '#E9DEC6'; x.fillRect(px, y - s, s * 1.6, s);
        x.fillStyle = '#B4533C';
        x.beginPath(); x.moveTo(px - 2, y - s); x.lineTo(px + s * 0.8, y - s * 1.7); x.lineTo(px + s * 1.6 + 2, y - s); x.fill();
        x.fillStyle = '#5A4A3A'; x.fillRect(px + s * 0.25, y - s * 0.6, s * 0.3, s * 0.6);
        treeClump(x, px + s * 2.3, y, s * 0.9, rr2, '#3E6B3A', '#4F7F45', '#6C9C55');
      }
      // second, nearer hill shoulder
      ridge(x, w, h, { base: h * 0.82, amp: h * 0.12, seed: 23, oct: 3, rough: 0.5,
        fill: vgrad(x, 0, h * 0.6, h, [[0, '#6E9E57'], [1, '#5A8A47']]), rim: 'rgba(230,255,190,.35)' });
    });

    /* fields: patchwork strips, hedgerows, big lone trees */
    const fW = Math.round(W * 1.8), fH = Math.round(H * 0.2);
    const fields = bake(fW, fH, dpr, (x, w, h) => {
      const rr2 = rng(31);
      const cols = ['#9DBE5E', '#B7C96A', '#8DB357', '#C9C277', '#7FAA4E', '#D6C46C'];
      let px = 0;
      while (px < w) {
        const fw = rr2.range(60, 190);
        x.fillStyle = rr2.pick(cols);
        x.fillRect(px, 0, fw + 1, h);
        // furrows
        x.strokeStyle = 'rgba(60,80,30,.12)';
        x.lineWidth = 1;
        for (let fy = 4; fy < h; fy += 5 + fy * 0.08) { x.beginPath(); x.moveTo(px, fy); x.lineTo(px + fw, fy); x.stroke(); }
        // hedgerow
        x.fillStyle = '#4C7A3C';
        x.fillRect(px + fw - 2, 0, 4, h);
        for (let hy = 0; hy < h; hy += 9) treeClump(x, px + fw, hy + 4, rr2.range(3, 6), rr2, '#3B6633', '#4D7C41', null);
        px += fw;
      }
      for (let k = 0; k < 7; k++) {
        const tx = rr2() * w, ty = h * rr2.range(0.35, 0.7);
        x.fillStyle = '#4A3A2A'; x.fillRect(tx - 1.5, ty - 6, 3, 10);
        treeClump(x, tx, ty - 4, rr2.range(10, 16), rr2, '#355E30', '#467A3D', '#6A9C52');
      }
      // haystacks
      for (let k = 0; k < 9; k++) {
        const hx = rr2() * w, hy = h * rr2.range(0.4, 0.95);
        x.fillStyle = '#D8B865';
        x.beginPath(); x.ellipse(hx, hy, 5, 4, 0, Math.PI, 0); x.fill();
        x.fillStyle = 'rgba(120,90,40,.4)'; x.fillRect(hx - 5, hy, 10, 1.2);
      }
      // the top edge softens into the hills
      x.globalCompositeOperation = 'destination-out';
      x.fillStyle = vgrad(x, 0, 0, h * 0.25, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]);
      x.fillRect(0, 0, w, h * 0.25);
      x.globalCompositeOperation = 'source-over';
    });

    /* embankment, ballast and sleepers — repeats every 480px */
    const railY = H * 0.8;
    const eH = Math.round(H * 0.16);
    const emb = bake(480, eH, dpr, (x, w, h) => {
      x.fillStyle = vgrad(x, 0, 0, h, [[0, '#7E9B57'], [0.18, '#6C8B4A'], [0.3, '#8C8274'], [1, '#6F665A']]);
      x.fillRect(0, 0, w, h);
      speckle(x, 0, h * 0.25, w, h * 0.75, 900, ['#A79D8D', '#5B5348', '#C2B8A6'], 41, 0.8, 2.2, 0.5);
      x.fillStyle = '#4E4136';
      for (let sx = 0; sx < w; sx += 24) x.fillRect(sx, h * 0.24, 14, 5);
      x.fillStyle = '#B9BEC4'; x.fillRect(0, h * 0.22, w, 2.2);
      x.fillStyle = '#6E737A'; x.fillRect(0, h * 0.22 + 2.2, w, 1.5);
      // grass tufts on the bank
      const rr2 = rng(42);
      for (let k = 0; k < 60; k++) {
        const gx = rr2() * w, gy = h * rr2.range(0.0, 0.2);
        x.strokeStyle = rr2.pick(['#5E8A42', '#86AE5A', '#4C7536']);
        x.lineWidth = 1.2;
        x.beginPath(); x.moveTo(gx, gy + 4); x.lineTo(gx + rr2.range(-2, 2), gy - rr2.range(2, 7)); x.stroke();
      }
    });

    /* the train body, baked once and tinted with the land */
    const carW = Math.round(clamp(W * 0.29, 230, 470));
    const carH = Math.round(carW * 0.26);
    const gap = 8;
    const trW = carW * 2 + gap + 30, trH = carH + 26;
    const nWin = 6;
    const wins = [];
    const train = bake(trW, trH, dpr, (x) => {
      for (let c = 0; c < 2; c++) {
        const ox = c * (carW + gap);
        const front = c === 1;
        // body
        x.save();
        x.beginPath();
        if (front) {
          x.moveTo(ox + 6, 8); x.lineTo(ox + carW - 18, 8);
          x.quadraticCurveTo(ox + carW + 16, 10, ox + carW + 18, carH * 0.62);
          x.lineTo(ox + carW + 18, carH + 4); x.lineTo(ox + 6, carH + 4);
          x.quadraticCurveTo(ox, carH + 4, ox, carH - 2); x.lineTo(ox, 14); x.quadraticCurveTo(ox, 8, ox + 6, 8);
        } else rr(x, ox, 8, carW, carH - 4, 7);
        x.closePath();
        x.clip();
        x.fillStyle = '#EFE6CF'; x.fillRect(ox - 2, 0, carW + 24, carH + 8);
        x.fillStyle = '#2F5D50'; x.fillRect(ox - 2, carH * 0.66, carW + 24, carH * 0.4);
        x.fillStyle = '#C8553D'; x.fillRect(ox - 2, carH * 0.62, carW + 24, 3);
        x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(ox - 2, 9, carW + 24, 2);
        x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(ox - 2, carH * 0.9, carW + 24, carH * 0.2);
        x.restore();
        // roof
        x.fillStyle = '#7A7F86';
        rr(x, ox + 4, 2, carW - (front ? 22 : 8), 9, 4); x.fill();
        x.fillStyle = '#5E636A';
        for (let v = 0; v < 3; v++) x.fillRect(ox + carW * (0.2 + v * 0.25), 0, 16, 4);
        // door seams
        x.strokeStyle = 'rgba(40,50,45,.35)'; x.lineWidth = 1;
        for (const dx of [0.12, 0.88]) { x.strokeRect(ox + carW * dx - 7, carH * 0.2, 14, carH * 0.75); }
        // window cut-outs (filled live); record their rects
        for (let k = 0; k < nWin; k++) {
          const wx = ox + carW * 0.2 + k * (carW * 0.6 / nWin) + 3;
          const ww = carW * 0.6 / nWin - 6, wh = carH * 0.3;
          wins.push({ x: wx, y: carH * 0.22, w: ww, h: wh, k: c * nWin + k });
          x.fillStyle = '#26322E';
          rr(x, wx - 1.5, carH * 0.22 - 1.5, ww + 3, wh + 3, 4); x.fill();
        }
        if (front) {
          x.fillStyle = '#26322E';
          x.beginPath(); x.moveTo(ox + carW - 6, carH * 0.2); x.lineTo(ox + carW + 8, carH * 0.22); x.lineTo(ox + carW + 13, carH * 0.5); x.lineTo(ox + carW - 6, carH * 0.5); x.fill();
        }
        // bogies and wheels
        x.fillStyle = '#2A2B2E';
        for (const bx of [0.18, 0.82]) {
          x.fillRect(ox + carW * bx - 22, carH + 3, 44, 7);
          for (const wx of [-13, 13]) { x.beginPath(); x.arc(ox + carW * bx + wx, carH + 12, 6.5, 0, TAU); x.fill(); }
        }
      }
      // coupling
      x.fillStyle = '#2A2B2E'; x.fillRect(carW - 2, carH * 0.6, gap + 4, 5);
    });

    /* foreground meadow grass, motion-smeared */
    const gW = Math.round(W * 1.3), gH = Math.round(H * 0.24);
    const grassRaw = bake(gW, gH, dpr, (x, w, h) => {
      const rr2 = rng(51);
      x.fillStyle = vgrad(x, 0, h * 0.5, h, [[0, 'rgba(70,110,50,0)'], [0.4, '#4E7A3A'], [1, '#3D6230']]);
      x.fillRect(0, 0, w, h);
      const n = Math.round(w * 0.9);
      for (let k = 0; k < n; k++) {
        const gx = rr2() * w, base = h * rr2.range(0.55, 1.05), gh = h * rr2.range(0.25, 0.85);
        x.strokeStyle = rr2.pick(['#5C8C40', '#73A24C', '#4A7535', '#8DB85A', '#3F682F']);
        x.lineWidth = rr2.range(1, 2.6);
        x.beginPath(); x.moveTo(gx, base); x.quadraticCurveTo(gx + rr2.range(-6, 6), base - gh * 0.5, gx + rr2.range(-12, 12), base - gh); x.stroke();
      }
      for (let k = 0; k < w * 0.06; k++) {
        const fx = rr2() * w, fy = h * rr2.range(0.25, 0.8);
        x.fillStyle = rr2.pick(['#FFF6E0', '#FFD95A', '#C9A7F0', '#FF9E9E', '#FFFFFF']);
        x.beginPath(); x.arc(fx, fy, rr2.range(1.4, 3), 0, TAU); x.fill();
      }
    });
    const grass = smeared(blurred(grassRaw, 1.6), mobile ? 4 : 6);

    const stars = makeStars(61, mobile ? 140 : 260, W, horizon, 1);
    const pollen = field({ n: Math.round(TRAVEL.pollen * pscale), seed: 3, box: [0, H * 0.3, W, H * 0.7], vx: [-60, -20], vy: [-10, 6], size: [0.8, 2], life: [5, 10], color: '#FFF3C4', style: 'dot', wobble: 14 });
    const flies = field({ n: Math.round(TRAVEL.fireflies * pscale), seed: 4, box: [0, H * 0.55, W, H * 0.45], vx: [-28, -8], vy: [-8, 8], size: [1.2, 2.4], life: [4, 9], color: '#FFE58A', style: 'glow', wobble: 18 });

    L = {
      W, H, horizon, railY, clouds,
      far, farT: tinter(far), hills, hillsT: tinter(hills), fields, fieldsT: tinter(fields),
      emb, embT: tinter(emb), train, trainT: tinter(train), grass, grassT: tinter(grass),
      carW, carH, trW, trH, wins, stars, pollen, flies, nWin,
      winOrder: rng(77), winSeed: Array.from({ length: nWin * 2 }, (_, k) => 0.7 + ((k * 7) % (nWin * 2)) / (nWin * 2) * 0.13),
    };
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
    dist += s.dt * TRAVEL.speed * (1 + Math.min(3, Math.abs(s.vel) / 700));
    L.pollen.update(s.dt);
    L.flies.update(s.dt);
  }

  function draw(ctx, s) {
    if (!L) return;
    const { W, H, p, t } = s;
    const K = TRAVEL.sky;
    const top = track(K, p, 1), mid = track(K, p, 2), hor = track(K, p, 3);
    const tintC = rgb(track(K, p, 4));
    const tintA = trackNum(K, p, 5);
    const cloudC = rgb(track(K, p, 6));
    const night = ease(0.74, 0.9, p);
    const D = TRAVEL.depth;

    /* sky */
    layer(ctx, s, 0, () => {
      ctx.fillStyle = vgrad(ctx, 0, 0, L.horizon + 20, [[0, rgb(top)], [0.55, rgb(mid)], [1, rgb(hor)]]);
      ctx.fillRect(-40, -40, W + 80, L.horizon + 80);
      ctx.fillStyle = rgb(hor);
      ctx.fillRect(-40, L.horizon + 20, W + 80, H);
      drawStars(ctx, L.stars, t, night);
      // sun arc
      // the sun climbs fast to noon and lingers low through golden hour
      const su = inv(0.06, 0.78, p);
      if (su > 0 && su < 1) {
        const el = p < 0.3 ? Math.sin(inv(0.06, 0.3, p) * Math.PI / 2) : 1 - Math.pow(inv(0.3, 0.76, p), 0.8);
        const sx = lerp(0.1, 0.84, su) * W;
        const sy = L.horizon + 14 - el * H * 0.48;
        const core = rgb(mixRGB(hex2rgb('#FFB070'), hex2rgb('#FFFBEA'), el));
        const halo = rgb(mixRGB(hex2rgb('#FF7A3C'), hex2rgb('#FFF4D0'), el));
        glow(ctx, sx, sy, Math.max(W, H) * 0.55, halo, 0.32 * (1 - el));
        sunDisc(ctx, sx, sy, Math.min(W, H) * (0.028 + (1 - el) * 0.012), core, halo, 1);
      }
      // moon
      const mu = ease(0.72, 1, p);
      if (mu > 0) {
        const mxp = W * (0.22 + mu * 0.1), myp = L.horizon - mu * H * 0.42;
        glow(ctx, mxp, myp, H * 0.2, '#BFD2FF', 0.25 * mu);
        ctx.globalAlpha = mu;
        ctx.fillStyle = '#F2F0E6';
        ctx.beginPath(); ctx.arc(mxp, myp, Math.min(W, H) * 0.022, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(160,160,170,.35)';
        ctx.beginPath(); ctx.arc(mxp - 4, myp - 3, 4, 0, TAU); ctx.arc(mxp + 5, myp + 4, 2.6, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    /* clouds */
    for (const c of L.clouds) {
      layer(ctx, s, c.d, () => {
        const span = W * 2.2 + c.spr.width;
        let x = ((c.x - dist * c.d * 0.6 - t * 6) % span + span) % span - c.spr.width;
        const img = c.tint(cloudC, clamp(0.25 + tintA * 0.75));
        ctx.globalAlpha = 0.95 - night * 0.35;
        ctx.drawImage(img, x, c.y, c.spr.width, c.spr.height);
        ctx.globalAlpha = 1;
      });
    }

    /* far mountains → hills → fields: tinted, hazed toward the current horizon */
    layer(ctx, s, D.far, () => {
      drawTiled(ctx, L.farT(tintC, clamp(tintA * 0.9 + 0.05)), dist * D.far, L.horizon - L.far.h * 0.9, W);
      haze(ctx, W, L.horizon - L.far.h * 0.4, L.far.h * 0.7, rgb(hor), 0.45);
    });
    layer(ctx, s, D.hills, () => {
      drawTiled(ctx, L.hillsT(tintC, tintA), dist * D.hills, L.horizon - L.hills.h * 0.38, W);
      haze(ctx, W, L.horizon - 10, L.hills.h * 0.4, rgb(hor), 0.22);
    });
    layer(ctx, s, D.fields, () => {
      drawTiled(ctx, L.fieldsT(tintC, tintA), dist * D.fields, L.horizon + L.hills.h * 0.5, W);
    });

    /* rail bank, train and its window light */
    layer(ctx, s, D.rail, () => {
      const embImg = L.embT(tintC, tintA);
      drawTiled(ctx, embImg, dist * 1.0, L.railY - L.emb.h * 0.22, W);
      ctx.fillStyle = rgb(mixRGB(hex2rgb('#6F665A'), track(K, p, 4), tintA));
      ctx.fillRect(-40, L.railY - L.emb.h * 0.22 + L.emb.h - 1, W + 80, H);
      const { x, y } = trainPos(s);
      // shadow
      ctx.fillStyle = `rgba(0,0,0,${0.18 * (1 - night)})`;
      ctx.fillRect(x, L.railY + 2, L.trW - 30, 6);
      ctx.drawImage(L.trainT(tintC, tintA * 0.85), x, y, L.trW, L.trH);
      // windows: sky reflections by day, warm light and passengers by night
      for (const wdw of L.wins) {
        const wx = x + wdw.x, wy = y + wdw.y;
        const on = ease(L.winSeed[wdw.k], L.winSeed[wdw.k] + 0.02, p);
        const flick = on > 0 && on < 1 ? (Math.sin(t * 60 + wdw.k) > 0 ? 1 : 0.4) : 1;
        ctx.save();
        rr(ctx, wx, wy, wdw.w, wdw.h, 3.5);
        ctx.clip();
        ctx.fillStyle = vgrad(ctx, 0, wy, wy + wdw.h, [[0, rgb(mid)], [1, rgb(hor)]]);
        ctx.fillRect(wx, wy, wdw.w, wdw.h);
        ctx.fillStyle = 'rgba(255,255,255,.22)';
        ctx.beginPath(); ctx.moveTo(wx + wdw.w * 0.2, wy); ctx.lineTo(wx + wdw.w * 0.45, wy); ctx.lineTo(wx + wdw.w * 0.1, wy + wdw.h); ctx.lineTo(wx - wdw.w * 0.15, wy + wdw.h); ctx.fill();
        if (on > 0) {
          ctx.globalAlpha = on * flick;
          ctx.fillStyle = vgrad(ctx, 0, wy, wy + wdw.h, [[0, '#FFE6A6'], [1, '#FFC36A']]);
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
        const hx = x + L.carW * 2 + 8 + 18, hy = y + L.carH * 0.72;
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
      const poleC = rgb(mixRGB(hex2rgb('#3A2E24'), hex2rgb('#070A14'), clamp(tintA + night * 0.5)));
      const topY = H * 0.14;
      const xs = [];
      for (let k = -1; k < W / S + 2; k++) xs.push(k * S - off + S * 0.5);
      ctx.strokeStyle = poleC;
      ctx.lineWidth = 1.4;
      for (let w = 0; w < 3; w++) {
        const wy = topY + 10 + w * 9;
        for (let k = 0; k < xs.length - 1; k++) {
          ctx.beginPath(); ctx.moveTo(xs[k] - 30 + w * 30, wy);
          ctx.quadraticCurveTo((xs[k] + xs[k + 1]) / 2, wy + H * 0.07, xs[k + 1] - 30 + w * 30, wy);
          ctx.stroke();
        }
      }
      ctx.fillStyle = poleC;
      for (const px of xs) {
        ctx.fillRect(px - 4, topY, 8, H);
        ctx.fillRect(px - 42, topY + 6, 84, 5);
        for (let w = 0; w < 3; w++) { ctx.fillRect(px - 32 + w * 30, topY + 2, 3, 6); }
      }
    });

    /* foreground meadow, blurred by speed */
    layer(ctx, s, D.grass, () => {
      drawTiled(ctx, L.grassT(tintC, tintA), dist * D.grass, H - L.grass.h * 0.92, W);
    });

    /* pollen by day, fireflies by night */
    L.pollen.draw(ctx, (1 - night) * bell(0.1, 0.75, p) * 0.8);
    L.flies.draw(ctx, night);
  }

  return {
    build, update, draw,
    dispose() { L = null; },
    anchor(s) {
      if (!L) return null;
      const { x, y } = trainPos(s);
      const w = L.wins[L.nWin + 2];
      return { x: x + w.x, y: y + w.y, w: w.w, h: w.h, r: 3.5 };
    },
    crane(s) {
      if (!L) return null;
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
