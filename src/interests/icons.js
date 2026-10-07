/* Stroke icons for the chapter rail, cards and sheet (24×24, currentColor). */
const P = {
  train: '<rect x="5" y="3" width="14" height="14" rx="3.5"/><path d="M5 10h14M9 21l-2-4M15 21l2-4"/><circle cx="9" cy="13.5" r=".6"/><circle cx="15" cy="13.5" r=".6"/>',
  aperture: '<circle cx="12" cy="12" r="9"/><path d="m14.3 3.3-4.6 8M20.6 9.2l-9.2.1M18.3 18.1l-4.6-8M9.7 20.7l4.6-8M3.4 14.8l9.2-.1M5.7 5.9l4.6 8"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
  gamepad: '<path d="M6 8h12a4 4 0 0 1 4 4v1a4 4 0 0 1-7 2.6L14 14h-4l-1 1.6A4 4 0 0 1 2 13v-1a4 4 0 0 1 4-4z"/><path d="M7 10.5v3M5.5 12h3"/><circle cx="16" cy="11" r=".7"/><circle cx="18" cy="13" r=".7"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  book: '<path d="M12 6.5C10.3 5 7.8 4.5 4 4.5v13c3.8 0 6.3.5 8 2 1.7-1.5 4.2-2 8-2v-13c-3.8 0-6.3.5-8 2z"/><path d="M12 6.5v13"/>',
  wave: '<path d="M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M2 19.5c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><circle cx="12" cy="6.5" r="3"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1.5 1.5-1.5 1.5-3M12 7c0-1.5 1.5-1.5 1.5-3M16 7c0-1.5 1.5-1.5 1.5-3"/>',
  chalk: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M7 20h10M12 16v4M6.5 12.5l3-4 2.5 2.5 2-2.5 3.5 4"/>',
  expand: '<path d="M7 17 17 7M9 7h8v8"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 9"/>',
};

export const icon = (name, cls = '') =>
  `<svg class="ix-ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
