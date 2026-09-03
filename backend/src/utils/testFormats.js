// Gemeinsame Konstanten für den wählbaren Testtyp (siehe claude/KI-
// Testgenerierung-Konzept-2026-09-03.md Abschnitt 4: Format und Umfang
// sind zwei unabhängige Achsen). Vorher nur lokal in routes/content.js
// definiert - jetzt hierher ausgelagert, weil routes/teacher.js (Lehrer-
// Upload-Pfad, 2026-09-03) dieselbe Validierung braucht und beide Stellen
// sonst leicht auseinanderlaufen könnten (z.B. wenn später ein Format
// ergänzt wird und nur eine der beiden Kopien aktualisiert wird).

const VALID_TEST_FORMATS = ['multiple_choice', 'fill_gap', 'mixed', 'vocabulary'];
const VALID_TEST_SCOPES = ['standard', 'arbeitsvorbereitung'];

module.exports = { VALID_TEST_FORMATS, VALID_TEST_SCOPES };
