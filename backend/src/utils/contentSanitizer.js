// Sanitizer für Text, der an OpenAI geht (siehe claude/OpenAI-Datenschutz-
// Risiken.md, Lösung 1, und claude/KI-Testgenerierung-Konzept-2026-09-03.md
// Abschnitt 2/7). Läuft NACH der Text-Extraktion (textExtraction.js) und
// VOR jedem Aufruf an questionGenerator.js — nur der bereinigte Text darf
// das Backend in Richtung OpenAI verlassen.
//
// Bewusster Trade-off: die Muster hier sind absichtlich eher zu aggressiv
// als zu vorsichtig (siehe Kommentare pro Regel). Ein paar Fehltreffer bei
// harmlosen Wörtern (z.B. Eigennamen im Lernstoff wie "Karl Marx" in einer
// Geschichts-Klassenarbeit) sind ein akzeptabler Kollateralschaden, ein
// durchgerutschter Schülername ist es nicht. Vor dem echten Livegang sollte
// das an echten, anonymisierten Beispiel-Klassenarbeiten gegengeprüft werden
// (siehe Konzept-Dokument Abschnitt 7, Punkt "keine Rechtsberatung").

// Zwei Großbuchstaben-Wörter hintereinander ("Vorname Nachname"). Trifft
// bewusst auch echte Eigennamen im Lernstoff (z.B. "Karl Marx", "Berlin
// Mitte") — siehe Trade-off oben. Ein Wort MUSS mit Kleinbuchstaben weiter-
// gehen, damit reine Abkürzungsketten (z.B. "USA UdSSR") nicht getroffen
// werden, die im Unterrichtsstoff selbst wichtig sein können.
const NAME_PATTERN = /\b[A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+\b/g;

const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;

// Straße/Platz/Weg + Hausnummer, sowie 5-stellige deutsche Postleitzahlen
// (mit vorangestelltem Ortsnamen, damit z.B. reine Jahreszahlen wie 2026
// nicht als PLZ zählen).
const ADDRESS_PATTERN =
  /\b\p{L}+(?:straße|strasse|weg|platz|allee)\s+\d+[a-zA-Z]?\b|\b\d{5}\s+\p{L}+\b/gu;

// Noten (1-6, auch mit Tendenz "1-" / "2+") und Punkte-Angaben.
const GRADE_PATTERN =
  /\bNote:?\s*[1-6][+-]?|\b[1-6][+-]?\s*Note\b|\bPunkte:?\s*\d+(?:\s*\/\s*\d+)?\b/gi;

// Schüler-/Matrikel-/ID-Nummern.
const ID_PATTERN = /\b(?:Matrikel-?Nr\.?|Schüler-?Nr\.?|ID)[:\s]*\d+\b/gi;

// Telefonnummern (grob: mind. 6 zusammenhängende Ziffern, ggf. mit
// Trennzeichen) — deutsche Festnetz-/Mobilformate sind zu uneinheitlich für
// ein präziseres Muster, lieber hier ebenfalls eher zu aggressiv filtern.
const PHONE_PATTERN = /\b(?:\+49|0)[\d\s/-]{6,}\d\b/g;

function sanitizeForOpenAI(rawText) {
  if (typeof rawText !== 'string') return '';

  let text = rawText;
  text = text.replace(EMAIL_PATTERN, '[EMAIL]');
  text = text.replace(ADDRESS_PATTERN, '[ADRESSE]');
  text = text.replace(PHONE_PATTERN, '[TELEFON]');
  text = text.replace(ID_PATTERN, '[ID]');
  text = text.replace(GRADE_PATTERN, '[NOTE]');
  // Namen zuletzt, damit z.B. "Matrikel-Nr. 12" nicht vorher schon von der
  // Namens-Regel verändert wurde (Regel-Reihenfolge ist hier relevant).
  text = text.replace(NAME_PATTERN, '[NAME]');

  return text;
}

// Für das Audit-Log (siehe Konzept-Dokument Abschnitt 7 / Lösung 4 im
// Datenschutz-Dokument): true, wenn der Sanitizer tatsächlich etwas entfernt
// hat. Kein Beweis für "alle personenbezogenen Daten sind draußen", aber ein
// nützliches Signal für die Audit-Logs (z.B. "0 Treffer" bei einer Datei,
// die eindeutig eine Namensliste enthält, wäre ein Warnsignal für einen
// Regel-Bug).
function wasSanitized(rawText, sanitizedText) {
  return rawText !== sanitizedText;
}

module.exports = { sanitizeForOpenAI, wasSanitized };
