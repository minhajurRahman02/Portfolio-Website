/* =====================================================================
   BAKERY — paints every scene's still layers off the main thread.

   Each realistic scene has a painter (scenes/<id>-paint.js) that turns a
   viewport size into canvases: per-pixel rock, water, wood, fabric, sky.
   That is hundreds of milliseconds of maths per scene, so it runs in one
   Web Worker (paint.worker.js) and the results come back as transferred
   ImageBitmaps. The page never drops a frame for it.

   - baked(id, env) is called by a scene every frame until it returns its
     layers; the first call queues the job at the front of the line.
   - while the worker is idle it paints ahead along the scroll order, so the
     next scenes are usually ready before the visitor reaches them.
   - results outlive a scene being disposed (scroll far away and back is
     instant) and are kept for the last few scenes only.
   - where a worker cannot draw (no 2D OffscreenCanvas) the painter runs
     here instead, once per scene.
   ===================================================================== */
import { PAINTERS, ORDER } from './painters.js';

const KEEP = 4;              // scenes whose layers stay in memory
const AHEAD = 2;             // scenes painted ahead of the one last asked for

const CACHE = new Map();     // id → { key, data }
const QUEUE = [];            // [{ id, env, key }]
let BUSY = null;             // job the worker is painting
let WORKER = null;
let NO_WORKER = false;
let LAST = null;             // last scene asked for, drives look-ahead
let ENV = null;
/** painting time per scene in ms, readable from the console as __interestsBake */
const TIMES = {};
globalThis.__interestsBake = TIMES;

const keyOf = (env) => `${env.W}x${env.H}x${env.dpr}`;

/* bitmaps cross the worker boundary wrapped with their CSS size */
function revive(v) {
  if (Array.isArray(v)) return v.map(revive);
  if (v && typeof v === 'object') {
    if (v.__bmp) { const b = v.__bmp; b.w = v.w; b.h = v.h; b.dpr = v.dpr; return b; }
    const o = {};
    for (const k in v) o[k] = revive(v[k]);
    return o;
  }
  return v;
}

function store(id, key, data) {
  CACHE.delete(id);
  CACHE.set(id, { key, data });
  while (CACHE.size > KEEP) {
    // evict the oldest that is not the one just asked for
    for (const k of CACHE.keys()) { if (k !== LAST) { CACHE.delete(k); break; } }
  }
}

function paintHere(job) {
  const t0 = performance.now();
  try { store(job.id, job.key, PAINTERS[job.id](job.env)); TIMES[job.id] = Math.round(performance.now() - t0); }
  catch (e) { console.warn('[interests] painting failed for', job.id, e); store(job.id, job.key, null); }
}

function canWork() {
  return !NO_WORKER && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' &&
    typeof OffscreenCanvas.prototype.transferToImageBitmap === 'function';
}

function worker() {
  if (WORKER) return WORKER;
  WORKER = new Worker(new URL('./paint.worker.js', import.meta.url), { type: 'module' });
  WORKER.onmessage = (e) => {
    const { id, key, data, error, ms } = e.data;
    if (ms != null) TIMES[id] = ms;
    if (error) {
      // a worker that cannot paint this (an older engine) hands it back once
      console.warn('[interests] worker could not paint', id, error);
      NO_WORKER = true;
      WORKER.terminate(); WORKER = null;
      if (BUSY) paintHere(BUSY);
    } else if (BUSY && BUSY.id === id && BUSY.key === key) {
      store(id, key, revive(data));
    }
    BUSY = null;
    pump();
  };
  WORKER.onerror = (ev) => {
    ev.preventDefault?.();
    NO_WORKER = true;
    WORKER?.terminate(); WORKER = null;
    const job = BUSY; BUSY = null;
    if (job) paintHere(job);
    pump();
  };
  return WORKER;
}

function lookAhead() {
  // painting ahead only makes sense off the main thread
  if (!LAST || !ENV || !canWork()) return;
  const i = ORDER.indexOf(LAST);
  const key = keyOf(ENV);
  for (let k = 1; k <= AHEAD; k++) {
    const id = ORDER[i + k];
    if (!id) break;
    const c = CACHE.get(id);
    if ((c && c.key === key) || QUEUE.some((q) => q.id === id)) continue;
    QUEUE.push({ id, env: ENV, key });
    return;      // one at a time, so a real request never waits long
  }
}

function pump() {
  if (BUSY) return;
  if (!QUEUE.length) lookAhead();
  const job = QUEUE.shift();
  if (!job) return;
  const c = CACHE.get(job.id);
  if (c && c.key === job.key) { pump(); return; }
  if (!canWork()) {
    // no worker: paint now, but give the frame back first
    BUSY = job;
    setTimeout(() => { BUSY = null; paintHere(job); pump(); }, 0);
    return;
  }
  BUSY = job;
  try { worker().postMessage({ id: job.id, key: job.key, env: job.env }); }
  catch { NO_WORKER = true; BUSY = null; paintHere(job); pump(); }
}

/** The painted layers for scene `id` at this viewport, or null while they
 *  are still on their way. Cheap enough to call every frame. */
export function baked(id, env) {
  const key = keyOf(env);
  const c = CACHE.get(id);
  if (c && c.key === key) return c.data;
  if (LAST !== id || !ENV || keyOf(ENV) !== key) { LAST = id; ENV = { W: env.W, H: env.H, dpr: env.dpr, mobile: env.mobile }; }
  const queued = QUEUE.findIndex((q) => q.id === id);
  const busy = BUSY && BUSY.id === id && BUSY.key === key;
  if (!busy) {
    if (queued >= 0) QUEUE.splice(queued, 1);
    QUEUE.unshift({ id, env: ENV, key });
  }
  pump();
  return null;
}
