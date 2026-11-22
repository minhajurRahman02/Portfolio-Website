import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sky from '../lib/sky.js';
import { Aud, Term } from '../lib/terminal.js';
import { setSmoothScroll } from '../lib/motion.js';
import { prefersReducedMotion } from '../lib/loop.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const IDLE_MS = 60000;

export function AppState({ children }) {
  const [skyClear, setSkyClear] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [features, setFeatures] = useState({ flash: false, audio: false, nomotion: false });
  const [termOpen, setTermOpen] = useState(false);
  const [routeKey, setRouteKey] = useState('home');

  const clearManual = useRef(false);
  const idleTimer = useRef(null);
  const toastTimer = useRef(null);
  const routeRef = useRef('home');
  routeRef.current = routeKey;

  /* ---------------- theme ----------------
     Dark only. index.html pins data-theme="dark" and color-scheme:dark on
     <html>, so neither the OS nor the browser can switch the palette. */

  /* ---------------- toast ---------------- */
  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2200);
  }, []);

  /* ---------------- cleared sky ----------------
     Darkness plus fireflies, drawn in src/lib/fireflies.js. No clip, and no
     ambient audio — the drone lives in the Features fan only. */
  const setClear = useCallback((on, manual = false) => {
    setSkyClear((was) => {
      if (was === on) { if (manual) clearManual.current = on; return was; }
      clearManual.current = on ? manual : false;
      document.body.classList.toggle('skyclear', on);
      // the procedural sky stays down on /interests, where the backdrop is video
      Sky.setHidden(routeRef.current === 'interests');
      return on;
    });
  }, []);

  /* ---------------- idle ---------------- */
  const kickIdle = useCallback(() => {
    if (document.body.classList.contains('skyclear') && !clearManual.current) setClear(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      // not while an Interests sheet is open — the veil would sit behind it
      const sheetOpen = document.documentElement.classList.contains('ix-locked');
      if (!features.nomotion && !Term.open && !sheetOpen) setClear(true);
    }, IDLE_MS);
  }, [features.nomotion, setClear]);

  useEffect(() => {
    const evs = ['keydown', 'pointerdown', 'wheel', 'touchstart', 'scroll'];
    evs.forEach((e) => window.addEventListener(e, kickIdle, { passive: true }));
    kickIdle();
    return () => {
      evs.forEach((e) => window.removeEventListener(e, kickIdle));
      clearTimeout(idleTimer.current);
    };
  }, [kickIdle]);

  /* ---------------- features ----------------
     Side effects run outside the state updater: React may call an updater
     twice (StrictMode does in dev), which toggled the flashlight/audio class
     straight back off again. */
  const featRef = useRef(features);
  featRef.current = features;

  const toggleFeature = useCallback(
    (key) => {
      const next = { ...featRef.current, [key]: !featRef.current[key] };
      featRef.current = next;
      setFeatures(next);
      if (key === 'flash') document.body.classList.toggle('flash', next.flash);
      if (key === 'nomotion') {
        document.body.classList.toggle('nomotion', next.nomotion);
        setSmoothScroll(!next.nomotion && !prefersReducedMotion());
        toast(next.nomotion ? 'Motion reduced' : 'Motion restored');
      }
      if (key === 'audio') {
        Aud.unlock();
        Aud.drone(next.audio);
        toast(next.audio ? 'Ambient audio on' : 'Ambient audio off');
      }
    },
    [toast]
  );

  const value = useMemo(
    () => ({
      skyClear, setClear,
      toast, toastMsg,
      features, toggleFeature,
      termOpen, setTermOpen,
      routeKey, setRouteKey,
      kickIdle,
    }),
    [skyClear, setClear, toast, toastMsg, features, toggleFeature, termOpen, routeKey, kickIdle]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
