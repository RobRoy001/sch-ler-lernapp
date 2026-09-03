// Sanitizer für Text, der an OpenAI geht (siehe claude/OpenAI-Datenschutz-
// Risiken.md, Lösung 1, und claude/KI-Testgenerierung-Konzept-2026-09-03.md
// Abschnitt 2/7). Läuft NACH der Text-Extraktion (textExtraction.js) und
// VOR jedem Aufruf an questionGenerator.js — nur der bereinigte Text darf
// das Backend in Richtung OpenAI verlassen.
//
// ✅ Audit 2026-09-03, Sanitizer-Überarbeitung: die ursprüngliche Namens-
// Regel ("zwei großgeschriebene Wörter hintereinander") war bewusst zu
// aggressiv gedacht — traf beim Live-Test mit echtem Geschichtstext aber
// nicht nur Namen, sondern reihenweise ganz normale deutsche Nomen-/
// Adjektiv-Phrasen ("Französische Revolution", "Zweiten Weltkrieg" usw.),
// weil im Deutschen Substantive grundsätzlich großgeschrieben werden — das
// Muster war strukturell nicht in der Lage, zwischen einem Namen und
// normalem Lernstoff zu unterscheiden. Statt einer Lernstoff-weiten Regel
// zielt die Namens-Erkennung jetzt gezielt auf die Stellen, an denen ein
// Schülername in einer hochgeladenen Klassenarbeit tatsächlich auftaucht:
// das Kopf-/Namensfeld des Arbeitsblatts ("Name: ...", "Klasse: ...") und
// typische Selbstnennungs-Formulierungen ("Ich heiße ...", "Von: ..."). Der
// Fließtext der eigentlichen Aufgabe wird dadurch nicht mehr angetastet.
// Bewusster Rest-Trade-off: ein Name, der frei im Fließtext auftaucht, ohne
// so ein Signalwort davor (z.B. in einem Aufsatz "Mein Bruder Peter kam..."),
// wird nicht mehr erkannt. Das ist ein Kompromiss, kein perfekter Schutz —
// vor dem echten Livegang sollte trotzdem an echten, anonymisierten
// Beispiel-Klassenarbeiten gegengeprüft werden (siehe Konzept-Dokument
// Abschnitt 7, Punkt "keine Rechtsberatung").

// Label-Felder, wie sie auf praktisch jedem Arbeitsblatt-Kopf stehen. Der
// Doppelpunkt/Bindestrich ist Pflicht (kein reines Leerzeichen), damit z.B.
// "Klasse 7b" (Zahl folgt, kein Name) oder zufälliger Fließtext mit dem
// Wort "Klasse" nicht mit-getroffen wird.
const NAME_LABEL_PATTERN =
  /\b(Name|Vorname|Nachname|Sch(?:ü|ue)ler(?:in)?|Klasse|Lehrer(?:in)?)\s*[:\-]\s*([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)/g;

// Typische Selbstnennungs-/Signatur-Formulierungen.
const NAME_SELF_INTRO_PATTERN =
  /\b(Ich hei(?:ß|ss)e|Mein Name ist|Von)\s*:?\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)/g;

// Häufiges Kopfzeilen-Format "Klasse: 7b - Max Mustermann" (Name nach
// Bindestrich am Zeilenende) — deckt den Fall ab, in dem NAME_LABEL_PATTERN
// oben nicht direkt greift, weil zwischen Label und Name noch ein Klassen-
// code steht. Bewusst ans Zeilenende gebunden ($, mit /m), damit normale
// Sätze, die zufällig mit "- Wort Wort" mitten im Fließtext weitergehen,
// nicht getroffen werden.
const NAME_TRAILING_PATTERN =
  /[-–—]\s*([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+)\s*$/gm;

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
  text = text.replace(NAME_LABEL_PATTERN, (_match, label) => `${label}: [NAME]`);
  text = text.replace(NAME_SELF_INTRO_PATTERN, (_match, intro) => `${intro} [NAME]`);
  text = text.replace(NAME_TRAILING_PATTERN, '- [NAME]');

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
