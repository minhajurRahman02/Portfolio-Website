/* =====================================================================
   INTERESTS — tuning constants
   Everything you are likely to want to adjust lives here: scene lengths,
   parallax speeds, palettes, particle counts, and the quality switches.
   ===================================================================== */

/** Scene order is the scroll order. `len` is the scroll length in viewport
 *  heights; `rest` is the [start, end] of the stretch where the glass card
 *  sits still; `side` is where the card sits (`m: 'top'` lifts it to the top
 *  on phones, where the scene's subject sits low); `grade` feeds the colour
 *  bridge that runs a little ahead of every transition. */
export const SCENES = [
  { id: 'traveling',   len: 2.5, rest: [0.42, 0.66], side: 'left',   grade: '#F0A550', accent: '#FFD27A' , m: 'top' },
  { id: 'photography', len: 2.0, rest: [0.30, 0.62], side: 'right',  grade: '#B394DD', accent: '#FFB547' },
  { id: 'editing',     len: 2.0, rest: [0.26, 0.60], side: 'left',   grade: '#1FB5C9', accent: '#8C6BFF' , m: 'top' },
  { id: 'gaming',      len: 5.0, rest: [0.07, 0.24], side: 'left',   grade: '#FF8A3D', accent: '#FFE14A' },
  { id: 'cinema',      len: 2.0, rest: [0.30, 0.64], side: 'right',  grade: '#7FE0FF', accent: '#FFF1C9' , m: 'top' },
  { id: 'reading',     len: 2.0, rest: [0.26, 0.58], side: 'left',   grade: '#FFE3A3', accent: '#FFE3A3' },
  { id: 'swimming',    len: 2.0, rest: [0.30, 0.62], side: 'right',  grade: '#59C7D2', accent: '#CFF6F2' , m: 'top' },
  { id: 'food',        len: 2.0, rest: [0.30, 0.62], side: 'left',   grade: '#FF5E3A', accent: '#FFB347' , m: 'top' },
  { id: 'teaching',    len: 2.5, rest: [0.16, 0.40], side: 'right',  grade: '#FF9E6B', accent: '#FFCF7A' },
];

export const INTRO_LEN = 1.0;      // viewport heights of title sequence before scene 1
export const OUTRO_LEN = 0.6;      // extra scroll after the last scene for the closing card
export const TRANSITION = 0.55;    // viewport heights each scene overlaps the next
export const CARD_FADE = 0.11;     // fraction of a scene the card takes to fade in / out

/* ---------------- quality ---------------- */
export const QUALITY = {
  maxDPR: 1.5,          // main canvas device-pixel cap; scenes are soft, 1.5 is plenty
  bakeDPR: 1.25,        // pre-rendered layers
  keepBaked: 1,         // scenes kept baked either side of the current one
  particleScale: 1,     // global particle multiplier (mobile halves it automatically)
  mobileLayers: true,   // drop the least important layers under 720px
};

/* ---------------- liquid glass (T3) ----------------
   Full refraction while scroll is at rest; blur-only while scrolling fast. */
export const GLASS = {
  fastVelocity: 1400,   // px/s of scroll above which refraction switches off
  settleMs: 220,        // how long scroll must stay slow before it switches back on
};

/* ---------------- bottom sheet ---------------- */
export const SHEET = {
  topGap: '6vh',
  radius: 28,
  openDur: 0.72,
  closeDur: 0.5,
  pushNear: 0.32,       // how far near layers drop out of frame (× viewport height)
  shrinkFar: 0.04,      // far layers shrink by this much
};

/* ---------------- per-scene tuning ---------------- */
export const TRAVEL = {
  speed: 90,            // px/s the landscape moves at depth 1
  depth: { clouds: 0.05, far: 0.1, hills: 0.25, fields: 0.5, rail: 0.7, poles: 1.25, grass: 1.6 },
  pollen: 60, fireflies: 46,
  // time-of-day keyframes: p → sky top, sky mid, horizon, land tint, tint amount, cloud tint
  sky: [
    [0.00, '#0B1030', '#1E2552', '#3B3463', '#1A2040', 0.78, '#2A2F5A'],
    [0.12, '#38457E', '#8A7BA8', '#F7C9A9', '#9C8AAE', 0.34, '#F4B7A8'],
    [0.30, '#4D9BE0', '#8DC6EA', '#DDEFF7', '#FFFFFF', 0.00, '#FFFFFF'],
    [0.55, '#5A7CC0', '#E8A86A', '#F0A550', '#F5A35A', 0.30, '#FFC48A'],
    [0.72, '#2A2A5E', '#6A4B8C', '#E07A5F', '#6A4B8C', 0.52, '#B0709A'],
    [0.86, '#060B22', '#0C1431', '#1C2550', '#0E1838', 0.80, '#1E2850'],
    [1.00, '#04081A', '#0A1029', '#141C40', '#0A1230', 0.84, '#18203E'],
  ],
};

export const PHOTO = {
  focusLayers: [0.05, 0.22, 0.38, 0.58, 0.8, 1.0], // depth of each layer, far → macro
  zoomMax: 85 / 24,
  bokeh: 34,
};

export const EDIT = {
  grades: [ // multiply, screen, flash
    { name: 'TEAL / ORANGE', mul: '#5FB8C8', scr: '#3A1C08', key: '#FF9E45' },
    { name: 'TUNGSTEN',      mul: '#FFC27A', scr: '#1A0E00', key: '#FFD08A' },
    { name: 'COLD BLUE',     mul: '#7FA2FF', scr: '#000A22', key: '#9CC4FF' },
    { name: 'MAGENTA RAIN',  mul: '#E77FD0', scr: '#220018', key: '#FF4F9A' },
  ],
  rain: 70, cars: 22,
};

export const CINEMA = { bpm: 96, grass: 260, fireflies: 34, motes: 70 };
export const READ = { motes: 120, birds: 14 };
export const SWIM = { bubbles: 70, snow: 110, fish: 46, kelp: 16, surfaceAt: 0.78 };
export const FOOD = { steam: 46, embers: 40, crowd: 9, lanterns: 7 };
export const TEACH = { motes: 150, stars: 260 };

/* ---------------- gaming ---------------- */
export const GAME = {
  baseH: 216,           // logical pixel height of the arcade canvas
  minW: 150,            // logical width never drops below this (portrait letterboxes)
  levelW: 2860,         // logical pixels of level
  camEnd: 0.70,         // scene progress at which the camera reaches the arena
  // boss sequence, in scene progress (the scene hands over to Cinema from ~0.89)
  beats: { warn: 0.69, eyes: 0.70, lit: 0.72, fight: 0.735, kill: 0.80, tally: 0.82 },
  depth: { clouds: 0.03, mega: 0.08, city: 0.15, jungle: 0.35, near: 0.6, fg: 1.5 },
  heroLead: 0.34,       // hero sits this far across the screen when running right
  runFpsMin: 7, runFpsMax: 18,
  dust: 40, embers: 26,
};
