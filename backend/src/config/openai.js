// Zentrale OpenAI-Konfiguration (siehe claude/KI-Testgenerierung-Konzept-
// 2026-09-03.md Abschnitt 9) - Modellname als eine Konstante, damit ein
// künftiger Modellwechsel nur hier passieren muss statt über den Code
// verstreut zu sein.
//
// Bewusst KEIN "openai"-npm-Paket verwendet: ein einfacher fetch()-Aufruf
// gegen die REST-API (Chat Completions mit Structured Outputs) reicht für
// den einen benötigten Endpunkt, und Node 18+ hat fetch bereits eingebaut -
// ein zusätzliches SDK wäre hier unnötiges Gewicht/Risiko. Siehe
// services/questionGenerator.js für den eigentlichen Aufruf.

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// "gpt-5-mini" ist Stand 2026-09-03 (siehe Konzept-Dokument Abschnitt 8,
// Kosten-Einschätzung) die aktuelle günstige Mini-Stufe, real gegen den
// echten OpenAI-Account getestet (Structured-Output-Aufruf lief einwandfrei,
// ~1000 Tokens pro Testgenerierung). Per Umgebungsvariable überschreibbar,
// falls OpenAI das Modell-Line-up erneut ändert, ohne dafür einen Code-
// Deploy zu brauchen.
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

module.exports = { OPENAI_API_KEY, OPENAI_MODEL, OPENAI_CHAT_URL };
