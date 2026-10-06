import { useCallback, useEffect, useRef, useState } from 'react';
import { about, profile } from '../data/site.js';

/* The portrait frame. Height is fixed by an aspect ratio in the stylesheet,
   because the three photos are not the same shape and letting the first one
   set the box made the frame jump on every change. */
export default function PhotoStack() {
  const [i, setI] = useState(0);
  const timer = useRef(null);
  const n = about.photos.length;

  const show = useCallback(
    (k) => {
      setI(((k % n) + n) % n);
      clearInterval(timer.current);
      timer.current = setInterval(() => setI((v) => (v + 1) % n), 7000);
    },
    [n]
  );

  useEffect(() => {
    timer.current = setInterval(() => setI((v) => (v + 1) % n), 7000);
    return () => clearInterval(timer.current);
  }, [n]);

  return (
    <figure className="photoframe">
      <div className="pf-stack" onClick={() => show(i + 1)}>
        {about.photos.map((src, k) => (
          <img
            className={k === i ? 'on' : ''}
            key={src}
            src={src}
            alt={k === 0 ? profile.name : ''}
            width="900"
            height="959"
          />
        ))}
      </div>
      <button className="pf-next" onClick={(e) => { e.stopPropagation(); show(i + 1); }} aria-label="Next photo">
        <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
      </button>
      <div className="pf-dots">
        {about.photos.map((src, k) => <i className={k === i ? 'on' : ''} key={src} />)}
      </div>
      <figcaption className="mono xs dim">Click the photo to change it</figcaption>
    </figure>
  );
}
