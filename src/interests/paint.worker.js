/* Runs a scene painter (see bakery.js) and hands the canvases back as
   ImageBitmaps, transferred rather than copied. */
import { PAINTERS } from './painters.js';

function pack(v, list) {
  if (typeof OffscreenCanvas !== 'undefined' && v instanceof OffscreenCanvas) {
    const bmp = v.transferToImageBitmap();
    list.push(bmp);
    return { __bmp: bmp, w: v.w ?? v.width, h: v.h ?? v.height, dpr: v.dpr ?? 1 };
  }
  if (Array.isArray(v)) return v.map((x) => pack(x, list));
  if (typeof v === 'function') return undefined;
  if (v && typeof v === 'object' && !ArrayBuffer.isView(v)) {
    if (v.canvas) return undefined;          // a 2D context riding along on a canvas
    const o = {};
    for (const k in v) o[k] = pack(v[k], list);
    return o;
  }
  return v;
}

self.onmessage = (e) => {
  const { id, key, env } = e.data;
  try {
    const t0 = performance.now();
    const out = PAINTERS[id](env);
    const list = [];
    const data = pack(out, list);
    self.postMessage({ id, key, data, ms: Math.round(performance.now() - t0) }, list);
  } catch (err) {
    self.postMessage({ id, key, error: String(err && err.stack || err) });
  }
};
