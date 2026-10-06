import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sky from '../lib/sky.js';
import { Aud, Term } from '../lib/terminal.js';
import { setSmoothScroll } from '../lib/motion.js';
import { prefersReducedMotion } from '../lib/loop.js';
import { skySet, idleClip } from '../data/interests.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const IDLE_MS = 60000;

function effectiveLight() {
  const a = document.documentElement.getAttribute('data-theme');
  if (a === 'light') return true;
  if (a === 'dark') return false;
  return window.matchMedia('(prefers-color-scheme: light)').matches;
}

export function AppState({ children }) {
  const [isLight, setIsLight] = useState(() =>
    typeof window === 'undefined' ? false : effectiveLight()
  );
  const [skyClear, setSkyClear] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [features, setFeatures] = useState({ flash: false, audio: false, nomotion: false });
  const [termOpen, setTermOpen] = useState(false);
  const [routeKey, setRouteKey] = useState('home');

  const clearManual = useRef(false);
  const autoAudio = useRef(false);
  const idleTimer = useRef(null);
  const lastPick = useRef(-1);
  const toastTimer = useRef(null);
  const routeRef = useRef('home');
  routeRef.current = routeKey;

  /* ---------------- theme ---------------- */
  const syncTheme = useCallback(() => {
    const light = effectiveLight();
    setIsLight(light);
    document.body.classList.toggle('lightmode', light);
    Sky.setTheme(light);
  }, []);

  useEffect(() => {
    syncTheme();
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const h = () => syncTheme();
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, [syncTheme]);

  const toggleTheme = useCallback(
    (ev) => {
      document.documentElement.setAttribute('data-theme', effectiveLight() ? 'dark' : 'light');
      const w = document.getElementById('themewipe');
      if (w) {
        const x = ev?.clientX ?? window.innerWidth - 60;
        const y = ev?.clientY ?? 40;
        w.style.setProperty('--wx', `${(x / window.innerWidth) * 100}%`);
        w.style.setProperty('--wy', `${(y / window.innerHeight) * 100}%`);
        w.classList.remove('go');
        void w.offsetWidth;
        w.classList.add('go');
      }
      syncTheme();
    },
    [syncTheme]
  );

  /* ---------------- toast ---------------- */
  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2200);
  }, []);

  /* ---------------- cleared sky ---------------- */
  const pickClip = useCallback(() => {
    if (routeRef.current === 'interests') return idleClip;
    if (skySet.length < 2) return skySet[0];
    let i;
    do { i = Math.floor(Math.random() * skySet.length); } while (i === lastPick.current);
    lastPick.current = i;
    return skySet[i];
  }, []);

  const [clip, setClip] = useState(null);

  const setClear = useCallback(
    (on, manual = false) => {
      setSkyClear((was) => {
        if (was === on) { if (manual) clearManual.current = on; return was; }
        clearManual.current = on ? manual : false;
        document.body.classList.toggle('skyclear', on);
        Sky.setHidden(on || routeRef.current === 'interests');
        if (on) {
          setClip(pickClip());
          if (!features.audio) { Aud.unlock(); Aud.drone(true); autoAudio.current = true; }
        } else if (autoAudio.current && !features.audio) {
          Aud.drone(false);
          autoAudio.current = false;
        }
        return on;
      });
    },
    [features.audio, pickClip]
  );

  /* ---------------- idle ---------------- */
  const kickIdle = useCallback(() => {
    if (document.body.classList.contains('skyclear') && !clearManual.current) setClear(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (!features.nomotion && !Term.open) setClear(true);
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

  /* ---------------- features ---------------- */
  const toggleFeature = useCallback(
    (key) => {
      setFeatures((f) => {
        const next = { ...f, [key]: !f[key] };
        if (key === 'flash') document.body.classList.toggle('flash', next.flash);
        if (key === 'nomotion') {
          document.body.classList.toggle('nomotion', next.nomotion);
          setSmoothScroll(!next.nomotion && !prefersReducedMotion());
          toast(next.nomotion ? 'Motion reduced' : 'Motion restored');
        }
        if (key === 'audio') {
          Aud.unlock();
          Aud.drone(next.audio);
          autoAudio.current = false;
          toast(next.audio ? 'Ambient audio on' : 'Ambient audio off');
        }
        return next;
      });
    },
    [toast]
  );

  const value = useMemo(
    () => ({
      isLight, toggleTheme,
      skyClear, setClear, clip,
      toast, toastMsg,
      features, toggleFeature,
      termOpen, setTermOpen,
      routeKey, setRouteKey,
      kickIdle,
    }),
    [isLight, toggleTheme, skyClear, setClear, clip, toast, toastMsg, features, toggleFeature, termOpen, routeKey, kickIdle]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
