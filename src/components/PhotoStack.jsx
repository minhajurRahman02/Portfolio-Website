import { useState } from 'react';
import { about, profile } from '../data/site.js';

/* The portrait frame. Height is fixed by an aspect ratio in the stylesheet,
   because the photos are not the same shape and letting the first one set
   the box made the frame jump on every change. The photo only changes when
   it is clicked: no timer, no arrow button. */
export default function PhotoStack() {
  const [i, setI] = useState(0);
  const n = about.photos.length;
  const next = () => setI((v) => (v + 1) % n);

  return (
    <figure className="photoframe">
      <div
        className="pf-stack"
        onClick={next}
        role="button"
        tabIndex={0}
        aria-label={`Photo ${i + 1} of ${n} — show the next one`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); }
        }}
      >
        {about.photos.map((src, k) => (
          <img
            className={k === i ? 'on' : ''}
            key={src}
            src={src}
            alt={k === 0 ? profile.name : ''}
            width="900"
            height="959"
            decoding="async"
            // only the shown photo and the next one are fetched up front
            loading={k <= 1 ? 'eager' : 'lazy'}
          />
        ))}
      </div>
      <div className="pf-dots" aria-hidden="true">
        {about.photos.map((src, k) => <i className={k === i ? 'on' : ''} key={src} />)}
      </div>
      <figcaption className="mono xs dim">Click the photo to change it</figcaption>
    </figure>
  );
}
