import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { mountInterests } from '../interests/engine.js';
import '../interests/interests.css';
import { onFrame, prefersReducedMotion } from '../lib/loop.js';
import { getLenis } from '../lib/motion.js';
import { PHOTOS_READY, galleryShots, travelShots } from '../data/interests.js';

/* The Interests page is a self-contained scroll engine (src/interests/),
   the same code the standalone demo runs. React only gives it a host
   element and the site's plumbing: the shared rAF loop (so there is still
   exactly one loop), the Lenis instance, the Reduce-motion switch, router
   navigation for the closing links, and the photo lists. */
export default function Interests() {
  const host = useRef(null);
  const app = useRef(null);
  const navigate = useNavigate();
  const { hash } = useLocation();

  useEffect(() => {
    app.current = mountInterests(host.current, {
      ticker: (fn) => onFrame(fn),
      lenis: getLenis,
      reduced: () => prefersReducedMotion() || document.body.classList.contains('nomotion'),
      media: PHOTOS_READY ? { gallery: galleryShots, travel: travelShots } : {},
      links: [{ label: 'Say hello →', href: '/contact' }],
      onNavigate: (href) => navigate(href),
    });
    return () => { app.current?.destroy(); app.current = null; };
  }, [navigate]);

  /* arriving from the About carousel: /interests#gaming */
  useEffect(() => {
    if (!hash || !app.current) return;
    const t = setTimeout(() => app.current?.goTo(hash.slice(1), true), 120);
    return () => clearTimeout(t);
  }, [hash]);

  return <section className="ix-page" data-page="interests" ref={host} />;
}
