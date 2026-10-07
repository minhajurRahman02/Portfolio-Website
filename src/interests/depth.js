/* One helper every scene draws its layers through. `d` is the layer's
   depth (0 = sky, 1 = playfield, >1 = in front of the lens). It applies:
   - a little cursor parallax, scaled by depth;
   - the bottom-sheet dolly: near layers drop out of frame and far layers
     shrink slightly while a sheet is open, then restore when it closes. */
import { SHEET } from './config.js';

export function layer(ctx, s, d, fn) {
  const { W, H } = s;
  const sh = s.sheet;
  const px = (s.mx - 0.5) * d * 16 * (1 - sh);
  const py = (s.my - 0.5) * d * 7 * (1 - sh);
  let dy = 0, sc = 1;
  if (sh > 0.001) {
    const e = sh * sh * (3 - 2 * sh);
    if (d > 0.4) dy = e * H * SHEET.pushNear * Math.min(1.6, (d - 0.4) * 1.6);
    sc = 1 - SHEET.shrinkFar * e * Math.max(0, 1 - d);
  }
  if (!px && !py && !dy && sc === 1) { fn(); return; }
  ctx.save();
  ctx.translate(W / 2 - px, H * 0.62 + dy - py);
  ctx.scale(sc, sc);
  ctx.translate(-W / 2, -H * 0.62);
  fn();
  ctx.restore();
}

/** Same push as `layer`, as plain offsets — for scenes that position things themselves. */
export function push(s, d) {
  const sh = s.sheet;
  const e = sh * sh * (3 - 2 * sh);
  return {
    x: -(s.mx - 0.5) * d * 16 * (1 - sh),
    y: (d > 0.4 ? e * s.H * SHEET.pushNear * Math.min(1.6, (d - 0.4) * 1.6) : 0) - (s.my - 0.5) * d * 7 * (1 - sh),
  };
}
