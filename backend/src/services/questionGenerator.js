// Fragen-Generierung per OpenAI (siehe claude/KI-Testgenerierung-Konzept-
// 2026-09-03.md Abschnitt 5 Schritt 5, und Abschnitt 4 für die Testtyp-
// Auswahl). Ersetzt das tote/kaputte alte services/openaiService.js.
//
// Nutzt "Structured Outputs" (response_format: json_schema, strict: true)
// statt der fragilen Regex-Extraktion aus dem alten Code
// (responseText.match(/\[[\s\S]*\]/)) - liefert garantiert valides JSON in
// der vorgegebenen Struktur. Real gegen den echten OpenAI-Account getestet
// (2026-09-03, Modell "gpt-5-mini"): sowohl reine Multiple-Choice-Schemas
// als auch gemischte Multiple-Choice/Lückentext-Schemas mit nullable
// "options"-Feld funktionieren zuverlässig im strict-Modus.
//
// WICHTIG (siehe Konzept-Dokument Abschnitt 3, nachträgliche Korrektur):
// Dieser Aufruf wird NIE gecacht/wiederverwendet - jeder Aufruf erzeugt
// bewusst neue Fragen, auch bei identischem Text, damit z.B. ein späterer
// Vertiefungsmodus-Nachtest nicht dieselben Fragen liefert wie der
// Originaltest.

const { OPENAI_API_KEY, OPENAI_MODEL, OPENAI_CHAT_URL } = require('../config/openai');
const { validateGeneratedQuestions } = require('../utils/questionValidator');

// Testumfang (Abschnitt 4 des Konzepts: "Umfang" ist eine eigene Achse,
// unabhängig vom Frageformat) - grobe Zielgrößen, das Modell hält sich
// erfahrungsgemäß nicht immer exakt daran, deshalb "Ziel", keine harte
// Grenze.
const SCOPE_QUESTION_COUNT = {
  standard: 6,
  arbeitsvorbereitung: 16
};

const MC_FILLGAP_TYPES = ['multiple_choice', 'fill_gap'];

function buildSchema(format) {
  if (format === 'vocabulary') {
    return {
      type: 'object',
      properties: {
        title: { type: 'string' },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              term: { type: 'string' },
              translation: { type: 'string' },
              explanation: { type: 'string' }
            },
            required: ['term', 'translation', 'explanation'],
            additionalProperties: false
          }
        }
      },
      required: ['title', 'questions'],
      additionalProperties: false
    };
  }

  // multiple_choice / fill_gap / mixed teilen sich dasselbe Ziel-Schema -
  // "options" ist bei fill_gap null (siehe questionValidator.js, das
  // dasselbe Feld genauso interpretiert).
  const allowedTypes = format === 'mixed' ? MC_FILLGAP_TYPES : [format];
  return {
    type: 'object',
    properties: {
      title: { type: 'string' },
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: allowedTypes },
            question_text: { type: 'string' },
            options: { type: ['array', 'null'], items: { type: 'string' } },
            correct_answer: { type: 'string' },
            explanation: { type: 'string' }
          },
          required: ['type', 'question_text', 'options', 'correct_answer', 'explanation'],
          additionalProperties: false
        }
      }
    },
    required: ['title', 'questions'],
    additionalProperties: false
  };
}

function buildSystemPrompt({ format, scope, questionCount, avoidQuestions }) {
  const formatInstructions = {
    multiple_choice:
      'Erstelle ausschließlich Multiple-Choice-Fragen: genau 4 Antwortoptionen im Feld "options", "correct_answer" muss exakt einer der 4 Optionen entsprechen.',
    fill_gap:
      'Erstelle ausschließlich Lückentext-Fragen: "question_text" enthält eine Lücke als "______" (mindestens 3 Unterstriche), "options" ist immer null, "correct_answer" ist das fehlende Wort bzw. die fehlende Wortgruppe.',
    mixed:
      'Mische Multiple-Choice- und Lückentext-Fragen ab (etwa zur Hälfte). Bei "type": "multiple_choice" genau 4 Optionen in "options". Bei "type": "fill_gap" ist "options" null und "question_text" enthält eine Lücke als "______".',
    vocabulary:
      'Erstelle Vokabel-Paare aus dem Text: "term" ist der Begriff, "translation" die Übersetzung bzw. Definition. Wenn der Text keine erkennbaren Vokabelpaare enthält (z.B. keine zweisprachige Wortliste), gib möglichst wenige, aber inhaltlich sinnvolle Paare aus den wichtigsten Fachbegriffen des Textes zurück statt erfundener Übersetzungen.'
  };

  const scopeInstruction =
    scope === 'arbeitsvorbereitung'
      ? `Erstelle eine umfangreiche Arbeitsvorbereitung mit ${questionCount} Fragen/Paaren, die möglichst alle im Text vorkommenden Themen abdeckt, damit sie eine echte bevorstehende Klassenarbeit realistisch simuliert.`
      : `Erstelle ${questionCount} Fragen/Paare zu den wichtigsten Inhalten des Textes.`;

  const avoidInstruction =
    Array.isArray(avoidQuestions) && avoidQuestions.length > 0
      ? `Vermeide inhaltlich folgende, bereits gestellte Fragen (stelle andere Fragen zum gleichen Thema, keine Wiederholungen): ${avoidQuestions.join(' | ')}`
      : '';

  return [
    'Du erstellst Testfragen für Schüler:innen auf Deutsch, ausschließlich basierend auf dem folgenden Text.',
    'Erfinde keine Inhalte, die nicht im Text stehen oder direkt daraus ableitbar sind.',
    formatInstructions[format] || formatInstructions.multiple_choice,
    scopeInstruction,
    avoidInstruction
  ]
    .filter(Boolean)
    .join('\n');
}

// Normalisiert eine einzelne von OpenAI zurückgegebene Frage in das
// bestehende sources.test.questions[]-Schema (siehe store.js/TestPlayer.jsx)
// - dadurch bleiben Frontend und DB-Schema unverändert, nur WIE der Inhalt
// entsteht ändert sich (siehe Konzept-Dokument Abschnitt 5, Schritt 5).
function normalizeQuestion(raw, format, index) {
  if (format === 'vocabulary') {
    return {
      id: index + 1,
      type: 'vocabulary',
      term: raw.term,
      translation: raw.translation,
      explanation: raw.explanation || ''
    };
  }
  return {
    id: index + 1,
    type: raw.type,
    question_text: raw.question_text,
    options: Array.isArray(raw.options) ? raw.options : null,
    correct_answer: raw.correct_answer,
    explanation: raw.explanation || ''
  };
}

// format: 'multiple_choice' | 'fill_gap' | 'mixed' | 'vocabulary'
// scope:  'standard' | 'arbeitsvorbereitung'
// avoidQuestions: optionaler Parameter für spätere Wiederverwendung im
// Vertiefungsmodus-Nachtest (siehe Konzept-Dokument Abschnitt 3) - wird in
// Phase 1 nirgends befüllt, Signatur steht aber schon bereit.
async function generateQuestions({ text, format = 'multiple_choice', scope = 'standard', avoidQuestions = [] }) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY ist nicht konfiguriert');
  }
  if (!text || text.trim().length === 0) {
    throw new Error('Kein Text zum Generieren übergeben');
  }

  const questionCount = SCOPE_QUESTION_COUNT[scope] || SCOPE_QUESTION_COUNT.standard;
  const schema = buildSchema(format);
  const systemPrompt = buildSystemPrompt({ format, scope, questionCount, avoidQuestions });

  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'generated_test', schema, strict: true }
      }
    })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`OpenAI-Aufruf fehlgeschlagen (${response.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI-Antwort enthält keinen Inhalt');
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error('OpenAI-Antwort ist kein valides JSON');
  }

  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
  const normalized = rawQuestions.map((q, idx) => normalizeQuestion(q, format, idx));

  const { valid, rejected, ok } = validateGeneratedQuestions(normalized);
  if (!ok) {
    const reasons = rejected.map((r) => r.reason).join('; ') || 'keine Fragen erhalten';
    throw new Error(
      `Zu wenige gültige Fragen nach der Validierung (${valid.length}/${normalized.length}). Gründe: ${reasons}`
    );
  }

  return {
    title: parsed.title || 'Generierter Test',
    total_questions: valid.length,
    difficulty: 'mittel',
    type: format,
    scope,
    questions: valid.map((q, idx) => ({ ...q, id: idx + 1 }))
  };
}

module.exports = { generateQuestions, SCOPE_QUESTION_COUNT };
