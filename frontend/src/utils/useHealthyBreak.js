import { useCallback, useEffect, useRef, useState } from 'react';
import { addActiveMs, getStats, resetSession, subscribe } from './learningSession';

// ✅ Healthy-Break-Warnung (2026-09-08, siehe claude/LernApp-UI-UX-Design-
// Mockups.md). Mockup nennt "2+ Stunden kontinuierliches Lernen" als
// Auslöser - hier als 2 Stunden AKTIVE Zeit umgesetzt (siehe
// learningSession.js für die Definition von "aktiv").
const BREAK_THRESHOLD_MS = 2 * 60 * 60 * 1000;
const TICK_MS = 15 * 1000;
// "Weitermachen" respektiert die Nutzer-Autonomie (siehe Mockup-Usability-
// Notiz "Weitermachen ist möglich") - blendet die Erinnerung für eine
// Weile aus, statt sie sofort erneut zu zeigen.
const SNOOZE_KEEP_GOING_MS = 30 * 60 * 1000;
const SNOOZE_REMIND_LATER_MS = 20 * 60 * 1000;
// Tab länger als 10 Minuten im Hintergrund/Rechner im Schlaf -> zählt als
// echte Pause, Sitzung setzt sich von selbst zurück (auch ohne Klick auf
// "Pause machen").
const AWAY_COUNTS_AS_BREAK_MS = 10 * 60 * 1000;

export function useHealthyBreak(enabled) {
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState(getStats());
  const snoozeUntilRef = useRef(0);
  const hiddenSinceRef = useRef(null);
  const lastTickRef = useRef(Date.now());

  useEffect(() => subscribe(setStats), []);

  useEffect(() => {
    if (!enabled) return undefined;

    const handleVisibility = () => {
      if (document.hidden) {
        hiddenSinceRef.current = Date.now();
        return;
      }
      if (hiddenSinceRef.current) {
        const wasAwayFor = Date.now() - hiddenSinceRef.current;
        if (wasAwayFor >= AWAY_COUNTS_AS_BREAK_MS) {
          resetSession();
          snoozeUntilRef.current = 0;
        }
        hiddenSinceRef.current = null;
      }
      lastTickRef.current = Date.now();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;

    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      if (document.hidden) return;
      const now = Date.now();
      addActiveMs(now - lastTickRef.current);
      lastTickRef.current = now;
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || visible) return;
    if (Date.now() < snoozeUntilRef.current) return;
    if (stats.activeMs >= BREAK_THRESHOLD_MS) {
      setVisible(true);
    }
  }, [enabled, stats, visible]);

  const takeBreak = useCallback(() => {
    resetSession();
    snoozeUntilRef.current = 0;
    setVisible(false);
  }, []);

  const remindLater = useCallback(() => {
    snoozeUntilRef.current = Date.now() + SNOOZE_REMIND_LATER_MS;
    setVisible(false);
  }, []);

  const keepGoing = useCallback(() => {
    snoozeUntilRef.current = Date.now() + SNOOZE_KEEP_GOING_MS;
    setVisible(false);
  }, []);

  return { visible, stats, takeBreak, remindLater, keepGoing };
}
