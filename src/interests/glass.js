/* Liquid glass filters. The site already mounts #lg-card / #lg-wide /
   #lg-tall (GlassFilter.jsx); the standalone demo does not, so this builds
   the same superellipse displacement maps and injects them only when they
   are missing. Same algorithm, same ids, so the CSS is identical in both. */

const SIZE = 192, RIM = 0.16, AMP = 30;
const VARIANTS = [
  { id: 'lg-wide', aspect: 2.2, scale: 46 },
  { id: 'lg-card', aspect: 1.0, scale: 48 },
  { id: 'lg-tall', aspect: 0.6, scale: 44 },
];
const sm = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

function buildMap(aspect) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = SIZE;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(SIZE, SIZE);
  const bx = aspect >= 1 ? RIM / aspect : RIM;
  const by = aspect >= 1 ? RIM : RIM * aspect;
  const band = (bx + by) / 2;
  const rad = (u, v) => (Math.abs(u) ** 6 + Math.abs(v) ** 6) ** (1 / 6);
  const h = (u, v) => 1 - sm((rad(u, v) - (1 - band)) / band);
  const e = 2 / SIZE;
  for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE; i++) {
      const u = (i / (SIZE - 1)) * 2 - 1, v = (j / (SIZE - 1)) * 2 - 1;
      const gx = (h(u + e, v) - h(u - e, v)) / (2 * e);
      const gy = (h(u, v + e) - h(u, v - e)) / (2 * e);
      const k = (j * SIZE + i) * 4;
      img.data[k] = Math.max(0, Math.min(255, 128 + gx * AMP));
      img.data[k + 1] = Math.max(0, Math.min(255, 128 + gy * AMP));
      img.data[k + 2] = 128;
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL();
}

export function ensureGlassDefs() {
  if (document.getElementById('lg-card')) return null;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'lg-defs ix-lg-defs');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  const defs = document.createElementNS(NS, 'defs');
  try {
    for (const v of VARIANTS) {
      const f = document.createElementNS(NS, 'filter');
      f.setAttribute('id', v.id);
      ['x', 'y'].forEach((a) => f.setAttribute(a, '0%'));
      ['width', 'height'].forEach((a) => f.setAttribute(a, '100%'));
      f.setAttribute('color-interpolation-filters', 'sRGB');
      const im = document.createElementNS(NS, 'feImage');
      im.setAttribute('href', buildMap(v.aspect));
      im.setAttribute('result', 'map');
      im.setAttribute('preserveAspectRatio', 'none');
      const dm = document.createElementNS(NS, 'feDisplacementMap');
      dm.setAttribute('in', 'SourceGraphic');
      dm.setAttribute('in2', 'map');
      dm.setAttribute('scale', String(v.scale));
      dm.setAttribute('xChannelSelector', 'R');
      dm.setAttribute('yChannelSelector', 'G');
      f.append(im, dm);
      defs.append(f);
    }
  } catch { return null; }
  svg.append(defs);
  document.body.prepend(svg);
  return svg;
}
