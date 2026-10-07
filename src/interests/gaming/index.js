/* 04 · Gaming — "Mission 4: Overgrown Foundry"
   An original run-and-gun stage played by scrolling. Everything renders into
   one small canvas (216 px tall, width to fit) that is blown up with
   nearest-neighbour at a whole-number device-pixel scale, so the whole
   stage shares one pixel grid and nothing shimmers.

   Scroll → gameplay:
   - scroll position sets the hero's target x; the hero chases it, so scroll
     speed becomes run speed (and run-cycle rate, since frames advance by
     distance — the feet never skate);
   - reversing turns the hero with a skid; stopping eases into idle;
   - jumps, the drone wave, the raptor ambush and the boss are keyed to x
     (and the boss fight to progress), so scrolling back replays them;
   - the score keeps your best and never counts down. */
import { GAME } from '../config.js';
import { clamp, lerp, ease, inv, approach, rng } from '../util.js';
import { C, pcanvas, pdisc, heroFrames, lifeHead, droneFrames, raptorFrames, bossSprite, craneFrames, CELL } from './sprites.js';
import { H as LH, GROUND, makeLevel, bakeSky, bakeClouds, bakeMega, bakeCity, bakeJungle, bakeNear, bakePlayfield, bakeFG } from './stage.js';
import { text, textW } from './font.js';

const SKY_TOP = '#1e1433';
const B = GAME.beats;

export default function create() {
  let A = null;   // size-independent assets
  let V = null;   // view: logical size, scale, sky
  const S = {
    heroX: 36, vx: 0, face: 1, want: 1, skidT: 0, still: 0, walk: 0,
    best: 0, lastP: 0, lastX: 36, shake: 0, fireT: 0, flashT: -9, shellT: 0, lead: GAME.heroLead,
    bossDead: false, bossBoomT: -9,
  };
  const FX = { sparks: [], booms: [], pops: [], bullets: [], shells: [], leaves: [], casings: [] };
  let dust = [], embers = [];
  const rnd = rng(404);

  function build() {
    const level = makeLevel(GAME.levelW);
    const city = bakeCity();
    const near = bakeNear();
    const boss = bossSprite();
    A = {
      level, clouds: bakeClouds(), mega: bakeMega(), city: city.c, beacons: city.beacons,
      jungle: bakeJungle(), near: near.c, falls: near.falls, play: bakePlayfield(level), fg: bakeFG(),
      hero: heroFrames(), head: lifeHead(), drone: droneFrames(), raptorF: raptorFrames(), boss, crane: craneFrames(),
      drones: [
        [1190, 84], [1236, 68], [1276, 96], [1322, 76], [1362, 104], [1404, 86], [2250, 80], [2296, 98],
      ].map(([x, y], i) => ({ x, y, killAt: x - 118, i })),
      raptor: { lair: 1792, wake: 1598, killAt: 1694 },
    };
    dust = Array.from({ length: GAME.dust }, () => ({ x: rnd() * 400, y: rnd() * LH, v: rnd.range(2, 7), ph: rnd() * 6 }));
    embers = Array.from({ length: GAME.embers }, () => ({ x: rnd() * 400, y: rnd() * LH, v: rnd.range(8, 20), ph: rnd() * 6 }));
  }

  function view(s) {
    const devW = Math.round(s.W * s.dpr), devH = Math.round(s.H * s.dpr);
    if (V && V.devW === devW && V.devH === devH) return V;
    let sc = Math.max(1, Math.round(devH / LH));
    let wl = Math.ceil(devW / sc);
    if (wl < GAME.minW) { sc = Math.max(1, Math.floor(devW / GAME.minW)); wl = Math.ceil(devW / sc); }
    const bandH = LH * sc;
    // too tall: crop the sky, keep the ground; too short: letterbox
    const oy = bandH > devH ? devH - bandH : Math.round((devH - bandH) / 2);
    const top = oy < 0 ? Math.ceil(-oy / sc) : 0;
    const pix = pcanvas(wl, LH);
    const scan = pcanvas(1, sc);
    if (sc >= 3) { scan.x.fillStyle = 'rgba(0,0,0,.16)'; scan.x.fillRect(0, sc - 1, 1, 1); }
    V = { devW, devH, sc, wl, oy, top, pix, sky: bakeSky(wl, LH), scan, scanPat: null };
    return V;
  }

  const tile = (x, img, ox, y) => {
    const w = img.width;
    let sx = -(((Math.round(ox) % w) + w) % w);
    for (; sx < V.wl; sx += w) x.drawImage(img, sx, y);
  };

  function boom(x, y, r, t, n = 14) {
    FX.booms.push({ x, y, r, t0: t });
    for (let k = 0; k < n; k++) {
      const a = rnd() * Math.PI * 2, v = rnd.range(30, 110);
      FX.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: rnd.range(0.3, 0.8), age: 0, c: rnd.pick([C.gold, C.orange, C.white, C.cream]) });
    }
  }
  function pop(x, y, str, t) { FX.pops.push({ x, y, str, t0: t }); }

  /* -------------------------------------------------------- simulation */
  function update(s) {
    if (!A) return;
    const v = view(s);
    const { p, t } = s;
    const dt = Math.min(s.dt, 0.05);
    const lv = A.level;
    const target = targetX(p, v);
    const prevX = S.heroX;
    S.heroX += (target - S.heroX) * approach(0.09, dt);
    if (Math.abs(target - S.heroX) < 0.05) S.heroX = target;
    S.vx = (S.heroX - prevX) / Math.max(dt, 1e-3);
    const speed = Math.abs(S.vx);

    // facing, skid and idle
    if (S.vx > 8) S.want = 1; else if (S.vx < -8) S.want = -1;
    if (S.want !== S.face) {
      if (speed > 40 && S.skidT <= 0) S.skidT = 0.2;
      if (S.skidT <= 0 || speed <= 40) S.face = S.want;
    }
    if (S.skidT > 0) { S.skidT -= dt; if (S.skidT <= 0) S.face = S.want; }
    S.still = speed < 6 ? S.still + dt : 0;
    S.walk += speed * dt;
    S.lead += ((S.face > 0 ? GAME.heroLead : 0.62) - S.lead) * approach(0.6, dt);

    // enemy kills, keyed to x: crossing forward triggers the explosion
    for (const d of A.drones) {
      if (prevX < d.killAt && S.heroX >= d.killAt) { const [dx, dy] = dronePos(d, t); boom(dx + 8, dy + 5, 10, t); pop(dx, dy - 6, '+100', t); S.shake = Math.max(S.shake, 2); }
    }
    const R = A.raptor;
    if (prevX < R.killAt && S.heroX >= R.killAt) { const rx = raptorX(R.killAt - 0.01); boom(rx + 20, GROUND - 14, 16, t, 22); pop(rx + 10, GROUND - 36, '+500', t); S.shake = 4; }
    if (S.heroX > R.wake - 40 && S.heroX < R.wake && rnd() < dt * 6) FX.leaves.push({ x: R.lair + rnd.range(-14, 14), y: GROUND - rnd.range(10, 34), vx: rnd.range(-20, 20), vy: rnd.range(-30, -5), age: 0, life: 0.7 });
    if (prevX < R.wake && S.heroX >= R.wake) for (let k = 0; k < 18; k++) FX.leaves.push({ x: R.lair + rnd.range(-16, 16), y: GROUND - rnd.range(4, 36), vx: rnd.range(-70, 40), vy: rnd.range(-80, -10), age: 0, life: 1 });

    // boss: keyed to progress
    const bossX = lv.BOSS_X;
    if (S.lastP < B.kill && p >= B.kill) { S.bossBoomT = t; S.flashT = t; S.shake = 6; pop(bossX - 10, 80, '+5000', t); }
    if (p < B.kill) S.bossBoomT = -9;
    if (S.bossBoomT > 0) {
      const a = t - S.bossBoomT;
      for (let k = 0; k < 7; k++) if (a > k * 0.12 && a - dt <= k * 0.12) boom(bossX - 34 + rnd() * 68, 120 + rnd() * 50, rnd.range(12, 22), t, 18);
    }
    if (p > B.eyes && p < B.eyes + 0.06 && rnd() < dt * 30) FX.sparks.push({ x: bossX - 40 + rnd() * 80, y: 112 + rnd() * 10, vx: rnd.range(-6, 6), vy: rnd.range(10, 30), life: 1.2, age: 0, c: rnd.pick(['#8a7a6a', '#6a5a50', '#b0a090']) });
    const fight = p > B.fight && p < B.kill;
    if (fight) {
      S.shellT -= dt;
      if (S.shellT <= 0) { S.shellT = 0.75; FX.shells.push({ x: bossX + 20, y: 148, vx: -150, vy: -70, age: 0 }); }
      if (rnd() < dt * 18) FX.sparks.push({ x: bossX - 30 + rnd() * 20, y: 120 + rnd() * 40, vx: rnd.range(-40, 10), vy: rnd.range(-50, 0), life: 0.3, age: 0, c: rnd.pick([C.white, C.gold]) });
    }

    // shooting at whatever is alive in front of the hero
    const tgt = target2(s);
    if (tgt && S.face > 0) {
      S.fireT -= dt;
      if (S.fireT <= 0) {
        S.fireT = 1 / 9;
        const tip = gunTip();
        if (tip) {
          FX.bullets.push({ x: tip[0], y: tip[1], tx: tgt[0], ty: tgt[1], age: 0 });
          FX.casings.push({ x: tip[0] - 10, y: tip[1], vx: rnd.range(-40, -15), vy: rnd.range(-70, -40), age: 0 });
          S.muzzle = t;
        }
      }
    }

    S.best = Math.max(S.best, score());
    S.lastP = p;
    S.lastX = S.heroX;
    S.shake = Math.max(0, S.shake - dt * 14);

    // effects
    for (const b of FX.bullets) { b.age += dt; b.x += 320 * dt; b.y += (b.ty - b.y) * Math.min(1, dt * 6); }
    FX.bullets = FX.bullets.filter((b) => b.age < 0.6 && b.x < b.tx);
    for (const p2 of FX.sparks) { p2.age += dt; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.vy += 160 * dt; }
    FX.sparks = FX.sparks.filter((p2) => p2.age < p2.life);
    for (const c of FX.casings) { c.age += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt; }
    FX.casings = FX.casings.filter((c) => c.age < 0.7);
    for (const l of FX.leaves) { l.age += dt; l.x += l.vx * dt; l.y += l.vy * dt; l.vy += 60 * dt; }
    FX.leaves = FX.leaves.filter((l) => l.age < l.life);
    for (const sh of FX.shells) { sh.age += dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.vy += 120 * dt; if (sh.y > GROUND - 2 && !sh.hit) { sh.hit = true; boom(sh.x, GROUND - 4, 8, t, 8); } }
    FX.shells = FX.shells.filter((sh) => !sh.hit && sh.age < 3);
    FX.booms = FX.booms.filter((b) => t - b.t0 < 1);
    FX.pops = FX.pops.filter((q) => t - q.t0 < 0.9);
    for (const d of dust) { d.y -= d.v * dt; d.x += Math.sin(t + d.ph) * 3 * dt; if (d.y < -2) { d.y = LH + 2; d.x = rnd() * v.wl; } }
    for (const e of embers) { e.y -= e.v * dt; e.x += Math.sin(t * 2 + e.ph) * 8 * dt; if (e.y < 60) { e.y = LH + 2; e.x = rnd() * v.wl; } }
  }

  /* -------------------------------------------------------- queries */
  function targetX(p, v) {
    const heroStop = A.level.levelW - 64 - Math.min(v.wl * 0.55, 200);
    return lerp(36, heroStop, clamp(inv(0.015, GAME.camEnd, p)));
  }
  const dronePos = (d, t) => [Math.round(d.x + Math.sin(t * 1.4 + d.i) * 10), Math.round(d.y + Math.sin(t * 2.1 + d.i * 1.7) * 4)];
  const raptorX = (hx) => Math.round(A.raptor.lair - inv(A.raptor.wake, A.raptor.killAt, hx) * 78);
  function heroY() {
    const lv = A.level, x = S.heroX;
    for (const [x0, x1, h] of lv.JUMPS) {
      if (x > x0 && x < x1) {
        const u = (x - x0) / (x1 - x0);
        const g0 = lv.ground(x0 - 2) ?? GROUND, g1 = lv.ground(x1 + 2) ?? GROUND;
        return { y: lerp(g0, g1, u) - h * 4 * u * (1 - u), jump: u < 0.38 ? 0 : u < 0.66 ? 1 : 2 };
      }
    }
    return { y: lv.ground(x) ?? GROUND, jump: -1 };
  }
  function target2(s) {
    const x = S.heroX;
    for (const d of A.drones) if (x < d.killAt && d.x - x < 170 && d.x - x > 0) { const [dx, dy] = dronePos(d, s.t); return [dx + 8, dy + 5]; }
    const R = A.raptor;
    if (x >= R.wake && x < R.killAt) return [raptorX(x) + 12, GROUND - 14];
    if (s.p > B.fight && s.p < B.kill) return [A.level.BOSS_X - 30, 140];
    return null;
  }
  function score() {
    let k = 0;
    for (const d of A.drones) if (S.heroX >= d.killAt) k += 100;
    if (S.heroX >= A.raptor.killAt) k += 500;
    if (S.lastP >= B.kill) k += 5000;
    return Math.floor((S.heroX - 36) / 2) * 10 + k;
  }
  let curFrame = null;
  function gunTip() {
    if (!curFrame || !curFrame.tip) return null;
    const hy = heroY().y;
    return [Math.round(S.heroX - CELL / 2 + curFrame.tip[0] + 1), Math.round(hy - 45 + curFrame.tip[1] + 1)];
  }

  /* -------------------------------------------------------- render */
  function draw(ctx, s) {
    if (!A) return;
    const v = view(s);
    const x = v.pix.x;
    const { p, t } = s;
    const lv = A.level;
    const wl = v.wl;
    if (s.calm) { S.heroX = targetX(p, v); S.still = 1; S.lastP = p; }
    const shx = S.shake > 0.3 ? Math.round((rnd() - 0.5) * S.shake) : 0;
    const shy = S.shake > 0.3 ? Math.round((rnd() - 0.5) * S.shake) : 0;
    const cam = Math.round(clamp(S.heroX - wl * S.lead, 0, lv.levelW - wl)) + shx;
    const sh = s.sheet;
    const drop = (d) => Math.round(sh * sh * 70 * Math.max(0, d - 0.3)) + shy;
    const D = GAME.depth;

    x.drawImage(v.sky.c, 0, 0);
    // pixel crane crossing the sky
    const cu = inv(0.28, 0.62, p);
    if (cu > 0 && cu < 1) x.drawImage(A.crane[Math.floor(t * 6) % 2], Math.round(lerp(wl + 10, -20, cu)), Math.round(46 + Math.sin(cu * 9) * 4));
    tile(x, A.clouds, cam * D.clouds + t * 3, 8 + drop(0));
    tile(x, A.mega, cam * D.mega, drop(D.mega));
    tile(x, A.city, cam * D.city, drop(D.city));
    for (const [bx, by, ph] of A.beacons) {
      if (Math.sin(t * 2.4 + ph) > 0.6) {
        let sx = bx - ((cam * D.city) % A.city.width);
        for (; sx < wl; sx += A.city.width) if (sx >= -1) { x.fillStyle = C.red; x.fillRect(Math.round(sx), by + drop(D.city), 1, 1); x.fillStyle = 'rgba(255,59,59,.35)'; x.fillRect(Math.round(sx) - 1, by - 1 + drop(D.city), 3, 3); }
      }
    }
    tile(x, A.jungle, cam * D.jungle, drop(D.jungle));
    tile(x, A.near, cam * D.near, drop(D.near));
    // waterfall, animated
    {
      const [fx0, fy0, fw, fh] = A.falls;
      let sx = fx0 - ((Math.round(cam * D.near) % A.near.width) + A.near.width) % A.near.width;
      for (; sx < wl; sx += A.near.width) {
        if (sx + fw < 0) continue;
        for (let yy = 0; yy < fh; yy++) {
          const ph = (yy + Math.floor(t * 70)) % 9;
          x.fillStyle = ph < 2 ? '#a8f0ff' : ph < 5 ? '#4ac0d8' : '#2f8fb0';
          x.fillRect(Math.round(sx) + 2, fy0 + yy + drop(D.near), fw - 4, 1);
        }
        x.fillStyle = '#d8fbff';
        for (let k = 0; k < 6; k++) x.fillRect(Math.round(sx) + ((k * 5 + Math.floor(t * 20)) % fw), fy0 + fh - 2 - ((k * 3 + Math.floor(t * 15)) % 4) + drop(D.near), 1, 1);
      }
    }

    /* playfield */
    const pd = drop(1);
    x.drawImage(A.play, -cam, pd);
    // live props: arcade screen, neon sign, sparking lamps, pit water
    {
      const ax = 783 - cam;
      if (ax > -20 && ax < wl) {
        const hue = Math.floor(t * 3) % 3;
        x.fillStyle = ['#2a6aff', '#ff3bd0', '#33e0a0'][hue];
        x.fillRect(ax, GROUND - 31 + pd, 16, 12);
        x.fillStyle = C.white;
        x.fillRect(ax + 2 + (Math.floor(t * 8) % 12), GROUND - 27 + pd + (Math.floor(t * 5) % 6), 2, 2);
        x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(ax, GROUND - 31 + pd, 16, 1);
        const on = Math.sin(t * 13) > -0.7 || Math.sin(t * 2.3) > 0;
        if (on) { text(x, 'ARCADE', 714 - cam, GROUND - 52 + pd, '#ff4fd0', 1, '#5a1a50'); x.fillStyle = 'rgba(255,79,208,.12)'; x.fillRect(708 - cam, GROUND - 56 + pd, 42, 14); }
      }
      for (const lx of [1500, 2300]) {
        const sx = lx + 13 - cam;
        if (sx < -10 || sx > wl + 10) continue;
        if (rnd() < s.dt * 4) for (let k = 0; k < 4; k++) FX.sparks.push({ x: lx + 13, y: GROUND - 57, vx: rnd.range(-30, 30), vy: rnd.range(-40, 0), life: 0.4, age: 0, c: C.gold });
        if (Math.sin(t * 17) > 0.2) { x.fillStyle = C.cream; x.fillRect(sx - 2, GROUND - 57 + pd, 4, 1); }
      }
      for (const [a, b] of lv.PITS) {
        for (let k = a + 2; k < b - 2; k++) if ((k + Math.floor(t * 8)) % 7 === 0) { x.fillStyle = '#4ac0d8'; x.fillRect(k - cam, 204 + pd, 2, 1); }
      }
    }

    /* enemies */
    for (const d of A.drones) {
      if (S.heroX >= d.killAt) continue;
      const [dx, dy] = dronePos(d, t);
      const sx = dx - cam;
      if (sx < -20 || sx > wl + 4) continue;
      x.drawImage(A.drone[Math.floor(t * 20) % 2], sx, dy + pd);
      if (Math.sin(t * 6 + d.i) > 0) { x.fillStyle = 'rgba(255,59,59,.5)'; x.fillRect(sx + 4, dy + 5 + pd, 4, 3); }
    }
    {
      const R = A.raptor;
      if (S.heroX >= R.wake && S.heroX < R.killAt) {
        const rx = raptorX(S.heroX) - cam;
        const img = A.raptorF[Math.floor(t * 12) % 4];
        x.save(); x.translate(rx + img.width, GROUND - img.height + 2 + pd); x.scale(-1, 1); x.drawImage(img, 0, 0); x.restore();
      }
    }
    drawBoss(x, s, cam, pd);

    /* hero */
    const hy = heroY();
    const shooting = !!target2(s) && S.face > 0;
    let set, fi;
    if (p > B.tally) { set = A.hero.victory; fi = Math.floor(t * 5) % 4; }
    else if (hy.jump >= 0) { set = A.hero.jump; fi = hy.jump; }
    else if (S.skidT > 0) { set = A.hero.skid; fi = Math.floor(t * 12) % 2; }
    else if (S.still > 0.12) { set = shooting ? A.hero.idleShoot : A.hero.idle; fi = Math.floor(t * (shooting ? 18 : 6)) % 6; }
    else { set = shooting ? A.hero.runShoot : A.hero.run; fi = Math.floor(S.walk / 6) % 8; }
    curFrame = set[fi];
    const hx = Math.round(S.heroX) - cam;
    const hyy = Math.round(hy.y) - 45 + pd;
    // shadow
    x.fillStyle = 'rgba(13,15,23,.35)';
    const gy = (lv.ground(S.heroX) ?? 230) + pd;
    if (gy < LH) x.fillRect(hx - 7, gy, 14, 1);
    if (S.face > 0) x.drawImage(curFrame.c, hx - CELL / 2, hyy);
    else { x.save(); x.translate(hx + CELL / 2, hyy); x.scale(-1, 1); x.drawImage(curFrame.c, 0, 0); x.restore(); }
    if (S.skidT > 0 && rnd() < 0.6) FX.sparks.push({ x: S.heroX - S.face * 6, y: gy - 1, vx: -S.face * rnd.range(10, 40), vy: rnd.range(-30, -5), life: 0.35, age: 0, c: '#b0a090' });
    // muzzle flash
    if (shooting && curFrame.tip && t - (S.muzzle || -9) < 0.05) {
      const [mx, my] = gunTip();
      const sx = mx - cam;
      x.fillStyle = C.white; x.fillRect(sx, my - 1 + pd, 3, 3);
      x.fillStyle = C.gold; x.fillRect(sx + 3, my + pd, 3, 1); x.fillRect(sx + 1, my - 2 + pd, 1, 5);
    }

    /* effects */
    x.fillStyle = C.gold;
    for (const b of FX.bullets) { x.fillRect(Math.round(b.x) - cam, Math.round(b.y) + pd, 4, 1); }
    x.fillStyle = '#e0b040';
    for (const c of FX.casings) x.fillRect(Math.round(c.x) - cam, Math.round(c.y) + pd, 1, 1);
    for (const sh2 of FX.shells) { x.fillStyle = C.ink; x.fillRect(Math.round(sh2.x) - cam - 1, Math.round(sh2.y) + pd - 1, 3, 3); x.fillStyle = C.red; x.fillRect(Math.round(sh2.x) - cam, Math.round(sh2.y) + pd, 1, 1); }
    for (const b of FX.booms) {
      const a = t - b.t0;
      const bx = Math.round(b.x) - cam, by = Math.round(b.y) + pd;
      const R = Math.max(1, Math.round(b.r * Math.min(1, 0.35 + a * 4)));
      if (a > 0.25) {
        x.globalAlpha = Math.max(0, 1 - (a - 0.25) / 0.75);
        pdisc(x, bx - 2, by - Math.round((a - 0.25) * 30), Math.round(R * 0.9), '#4a3e4e');
        pdisc(x, bx + 3, by - 3 - Math.round((a - 0.25) * 26), Math.round(R * 0.6), '#6a5a66');
        x.globalAlpha = 1;
      }
      if (a < 0.45) {
        pdisc(x, bx, by, R, C.orange);
        pdisc(x, bx, by, Math.round(R * 0.7), C.gold);
        if (a < 0.2) pdisc(x, bx, by, Math.round(R * 0.38), C.white);
      }
    }
    for (const p2 of FX.sparks) { x.fillStyle = p2.c; x.fillRect(Math.round(p2.x) - cam, Math.round(p2.y) + pd, 1, 1); }
    for (const l of FX.leaves) { x.fillStyle = C.jg3; x.fillRect(Math.round(l.x) - cam, Math.round(l.y) + pd, 2, 1); }
    for (const q of FX.pops) { const a = t - q.t0; text(x, q.str, Math.round(q.x) - cam, Math.round(q.y - a * 22) + pd, a % 0.16 < 0.08 ? C.white : C.gold); }

    /* foreground vines crossing the camera */
    tile(x, A.fg, cam * D.fg, drop(D.fg));
    // drifting dust and embers
    x.fillStyle = 'rgba(255,196,110,.55)';
    for (const d of dust) x.fillRect(Math.round(d.x) % wl, Math.round(d.y), 1, 1);
    for (const e of embers) { x.fillStyle = Math.sin(t * 9 + e.ph) > 0 ? C.orange : C.gold; x.fillRect(Math.round(e.x) % wl, Math.round(e.y), 1, 1); }

    const fl = clamp(1 - (t - S.flashT) / 0.25);
    if (fl > 0) { x.fillStyle = `rgba(255,255,255,${fl * 0.8})`; x.fillRect(0, 0, wl, LH); }

    hud(x, s, v);

    /* blit at a whole-number device scale */
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (v.oy > 0) {
      // letterbox: the sky fades up into night, the ground down into shadow
      const g1 = ctx.createLinearGradient(0, 0, 0, v.oy + 1);
      g1.addColorStop(0, '#07050d'); g1.addColorStop(1, SKY_TOP);
      ctx.fillStyle = g1; ctx.fillRect(0, 0, v.devW, v.oy + 1);
      const by0 = v.oy + LH * v.sc - 1;
      const g2 = ctx.createLinearGradient(0, by0, 0, v.devH);
      g2.addColorStop(0, C.dirt1); g2.addColorStop(0.15, C.dirt0); g2.addColorStop(1, '#07050d');
      ctx.fillStyle = g2; ctx.fillRect(0, by0, v.devW, v.devH - by0);
    }
    ctx.drawImage(v.pix, 0, v.oy, v.wl * v.sc, LH * v.sc);
    if (v.sc >= 3) {
      if (!v.scanPat) v.scanPat = ctx.createPattern(v.scan, 'repeat');
      ctx.fillStyle = v.scanPat;
      ctx.translate(0, v.oy);
      ctx.fillRect(0, 0, v.devW, LH * v.sc);
    }
    ctx.restore();
  }

  function drawBoss(x, s, cam, pd) {
    const { p, t } = s;
    const BS = A.boss;
    const bx = A.level.BOSS_X - 44 - cam;
    if (bx > V.wl + 10 || bx < -100) return;
    const dead = p >= B.kill;
    const collapse = dead ? Math.min(1, (t - (S.bossBoomT > 0 ? S.bossBoomT : t - 2)) / 0.8) : 0;
    const by = GROUND - 72 + Math.round(collapse * 14) + pd;
    const flick = dead && collapse < 1 && Math.floor(t * 20) % 2;
    if (!flick) {
      x.globalAlpha = dead ? 0.85 : 1;
      x.drawImage(BS.c, bx, by);
      x.globalAlpha = 1;
      if (dead) { x.fillStyle = 'rgba(20,10,10,.45)'; x.fillRect(bx + 10, by + 8, 66, 34); }
    }
    const eyes = ease(B.eyes, B.lit, p) * (dead ? 0 : 1);
    if (eyes > 0) {
      for (const [ex, ey] of BS.eyes) {
        x.fillStyle = C.red; x.fillRect(bx + ex - 2, by + ey - 2, 5, 5);
        x.fillStyle = '#ffb0b0'; x.fillRect(bx + ex - 1, by + ey - 1, 2, 2);
        if (Math.sin(t * 10) > 0) { x.fillStyle = 'rgba(255,59,59,.25)'; x.fillRect(bx + ex - 5, by + ey - 5, 11, 11); }
      }
    }
    if (dead && rnd() < s.dt * 20) FX.sparks.push({ x: A.level.BOSS_X - 30 + rnd() * 60, y: by + 20 - pd, vx: rnd.range(-5, 5), vy: rnd.range(-30, -10), life: 1, age: 0, c: rnd.pick(['#5a4a50', '#7a6a70']) });
  }

  function hud(x, s, v) {
    const { p, t } = s;
    const a = 1 - s.sheet;
    if (a <= 0.02) return;
    x.globalAlpha = a;
    const top = v.top + 4;
    const wl = v.wl;
    const big = wl >= 300;
    text(x, '1UP', 5, top, C.gold);
    text(x, String(Math.min(999999, S.best)).padStart(6, '0'), 27, top, C.white);
    for (let k = 0; k < 3; k++) x.drawImage(A.head, 5 + k * 10, top + 10);
    if (big) {
      x.fillStyle = 'rgba(13,15,23,.55)'; x.fillRect(4, top + 21, 62, 9);
      text(x, 'ARMS', 6, top + 22, C.gold, 1, null); text(x, '~', 31, top + 22, C.white, 1, null); text(x, 'B10', 44, top + 22, C.white, 1, null);
    }
    const time = Math.max(0, 99 - Math.floor(clamp(inv(0.015, B.tally, p)) * 87));
    text(x, 'TIME', Math.round(wl / 2 - textW('TIME') / 2), top, C.gold);
    text(x, String(time).padStart(2, '0'), Math.round(wl / 2 - textW('00', 2) / 2), top + 9, C.white, 2);
    if (Math.floor(t * 1.6) % 2 === 0) {
      const ic = big ? 'INSERT COIN' : 'COIN';
      text(x, ic, wl - textW(ic) - 5, top, C.white);
    }
    // boss health
    if (p > B.lit && p < B.kill) {
      const hp = 1 - clamp(inv(B.fight, B.kill, p));
      const bw = Math.min(90, wl - 20);
      const bxx = Math.round(wl / 2 - bw / 2), byy = top + 26;
      x.fillStyle = C.ink; x.fillRect(bxx - 1, byy - 1, bw + 2, 6);
      x.fillStyle = '#5a1a1a'; x.fillRect(bxx, byy, bw, 4);
      x.fillStyle = Math.floor(t * 8) % 2 && hp < 0.3 ? C.white : C.red; x.fillRect(bxx, byy, Math.round(bw * hp), 4);
    }
    // MISSION 4 START!
    const ban = ease(0, 0.012, p) * (1 - ease(0.06, 0.075, p));
    if (ban > 0.01) {
      const sc = big ? 2 : 1;
      const l1 = 'MISSION 4', l2 = 'START!';
      const cx = wl / 2;
      const slide = Math.round((1 - ease(0, 0.012, p)) * wl);
      text(x, l1, Math.round(cx - textW(l1, sc) / 2) - slide, 70, C.white, sc);
      text(x, l2, Math.round(cx - textW(l2, sc + 1) / 2) + slide, 70 + 12 * sc, Math.floor(t * 6) % 2 ? C.gold : C.orange, sc + 1);
    }
    // WARNING!!
    if (p > B.warn && p < B.fight && Math.floor(t * 4) % 2 === 0) {
      const sc = big ? 2 : 1;
      x.fillStyle = 'rgba(255,59,59,.25)'; x.fillRect(0, 74, wl, 10 * sc + 4);
      text(x, 'WARNING!!', Math.round(wl / 2 - textW('WARNING!!', sc) / 2), 76, C.red, sc);
    }
    // MISSION COMPLETE tally
    if (p >= B.tally) {
      const sc = big ? 2 : 1;
      const k = clamp(inv(B.tally, B.tally + 0.04, p));
      const bw = Math.min(wl - 16, big ? 236 : 180), bh = 8 * sc + 50;
      const bxx = Math.round(wl / 2 - bw / 2), byy = 52;
      x.fillStyle = 'rgba(13,15,23,.78)'; x.fillRect(bxx, byy, bw, bh);
      x.fillStyle = C.gold; x.fillRect(bxx, byy, bw, 1); x.fillRect(bxx, byy + bh - 1, bw, 1);
      const l1 = big ? 'MISSION COMPLETE!' : 'COMPLETE!';
      text(x, l1, Math.round(wl / 2 - textW(l1, sc) / 2), byy + 6, Math.floor(t * 5) % 2 ? C.gold : C.white, sc);
      const rows = [['SCORE', String(S.best).padStart(6, '0')], ['KILLS', String(A.drones.length + 2).padStart(2, '0')], ['TIME BONUS', '3000']];
      rows.forEach(([l, r2], i) => {
        if (k < (i + 1) * 0.22) return;
        const yy = byy + 10 + 8 * sc + i * 10;
        text(x, l, bxx + 8, yy, C.white);
        text(x, r2, bxx + bw - 8 - textW(r2), yy, C.gold);
      });
    }
    x.globalAlpha = 1;
  }

  return {
    build, update, draw,
    dispose() { A = null; V = null; },
    crane: () => null,
  };
}
