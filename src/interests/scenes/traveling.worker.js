/* Paints the Traveling layers off the main thread and hands them back as
   ImageBitmaps (transferred, not copied). */
import { paintAll } from './traveling-paint.js';

const pack = (c, list) => {
  const bmp = c.transferToImageBitmap();
  list.push(bmp);
  return { bmp, w: c.w, h: c.h };
};

self.onmessage = (e) => {
  const P = paintAll(e.data);
  const list = [];
  const layers = {};
  for (const k of ['far', 'hills', 'fields', 'emb', 'pole', 'grass', 'train']) layers[k] = pack(P[k], list);
  const clouds = P.clouds.map((c) => ({ ...pack(c.spr, list), x: c.x, y: c.y, d: c.d }));
  const geo = { carW: P.carW, carH: P.carH, nWin: P.nWin, wins: P.wins, topY: P.topY, trW: P.trW, trH: P.trH };
  self.postMessage({ key: P.key, layers, clouds, geo, times: P.times }, list);
};
