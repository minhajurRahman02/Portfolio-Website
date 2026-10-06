import { useEffect, useState } from 'react';

/* ================= liquid glass, the real thing =================
   Ported from the supplied fragment shader. That shader samples a texture
   through a superellipse lens — `pow(|x|,6) + pow(|y|,6)` — so the background
   is BENT at the rim and left alone in the middle. CSS `backdrop-filter` can
   blur what is behind an element but cannot move it, which is why a pure-CSS
   imitation never looks like glass.

   The one way to actually displace a live backdrop is an SVG filter used as a
   backdrop-filter: an feImage carrying a displacement map, fed to
   feDisplacementMap. The map below is the shader's height field, differentiated
   into surface normals and written into the R and G channels — R moves the
   sample horizontally, G vertically, 128 meaning "don't move".

   An feImage is stretched to the element it filters, so a single square map
   gives a fat rim on a wide card and a thin one on a tall card. Three maps are
   generated instead, one per rough aspect, and each element picks the nearest.
   RIM is expressed against the SHORT side so the band comes out the same
   thickness whichever way the card runs. */

const SIZE = 192;        // map resolution; it is heavily blurred in use
const RIM = 0.16;        // rim width, as a fraction of the short side
const AMP = 30;          // normal strength baked into the map

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Build one displacement map for a given width/height ratio. */
function buildMap(aspect) {
  const cv = document.createElement('canvas');
  cv.width = SIZE;
  cv.height = SIZE;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(SIZE, SIZE);

  // keep the band the same thickness on both axes once the map is stretched
  const bx = aspect >= 1 ? RIM / aspect : RIM;
  const by = aspect >= 1 ? RIM : RIM * aspect;

  /* superellipse radius — exactly 1 on the boundary, 0 at the centre. The
     exponent is the shader's 6, which is what gives a squircle rather than
     an ellipse. */
  const rad = (u, v) => {
    const nu = Math.abs(u) ** 6;
    const nv = Math.abs(v) ** 6;
    return (nu + nv) ** (1 / 6);
  };
  // flat across the middle, rolling off only inside the rim band
  const band = (bx + by) / 2;
  const h = (u, v) => 1 - smooth((rad(u, v) - (1 - band)) / band);

  const e = 2 / SIZE;
  for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE; i++) {
      const u = (i / (SIZE - 1)) * 2 - 1;
      const v = (j / (SIZE - 1)) * 2 - 1;
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

const VARIANTS = [
  { id: 'lg-wide', aspect: 2.2, scale: 46 },
  { id: 'lg-card', aspect: 1.0, scale: 48 },
  { id: 'lg-tall', aspect: 0.6, scale: 44 },
];

/* Rendered once, near the root. The maps are built on mount rather than
   shipped as files so there is nothing extra to load and nothing to go stale
   if RIM or AMP are retuned. */
export default function GlassFilter() {
  const [maps, setMaps] = useState(null);

  useEffect(() => {
    try {
      setMaps(VARIANTS.map((v) => buildMap(v.aspect)));
    } catch {
      // no canvas (or it is tainted) — the CSS fallback covers it
      setMaps(null);
    }
  }, []);

  if (!maps) return null;

  return (
    <svg className="lg-defs" aria-hidden="true" focusable="false">
      <defs>
        {VARIANTS.map((v, i) => (
          <filter
            id={v.id}
            key={v.id}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feImage href={maps[i]} result="map" preserveAspectRatio="none" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale={v.scale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
