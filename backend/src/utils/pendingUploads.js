// Rein In-Memory, prozess-lokal (kein Redis o.ä. nötig für Phase 1 - siehe
// claude/KI-Testgenerierung-Konzept-2026-09-03.md Abschnitt 5, Schritt 8:
// die Originaldatei wird ohnehin nie dauerhaft gespeichert, nur der daraus
// extrahierte Text lebt weiter). Zwei getrennte "Stores", die sich die
// Datei zwischen den bestehenden Request-Schritten weiterreichen, OHNE die
// bestehende Zwei-Schritt-API (POST /upload -> POST /sources -> POST
// /processing/.../process) zu verändern:
//
// - uploads:     fileId   -> Datei-Buffer, zwischen POST /content/upload
//                              und POST /content/sources
// - sourceFiles: sourceId -> Datei-Buffer + gewählter Testtyp, zwischen
//                              POST /content/sources und POST
//                              /processing/sources/:id/process
//
// Vorher (Sicherheitsaudit-Nachtrag, siehe KI-Testgenerierung-Konzept
// Abschnitt 1): die Datei-Bytes aus multer.memoryStorage() wurden nach dem
// Upload-Request nie wieder angefasst - jede Verarbeitung war deshalb
// technisch unmöglich, unabhängig vom Mock/Echt-Modus. Dieses Modul behebt
// genau das, ohne gleich einen externen Objektspeicher einzurichten.
//
// Beide Stores haben eine TTL-Aufräumung, falls ein Schritt nie
// abgeschlossen wird (z.B. Nutzer lädt eine Datei hoch, bricht dann aber
// vor "Senden" ab) - sonst würden verwaiste Buffer den Prozessspeicher
// langsam volllaufen lassen.

const TTL_MS = 15 * 60 * 1000; // 15 Minuten

function makeStore() {
  const map = new Map();

  function set(key, value) {
    map.set(key, { value, storedAt: Date.now() });
  }

  // Liest UND entfernt den Eintrag (einmal verwendbar) - passend zum
  // "einmal durch die Pipeline"-Charakter jeder Datei hier.
  function take(key) {
    const entry = map.get(key);
    if (!entry) return null;
    map.delete(key);
    return entry.value;
  }

  function cleanup() {
    const now = Date.now();
    for (const [key, entry] of map.entries()) {
      if (now - entry.storedAt > TTL_MS) {
        map.delete(key);
      }
    }
  }

  return { set, take, cleanup, size: () => map.size };
}

const uploads = makeStore();
const sourceFiles = makeStore();

// .unref(), damit dieser Timer einen sauberen Prozess-Shutdown nicht
// blockiert (z.B. bei Tests oder einem Neustart).
const cleanupTimer = setInterval(() => {
  uploads.cleanup();
  sourceFiles.cleanup();
}, 5 * 60 * 1000);
cleanupTimer.unref();

module.exports = { uploads, sourceFiles };
