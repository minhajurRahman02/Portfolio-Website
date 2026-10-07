/* 03 · Video Editing — "The Cut"
   An edit suite at night with a window onto the city. The playhead is the
   scroll position; every cut snaps the city to a new grade with a one-frame
   flash. Raindrops on the glass each hold a small, flipped city. */
import { EDIT } from '../config.js';
import { TAU, rng, clamp, lerp, ease, inv, bake, blurred, hex2rgb, rgb } from '../util.js';
import { vgrad, glow, rr, haze, speckle } from '../paint.js';
import { push } from '../depth.js';

export default function create() {
  let L = null;
  let lastClip = -1, flashT = -9, carT = 0;

  function geom(W, H) {
    const win = { x: W * 0.035, y: H * 0.05, w: W * 0.93, h: H * 0.6 };
    const mw = clamp(W * 0.46, 300, 760), mh = mw * 0.56;
    // on wide screens the monitor sits right of centre, clear of the glass card
    const mcx = W > 900 ? W * 0.6 : W * 0.5;
    const mon = { x: mcx - mw / 2, y: H * 0.6 - mh * 0.55, w: mw, h: mh };
    const scr = { x: mon.x + mw * 0.025, y: mon.y + mh * 0.04, w: mw * 0.95, h: mh * 0.88 };
    return { win, mon, scr, desk: H * 0.8 };
  }

  function build(env) {
    const { W, H, dpr, mobile } = env;
    const G = geom(W, H);
    const r = rng(303);
    const cw = Math.round(G.win.w * 1.15), ch = Math.round(G.win.h);

    const sky = bake(cw, ch, 1, (x, w, h) => {
      x.fillStyle = vgrad(x, 0, 0, h, [[0, '#070912'], [0.6, '#151A30'], [1, '#3A2E3E']]);
      x.fillRect(0, 0, w, h);
      haze(x, w, h * 0.55, h * 0.4, '#5A3E4A', 0.5);
    });

    const towers = (seed, n, hMin, hMax, col, lit, density, baseY) => bake(cw, ch, dpr, (x, w, h) => {
      const rr2 = rng(seed);
      let px = -20;
      while (px < w) {
        const bw = rr2.range(26, 70) * (w / 1200 + 0.4), bh = h * rr2.range(hMin, hMax);
        const top = h * baseY - bh;
        x.fillStyle = col;
        x.fillRect(px, top, bw, h);
        if (rr2() < 0.3) x.fillRect(px + bw * 0.4, top - bh * 0.12, bw * 0.2, bh * 0.12);
        // windows
        for (let wy = top + 6; wy < h * baseY - 4; wy += 6) {
          for (let wx = px + 4; wx < px + bw - 4; wx += 5) {
            if (rr2() < density) { x.fillStyle = rr2.pick(lit); x.globalAlpha = rr2.range(0.45, 1); x.fillRect(wx, wy, 2.4, 3); }
          }
        }
        x.globalAlpha = 1;
        px += bw + rr2.range(2, 12);
      }
    });
    const far = towers(31, 0, 0.18, 0.5, '#161A2C', ['#7A88B8', '#B6A4D8', '#FFE2A8'], 0.12, 0.8);
    const mid = towers(32, 0, 0.3, 0.75, '#0E1120', ['#FFD08A', '#FFF1C9', '#A8E6FF', '#FF9E45'], 0.22, 0.9);
    const beacons = Array.from({ length: 12 }, () => [r() * cw, ch * r.range(0.2, 0.55), r() * TAU]);

    /* a thumbnail of the city for the raindrop lenses and the program monitor */
    const thumb = bake(Math.round(cw / 5), Math.round(ch / 5), 1, (x, w, h) => {
      x.drawImage(sky, 0, 0, w, h); x.drawImage(far, 0, 0, w, h); x.drawImage(mid, 0, 0, w, h);
    });

    const drops = Array.from({ length: Math.round(EDIT.rain * (mobile ? 0.5 : 1)) }, () => ({
      x: G.win.x + r() * G.win.w, y: G.win.y + r() * G.win.h, r: r.range(2.5, 7.5), trickle: r() < 0.25, v: r.range(8, 30), ph: r() * 10,
    }));
    const cars = Array.from({ length: EDIT.cars }, (_, k) => ({ lane: k % 2, x: r(), v: r.range(0.04, 0.09), len: r.range(0.6, 1.4) }));

    /* foreground: an out-of-focus mug and lamp edge */
    const fg = blurred(bake(W, H, 0.5, (x, w, h) => {
      x.fillStyle = '#1C1A22'; rr(x, w * 0.04, h * 0.72, w * 0.1, h * 0.26, 10); x.fill();
      x.strokeStyle = '#1C1A22'; x.lineWidth = w * 0.014; x.beginPath(); x.arc(w * 0.145, h * 0.82, h * 0.05, -1.2, 1.2); x.stroke();
      x.fillStyle = 'rgba(255,200,140,.25)'; x.fillRect(w * 0.05, h * 0.73, w * 0.012, h * 0.24);
      x.fillStyle = '#121119'; x.beginPath(); x.moveTo(w * 0.86, h); x.lineTo(w * 0.9, h * 0.62); x.lineTo(w * 1.02, h * 0.58); x.lineTo(w * 1.02, h); x.fill();
      x.fillStyle = 'rgba(255,170,90,.35)'; x.beginPath(); x.ellipse(w * 0.96, h * 0.6, w * 0.06, h * 0.02, -0.2, 0, TAU); x.fill();
    }), 10);

    L = { W, H, G, cw, ch, sky, far, mid, beacons, thumb, drops, cars, fg };
  }

  function update(s) {
    if (!L) return;
    carT += s.dt;
    for (const d of L.drops) if (d.trickle) { d.y += d.v * s.dt * (0.3 + 0.7 * (Math.sin(s.t * 0.7 + d.ph) > 0.6 ? 1 : 0)); if (d.y > L.G.win.y + L.G.win.h) d.y = L.G.win.y; }
  }

  function draw(ctx, s) {
    if (!L) return;
    const { W, H, p, t } = s;
    const { win, mon, scr, desk } = L.G;
    const clip = Math.min(3, Math.floor(p * 4));
    if (clip !== lastClip) { if (lastClip >= 0) flashT = t; lastClip = clip; }
    const g = EDIT.grades[clip];
    const pan = (p - 0.5) * W * 0.05;

    ctx.fillStyle = '#07080E';
    ctx.fillRect(0, 0, W, H);

    /* the city, inside the window */
    ctx.save();
    ctx.beginPath(); ctx.rect(win.x, win.y, win.w, win.h); ctx.clip();
    const bx = win.x - (L.cw - win.w) / 2;
    const p0 = push(s, 0.05), p1 = push(s, 0.12), p2 = push(s, 0.3);
    ctx.drawImage(L.sky, bx - pan * 0.1 + p0.x, win.y + p0.y);
    ctx.drawImage(L.far, bx - pan * 0.3 + p1.x, win.y + p1.y, L.cw, L.ch);
    for (const [x, y, ph] of L.beacons) {
      const on = Math.sin(t * 2 + ph) > 0.85;
      if (on) glow(ctx, bx - pan * 0.3 + x, win.y + y, 10, '#FF3B3B', 0.9);
    }
    ctx.drawImage(L.mid, bx - pan * 0.6 + p2.x, win.y + win.h * 0.06 + p2.y, L.cw, L.ch);
    // street: long-exposure trails whose length follows scroll speed
    const sy = win.y + win.h * 0.93;
    const stretch = 1 + Math.min(5, Math.abs(s.vel) / 260);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const c of L.cars) {
      const dir = c.lane ? -1 : 1;
      const u = ((c.x + carT * c.v * dir) % 1 + 1) % 1;
      const x = win.x + u * win.w;
      const y = sy + c.lane * 7;
      const len = 40 * c.len * stretch;
      const gr = ctx.createLinearGradient(x, y, x - dir * len, y);
      const col = c.lane ? [255, 70, 60] : [255, 240, 210];
      gr.addColorStop(0, rgb(col, 0.9)); gr.addColorStop(1, rgb(col, 0));
      ctx.strokeStyle = gr; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dir * len, y); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    /* raindrops: tiny lenses holding a flipped city */
    const th = L.thumb;
    for (const d of L.drops) {
      ctx.save();
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.clip();
      const u = (d.x - win.x) / win.w;
      ctx.translate(d.x, d.y);
      ctx.scale(1, -1);
      ctx.drawImage(th, u * th.width - th.width * 0.08, th.height * 0.25, th.width * 0.16, th.height * 0.6, -d.r, -d.r, d.r * 2, d.r * 2);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0.3, 2.8); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.arc(d.x - d.r * 0.35, d.y - d.r * 0.4, d.r * 0.2, 0, TAU); ctx.fill();
      if (d.trickle) { ctx.fillStyle = 'rgba(200,220,255,.12)'; ctx.fillRect(d.x - 0.7, d.y - 40, 1.4, 40 - d.r); }
    }

    /* the grade: multiply then lift, inside the window only */
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = g.mul;
    ctx.fillRect(win.x, win.y, win.w, win.h);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = g.scr;
    ctx.fillRect(win.x, win.y, win.w, win.h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    /* window frame with a rim of city light */
    const fpu = push(s, 0.4);
    ctx.save();
    ctx.translate(fpu.x, fpu.y);
    ctx.fillStyle = '#05060B';
    ctx.fillRect(win.x - 14, win.y - 14, win.w + 28, 14);
    ctx.fillRect(win.x - 14, win.y + win.h, win.w + 28, 18);
    ctx.fillRect(win.x - 14, win.y, 14, win.h);
    ctx.fillRect(win.x + win.w, win.y, 14, win.h);
    for (const u of [1 / 3, 2 / 3]) ctx.fillRect(win.x + win.w * u - 5, win.y, 10, win.h);
    ctx.fillRect(win.x, win.y + win.h * 0.38, win.w, 8);
    ctx.fillStyle = g.key;
    ctx.globalAlpha = 0.35;
    for (const u of [0, 1 / 3, 2 / 3, 1]) ctx.fillRect(win.x + win.w * u + (u === 0 ? 0 : -5) - 1, win.y, 1.2, win.h);
    ctx.fillRect(win.x, win.y + win.h, win.w, 1.2);
    ctx.globalAlpha = 1;
    ctx.restore();

    /* room light from the monitor */
    glow(ctx, mon.x + mon.w / 2, mon.y + mon.h / 2, Math.max(W, H) * 0.6, g.key, 0.2);
    glow(ctx, W * 0.93, desk - 10, W * 0.3, '#FFB070', 0.14);

    /* desk */
    const dpu = push(s, 0.6);
    ctx.save();
    ctx.translate(dpu.x, dpu.y);
    ctx.fillStyle = vgrad(ctx, 0, desk, H, [[0, '#2A2028'], [1, '#120E14']]);
    ctx.fillRect(-60, desk, W + 120, H - desk + 200);
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(-60, desk, W + 120, 1.5);
    // keyboard
    const kw = mon.w * 0.62, kx = mon.x + mon.w / 2 - kw / 2, ky = desk + (H - desk) * 0.35;
    ctx.fillStyle = '#17141C'; rr(ctx, kx, ky, kw, (H - desk) * 0.28, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    for (let i = 0; i < 14; i++) for (let j = 0; j < 4; j++) ctx.fillRect(kx + 8 + i * (kw - 16) / 14, ky + 6 + j * (H - desk) * 0.06, (kw - 16) / 14 - 3, (H - desk) * 0.045);
    // monitor stand + bezel
    ctx.fillStyle = '#16151C';
    ctx.fillRect(mon.x + mon.w / 2 - 14, mon.y + mon.h, 28, desk - mon.y - mon.h + 6);
    ctx.fillRect(mon.x + mon.w / 2 - 70, desk - 2, 140, 8);
    rr(ctx, mon.x, mon.y, mon.w, mon.h, 10); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(mon.x + 10, mon.y + 1, mon.w - 20, 1.2);
    screen(ctx, s, scr, g, clip);
    // reflection of the screen on the desk
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = vgrad(ctx, 0, desk, desk + 60, [[0, g.key], [1, 'rgba(0,0,0,0)']]);
    ctx.fillRect(mon.x, desk, mon.w, 60);
    ctx.globalAlpha = 1;
    ctx.restore();

    const fpu2 = push(s, 1.1);
    ctx.drawImage(L.fg, fpu2.x, fpu2.y, W, H);

    /* the cut: one bright frame */
    const fl = clamp(1 - (t - flashT) / 0.12);
    if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${0.42 * fl})`; ctx.fillRect(0, 0, W, H); }
  }

  /* the NLE: program monitor on top, four tracks below, the playhead at p */
  function screen(ctx, s, scr, g, clip) {
    const { p, t } = s;
    ctx.save();
    rr(ctx, scr.x, scr.y, scr.w, scr.h, 4); ctx.clip();
    ctx.fillStyle = '#12141C'; ctx.fillRect(scr.x, scr.y, scr.w, scr.h);
    // program monitor
    const pw = scr.w * 0.42, ph = pw * 9 / 16;
    const px = scr.x + scr.w / 2 - pw / 2, py = scr.y + scr.h * 0.05;
    ctx.drawImage(L.thumb, px, py, pw, ph);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g.mul; ctx.fillRect(px, py, pw, ph);
    ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g.scr; ctx.fillRect(px, py, pw, ph);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.strokeRect(px, py, pw, ph);
    const fs = Math.max(7, scr.w / 62);
    ctx.font = `600 ${fs}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.textBaseline = 'middle';
    const fr = Math.floor(p * 24 * 40);
    ctx.textAlign = 'center';
    ctx.fillText(`00:00:${String(Math.floor(fr / 24)).padStart(2, '0')}:${String(fr % 24).padStart(2, '0')}   ·   ${g.name}`, scr.x + scr.w / 2, py + ph + fs * 1.1);
    // side panels
    ctx.fillStyle = '#181B26';
    ctx.fillRect(scr.x, scr.y, scr.w * 0.18, ph + fs * 2.4);
    ctx.fillRect(scr.x + scr.w * 0.82, scr.y, scr.w * 0.18, ph + fs * 2.4);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    for (let k = 0; k < 6; k++) { ctx.fillRect(scr.x + 6, scr.y + 8 + k * fs * 1.6, scr.w * 0.18 - 12, fs * 0.9); }
    // scopes on the right: a vectorscope blob in the grade colour
    glow(ctx, scr.x + scr.w * 0.91, scr.y + ph * 0.5, ph * 0.35, g.key, 0.5);
    // tracks
    const ty = py + ph + fs * 2.6, th = scr.y + scr.h - ty - 6;
    const lx = scr.x + scr.w * 0.08, lw = scr.w * 0.9;
    ctx.fillStyle = '#0E1017'; ctx.fillRect(scr.x, ty - fs, scr.w, scr.h);
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
    for (let k = 0; k <= 40; k++) { const x = lx + lw * k / 40; ctx.beginPath(); ctx.moveTo(x, ty - fs * 0.6); ctx.lineTo(x, ty - fs * (k % 5 ? 0.3 : 0.9) + fs * 0.3); ctx.stroke(); }
    const rows = [['V2', '#2FC6B8'], ['V1', '#8C6BFF'], ['A1', '#3DDC97'], ['A2', '#3DDC97']];
    const rh = th / rows.length;
    ctx.textAlign = 'left';
    rows.forEach(([name, col], k) => {
      const y = ty + k * rh;
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.fillText(name, scr.x + 6, y + rh / 2);
      const cuts = k === 0 ? [[0.08, 0.22], [0.31, 0.47], [0.6, 0.71], [0.8, 0.96]] : [[0, 0.25], [0.25, 0.5], [0.5, 0.75], [0.75, 1]];
      cuts.forEach(([a, b], ci) => {
        const x = lx + lw * a + 1, w = lw * (b - a) - 2;
        const lit = k === 1 && ci === clip;
        ctx.fillStyle = lit ? col : `${col}99`;
        rr(ctx, x, y + 2, w, rh - 4, 3); ctx.fill();
        if (k >= 2) {
          ctx.fillStyle = 'rgba(10,30,20,.55)';
          for (let wx = x + 2; wx < x + w - 2; wx += 2) {
            const v = Math.abs(Math.sin(wx * 0.21 + k) * Math.sin(wx * 0.047 + ci)) * (rh - 8) * 0.45;
            ctx.fillRect(wx, y + rh / 2 - v, 1.2, v * 2);
          }
        } else {
          ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x + 3, y + 4, Math.min(w - 6, rh * 1.4), rh - 8);
        }
        if (k === 0) {
          ctx.fillStyle = '#FFE14A';
          for (const kf of [0.25, 0.75]) { const kx = x + w * kf, ky = y + rh / 2; ctx.beginPath(); ctx.moveTo(kx, ky - 4); ctx.lineTo(kx + 4, ky); ctx.lineTo(kx, ky + 4); ctx.lineTo(kx - 4, ky); ctx.fill(); }
        }
      });
    });
    // playhead
    const hx = lx + lw * p;
    ctx.fillStyle = '#FF4D45';
    ctx.fillRect(hx - 0.8, ty - fs, 1.6, th + fs);
    ctx.beginPath(); ctx.moveTo(hx - 6, ty - fs); ctx.lineTo(hx + 6, ty - fs); ctx.lineTo(hx, ty - fs + 7); ctx.fill();
    ctx.restore();
    // screen glass sheen
    ctx.fillStyle = 'rgba(255,255,255,.035)';
    ctx.beginPath(); ctx.moveTo(scr.x, scr.y); ctx.lineTo(scr.x + scr.w * 0.4, scr.y); ctx.lineTo(scr.x + scr.w * 0.2, scr.y + scr.h); ctx.lineTo(scr.x, scr.y + scr.h); ctx.fill();
  }

  return {
    build, update, draw,
    dispose() { L = null; },
    anchor() { return L ? { ...L.G.scr } : null; },
    crane(s) {
      if (!L || s.p < 0.12 || s.p > 0.82) return null;
      const { mon } = L.G;
      const size = Math.min(s.W, s.H) * 0.04;
      const a = ease(0.12, 0.2, s.p) * (1 - ease(0.74, 0.82, s.p));
      return { x: mon.x + mon.w * 0.86, y: mon.y - size * 0.2, size, flap: -0.25 + Math.sin(s.t * 1.1) * 0.05, dir: -1, rot: 0, a };
    },
  };
}
