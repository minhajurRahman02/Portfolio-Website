import { useId } from 'react';

/* The monogram: an orbital ring crossing a circle, with one node on it.
   Abstract on purpose — no letters. */
export function Mark({ className = 'mark' }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <circle className="m-orbit" cx="50" cy="50" r="34" />
      <ellipse className="m-ring" cx="50" cy="50" rx="46" ry="19" transform="rotate(-32 50 50)" />
      <circle className="m-node" cx="50" cy="16" r="5.5" />
    </svg>
  );
}

/** Sun that a mask bites into to become a moon. The mask id must be unique
    per instance or the second copy inherits the first one's geometry. */
export function ThemeIcon() {
  const id = useId().replace(/[:]/g, '');
  return (
    <svg viewBox="0 0 24 24" className="th-ico">
      <defs>
        <mask id={id}>
          <rect width="24" height="24" fill="#fff" />
          <circle className="th-bite" cx="19" cy="6" r="7.2" fill="#000" />
        </mask>
      </defs>
      <circle cx="12" cy="12" r="7" mask={`url(#${id})`} />
      <g className="th-rays">
        <path d="M12 1v2M12 21v2M23 12h-2M3 12H1M19.8 4.2l-1.4 1.4M5.6 18.4l-1.4 1.4M19.8 19.8l-1.4-1.4M5.6 5.6 4.2 4.2" />
      </g>
    </svg>
  );
}

export function MenuIcon() {
  const pts = [6, 12, 18];
  return (
    <svg viewBox="0 0 24 24" className="mn-ico">
      {pts.map((y) => pts.map((x) => <circle cx={x} cy={y} r="1.9" key={`${x}-${y}`} />))}
    </svg>
  );
}

const P = {
  home: <path d="M3 11.2 12 4l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  work: <path d="M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
  about: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </>
  ),
  blog: (
    <>
      <path d="M5 3h9l5 5v13H5z" />
      <path d="M8 12h8M8 16h5" />
    </>
  ),
  contact: (
    <>
      <path d="M3 6h18v12H3z" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  interests: <path d="M12 3.5 14.6 9l6 .9-4.3 4.2 1 6-5.3-2.8L6.7 20l1-6L3.4 9.9 9.4 9z" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: <path d="M5 12h14M13 5l7 7-7 7" />,
  expand: <path d="M9 4H4v5M15 20h5v-5M20 9V4h-5M4 15v5h5" />,
  clear: (
    <>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
      <circle cx="12" cy="12" r="3.4" />
    </>
  ),
  flash: <path d="M9 2h6v4l-2 3v11h-2V9L9 6z" />,
  audio: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9z" />
      <path d="M17 8a6 6 0 0 1 0 8" />
    </>
  ),
  term: (
    <>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <path d="m7 10 2.5 2L7 14M12.5 15h4" />
    </>
  ),
  motion: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12h8" />
    </>
  ),
  features: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.6" />
    </>
  ),
  up: <path d="M12 19V5M5 12l7-7 7 7" />,
  mail: (
    <>
      <path d="M3 6h18v12H3z" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 5H6a1 1 0 0 0-1 1v9" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
};

export function Ico({ name, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {P[name] ?? null}
    </svg>
  );
}
