import { useCallback, useEffect, useRef, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import Backdrop from './components/Backdrop.jsx';
import GlassFilter from './components/GlassFilter.jsx';
import { BackToTop, Cursor, Dock, ScrollFlag, Toast, TopBar, AssistMenu } from './components/Chrome.jsx';
import OverlayMenu from './components/OverlayMenu.jsx';
import CaseModal from './components/CaseModal.jsx';
import TerminalPane from './components/TerminalPane.jsx';
import Preloader, { alreadyBooted } from './components/Preloader.jsx';
import { Mark } from './components/icons.jsx';

import Home from './pages/Home.jsx';
import Work from './pages/Work.jsx';
import About from './pages/About.jsx';
import Blog from './pages/Blog.jsx';
import Contact from './pages/Contact.jsx';
import Interests from './pages/Interests.jsx';
import NotFound from './pages/NotFound.jsx';

import { useApp } from './context/AppState.jsx';
import { setSmoothScroll, refreshTriggers, scrollTop } from './lib/motion.js';
import { prefersReducedMotion } from './lib/loop.js';
import Sky from './lib/sky.js';
import { routes, profile } from './data/site.js';

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

/* The route curtain. Five panels sweep up, the page is swapped behind them,
   then they sweep away — which means the rendered location has to lag the
   real one by the length of the sweep. */
function useCurtain(location, onSwap) {
  const [shown, setShown] = useState(location);
  const curtain = useRef(null);

  useEffect(() => {
    if (location.pathname === shown.pathname) { setShown(location); return; }

    const instant = prefersReducedMotion() || document.body.classList.contains('nomotion');
    if (instant) { setShown(location); onSwap?.(); return; }

    const c = curtain.current;
    c?.classList.remove('out');
    c?.classList.add('in');
    const a = setTimeout(() => {
      setShown(location);
      onSwap?.();
      c?.classList.remove('in');
      c?.classList.add('out');
    }, 430);
    const b = setTimeout(() => c?.classList.remove('out'), 430 + 560);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [location, shown.pathname, onSwap]);

  return { shown, curtain };
}

export default function App() {
  const location = useLocation();
  const { setRouteKey, setClear, skyClear, features, toast } = useApp();

  const [booted, setBooted] = useState(() => alreadyBooted());
  const [menu, setMenu] = useState(false);
  const [feat, setFeat] = useState(false);
  const [caseId, setCaseId] = useState(null);
  const featBtn = useRef(null);

  const onSwap = useCallback(() => {
    scrollTop(true);
    document.body.classList.remove('scrolled');
    setCaseId(null);
    // ScrollTrigger measured the previous page; the new one has new heights
    requestAnimationFrame(() => requestAnimationFrame(refreshTriggers));
  }, []);

  const { shown, curtain } = useCurtain(location, onSwap);

  /* route bookkeeping, keyed off the location actually on screen */
  useEffect(() => {
    const key = routes.find((r) => r.path === shown.pathname)?.key ?? '404';
    setRouteKey(key);
    const onInterests = key === 'interests';
    document.body.classList.toggle('always-dock', onInterests);
    document.body.classList.toggle('on-interests', onInterests);
    // the Interests backdrop is video, so the procedural sky stands down there
    Sky.setHidden(onInterests || document.body.classList.contains('skyclear'));
    if (!onInterests) document.body.classList.remove('daylight');
    setMenu(false);
    setFeat(false);
  }, [shown.pathname, setRouteKey]);

  /* smooth scroll follows the Reduce-motion switch */
  useEffect(() => {
    setSmoothScroll(!features.nomotion && !prefersReducedMotion());
    return () => setSmoothScroll(false);
  }, [features.nomotion]);

  /* a cleared sky is dismissed by any click outside the return chip */
  useEffect(() => {
    if (!skyClear) return;
    const down = (e) => { if (!e.target.closest('#clearhint, #dock, #assist')) setClear(false); };
    const esc = (e) => { if (e.key === 'Escape') setClear(false); };
    window.addEventListener('pointerdown', down);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('keydown', esc);
    };
  }, [skyClear, setClear]);

  /* konami → zero gravity */
  useEffect(() => {
    let i = 0;
    const key = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      i = k === KONAMI[i] ? i + 1 : k === KONAMI[0] ? 1 : 0;
      if (i < KONAMI.length) return;
      i = 0;
      document.body.classList.toggle('zerog');
      toast(document.body.classList.contains('zerog') ? 'Gravity disabled 🛸' : 'Gravity restored');
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [toast]);

  /* escape closes whatever is on top */
  useEffect(() => {
    const esc = (e) => {
      if (e.key !== 'Escape') return;
      setFeat(false);
      setMenu(false);
      setCaseId(null);
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  return (
    <>
      <Backdrop />
      <GlassFilter />
      <Cursor />
      <ScrollFlag />

      {!booted && <Preloader onDone={() => setBooted(true)} />}

      <TopBar onMenu={() => setMenu(true)} />
      <Dock
        onMenu={() => setMenu(true)}
        onFeatures={() => setFeat((v) => !v)}
        featOpen={feat}
        featBtnRef={featBtn}
      />
      <AssistMenu open={feat} close={() => setFeat(false)} anchorRef={featBtn} />
      <OverlayMenu open={menu} close={() => setMenu(false)} />

      <main id="app">
        <Routes location={shown} key={shown.pathname}>
          <Route path="/" element={<Home onCase={setCaseId} />} />
          <Route path="/work" element={<Work onCase={setCaseId} />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/interests" element={<Interests />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer id="foot">
        <Mark className="foot-mark" />
        <div className="foot-row">
          <p className="mono xs dim">{profile.short} · {new Date().getFullYear()}</p>
          <p className="mono xs dim">Features live in the dock →</p>
        </div>
      </footer>

      <BackToTop />
      <CaseModal id={caseId} close={() => setCaseId(null)} />
      <TerminalPane />
      <Toast />

      <div id="curtain-nav" ref={curtain} aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>
    </>
  );
}
