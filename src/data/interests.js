/* The nine interests. Copy, palettes and scenes live in src/interests/
   (content.js and config.js); this file only feeds the About-page carousel
   and holds the photo lists for the Interests sheets. */
import { INTERESTS } from '../interests/content.js';

/* glyphs for the carousel panels, in scroll order */
const GLYPH = {
  traveling: '△', photography: '◎', editing: '✂', gaming: '◆', cinema: '▶',
  reading: '❑', swimming: '≈', food: '◍', teaching: '⬡',
};

export const interests = INTERESTS.map((it) => ({
  id: it.id,
  num: it.n,
  title: it.title,
  blurb: it.sub,
  icon: GLYPH[it.id] || '✦',
}));

/* Photos for the Traveling and Photography sheets. The files currently in
   public/images/gal and public/images/travel are generated placeholders, so
   the sheets show labelled placeholder frames until PHOTOS_READY is true.
   Overwrite the files with real photos (same names), then flip the flag. */
export const PHOTOS_READY = false;

export const galleryShots = Array.from({ length: 10 }, (_, i) =>
  `/images/gal/gal-${String(i + 1).padStart(2, '0')}.jpg`
);

export const travelShots = {
  cover: '/images/travel/travel-cover.jpg',
  caption: 'Somewhere on the Dhaka–Sylhet road',
  grid: Array.from({ length: 6 }, (_, i) => `/images/travel/travel-0${i + 1}.jpg`),
};

export const byInterestId = (id) => interests.find((i) => i.id === id);
