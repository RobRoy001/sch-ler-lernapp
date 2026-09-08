// ✅ Healthy-Break-Warnung (2026-09-08, siehe claude/LernApp-UI-UX-Design-
// Mockups.md, Abschnitt "UX PATTERNS & MODALS - Healthy Break Warning").
//
// Bewusst rein clientseitig, ohne eigene Backend-Tabelle: es gibt aktuell
// keine "learning_sessions"-Tabelle (siehe claude/Backend-Audit-Findings.md,
// dort nur als mögliche künftige Erweiterung genannt) - eine neue Tabelle
// samt Endpunkten nur für eine Wellbeing-Erinnerung wäre unverhältnismäßig.
// Gezählt wird deshalb nur die durchgehende AKTIVE Zeit in DIESER
// Browser-Sitzung (zurückgesetzt bei Seiten-Reload und nach einer erkannten
// Pause, siehe useHealthyBreak.js) - kein serverseitig verlässlicher
// Langzeit-Wert, aber für eine reine "mach mal Pause"-Erinnerung ausreichend.

let activeMs = 0;
let submissionsThisSession = 0;
let accuracySum = 0;
let listeners = [];

function notify() {
  const snapshot = getStats();
  listeners.forEach((fn) => fn(snapshot));
}

export function getStats() {
  return {
    activeMs,
    submissions: submissionsThisSession,
    avgAccuracy:
      submissionsThisSession > 0 ? Math.round(accuracySum / submissionsThisSession) : null
  };
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

// Von useHealthyBreak() im Sekundentakt aufgerufen, aber NUR während der
// Tab sichtbar ist - ein Tick, während der Tab im Hintergrund war, würde
// die "durchgehend"-Bedingung aus dem Mockup verletzen.
export function addActiveMs(ms) {
  if (ms <= 0) return;
  activeMs += ms;
  notify();
}

// Wird von TestPlayer.jsx (individueller Pfad) und KlassePage.jsx
// (Klassencode-Pfad) nach einem erfolgreichen Test-Abschluss aufgerufen -
// beide bewusst getrennt, gleiches Prinzip wie überall sonst in diesem
// Codepfad (siehe computeWeakTopics/computeClassWeakTopics-Kommentare im
// Backend).
export function recordTestCompletion(accuracy) {
  submissionsThisSession += 1;
  accuracySum += typeof accuracy === 'number' && !Number.isNaN(accuracy) ? accuracy : 0;
  notify();
}

export function resetSession() {
  activeMs = 0;
  submissionsThisSession = 0;
  accuracySum = 0;
  notify();
}
