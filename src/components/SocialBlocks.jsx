import { profile } from '../data/site.js';

/* ================= isometric glass blocks =================
   Taken from the reference's idea — a flat tile sheared into an isometric
   slab, with two extra faces faking the extrusion, lifting on hover — but
   the faces are lenses rather than flat fills, and the icon carries its own
   light. Each block is one <a> plus two pseudo-elements, which is why the
   extrusion is CSS and not an SVG.

   The shear is rotate(-30deg) skew(25deg): that pair maps a rectangle onto
   the isometric top face exactly, so the side and bottom faces can be plain
   skewed rectangles pinned to its edges. */

const ICONS = {
  GitHub: (
    <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48l-.01-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.93.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85l-.01 2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
  ),
  LinkedIn: (
    <>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z" />
      <path d="M3 9h4v12H3zM9 9h3.8v1.7h.05a4.17 4.17 0 0 1 3.75-2c4 0 4.4 2.63 4.4 6V21h-4v-5.3c0-1.27-.02-2.9-1.77-2.9s-2.04 1.38-2.04 2.8V21H9z" />
    </>
  ),
  Scholar: (
    <>
      <path d="M12 3 1.5 8.5 12 14l10.5-5.5z" />
      <path d="M5 11v4.2c0 1.9 3.13 3.4 7 3.4s7-1.5 7-3.4V11" />
    </>
  ),
  X: (
    <path
      fillRule="evenodd"
      d="M18.9 2.4h3.4l-7.5 8.5 8.8 11.6h-6.9l-5.4-7-6.2 7H1.7l8-9.1L1.3 2.4h7.1l4.8 6.4zm-1.2 17.6h1.9L7.1 4.3H5.1z"
    />
  ),
  Instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5.2" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.2" cy="6.8" r="1.1" />
    </>
  ),
  Facebook: (
    <path d="M14.6 21v-8h2.7l.4-3.2h-3.1V7.8c0-.9.26-1.55 1.58-1.55H17.8V3.4A21 21 0 0 0 15.4 3.3c-2.4 0-4.05 1.47-4.05 4.17V9.8H8.6V13h2.75v8z" />
  ),
  Email: (
    <>
      <path d="M3 5.5h18v13H3z" />
      <path d="m3 6.5 9 6.5 9-6.5" />
    </>
  ),
};

/** Icons drawn as a filled silhouette rather than a stroke. */
const SOLID = new Set(['GitHub', 'X', 'Facebook']);

/* brand-ish tints the block takes on hover */
const TINT = {
  GitHub: '#8B7BE8',
  LinkedIn: '#2E86E0',
  Scholar: '#2FDAF0',
  X: '#C9CBD6',
  Instagram: '#E1468A',
  Facebook: '#3B7BE8',
  Email: '#E0556B',
};

export default function SocialBlocks({ onCopyEmail }) {
  const blocks = [
    ...profile.links.map((l) => ({
      label: l.label,
      href: l.href,
      hint: l.href ? l.href.replace(/^https?:\/\//, '') : l.placeholder,
      ready: !!l.href,
    })),
    { label: 'Email', href: `mailto:${profile.email}`, hint: profile.email, ready: true },
  ];

  return (
    <ul className="iso-blocks">
      {blocks.map((b) => (
        <li key={b.label} style={{ '--tint': TINT[b.label] || 'var(--violet)' }}>
          <a
            href={b.ready ? b.href : undefined}
            target={b.href?.startsWith('http') ? '_blank' : undefined}
            rel="noreferrer noopener"
            className={b.ready ? '' : 'pending'}
            aria-label={b.label}
            onClick={(e) => {
              if (b.label === 'Email' && onCopyEmail) { e.preventDefault(); onCopyEmail(); }
              if (!b.ready) e.preventDefault();
            }}
          >
            <span className="iso-face">
              <svg viewBox="0 0 24 24" aria-hidden="true" className={SOLID.has(b.label) ? 'solid' : ''}>
                {ICONS[b.label]}
              </svg>
              <span className="iso-txt">
                <strong>{b.label}</strong>
                <em className="mono">{b.hint}</em>
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
