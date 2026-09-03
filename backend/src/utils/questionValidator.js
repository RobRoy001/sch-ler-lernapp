// Regelbasierte Validierung der von der KI generierten Fragen (siehe
// claude/KI-Testgenerierung-Konzept-2026-09-03.md Abschnitt 5, Schritt 6).
// Bewusst KEIN zweiter LLM-Call ("Quality Check") wie im alten, toten Code —
// nur einfache, deterministische Code-Prüfungen. Fragen, die durchfallen,
// werden verworfen statt angezeigt; ist die Anzahl gültiger Fragen danach zu
// gering, gilt die gesamte Generierung als fehlgeschlagen.
//
// Format-abhängig, weil seit der Testtyp-Auswahl (Konzept-Dokument
// Abschnitt 4) nicht mehr nur Multiple-Choice/Lückentext geprüft werden muss,
// sondern auch das abweichende Vokabeltest-Zielschema (Begriff/Übersetzung-
// Paare statt Frage/Optionen/Antwort).

const MIN_VALID_QUESTIONS = 3;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateMultipleChoice(q) {
  if (!isNonEmptyString(q.question_text)) return 'question_text fehlt oder leer';
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    return 'multiple_choice braucht genau 4 options';
  }
  if (q.options.some((o) => !isNonEmptyString(o))) return 'eine option ist leer';
  if (!isNonEmptyString(q.correct_answer)) return 'correct_answer fehlt';
  if (!q.options.includes(q.correct_answer)) {
    return 'correct_answer ist nicht Teil von options';
  }
  return null;
}

function validateFillGap(q) {
  if (!isNonEmptyString(q.question_text)) return 'question_text fehlt oder leer';
  // Erwartet eine Lücke im Text, z.B. "Die Hauptstadt von ___ ist Berlin."
  if (!/_{3,}/.test(q.question_text)) {
    return 'question_text enthält keine erkennbare Lücke (___)';
  }
  if (!isNonEmptyString(q.correct_answer)) return 'correct_answer fehlt';
  return null;
}

// Vokabeltest hat ein eigenes Zielschema (siehe Konzept-Dokument Abschnitt 4)
// statt question_text/options/correct_answer: ein Begriff-Übersetzungs-Paar.
function validateVocabulary(q) {
  if (!isNonEmptyString(q.term)) return 'term (Begriff) fehlt oder leer';
  if (!isNonEmptyString(q.translation)) return 'translation (Übersetzung) fehlt oder leer';
  return null;
}

const VALIDATORS_BY_TYPE = {
  multiple_choice: validateMultipleChoice,
  fill_gap: validateFillGap,
  vocabulary: validateVocabulary
};

// Prüft eine einzelne Frage. Gibt null zurück (= gültig) oder einen kurzen
// Fehlertext (= Grund für die Ablehnung, landet im Audit-/Debug-Log).
function validateQuestion(question) {
  if (!question || typeof question !== 'object') return 'Frage ist kein Objekt';
  const validator = VALIDATORS_BY_TYPE[question.type];
  if (!validator) return `unbekannter Fragetyp: ${question.type}`;
  return validator(question);
}

// Prüft ein komplettes generiertes Test-Ergebnis (Array von Fragen).
// Gibt { valid, rejected, ok } zurück - "ok" ist false, wenn nach dem
// Aussortieren zu wenige gültige Fragen übrig bleiben (siehe
// MIN_VALID_QUESTIONS oben), dann gilt die gesamte Generierung als
// fehlgeschlagen (Pipeline-Schritt 6).
function validateGeneratedQuestions(questions) {
  const valid = [];
  const rejected = [];

  for (const question of Array.isArray(questions) ? questions : []) {
    const reason = validateQuestion(question);
    if (reason) {
      rejected.push({ question, reason });
    } else {
      valid.push(question);
    }
  }

  return {
    valid,
    rejected,
    ok: valid.length >= MIN_VALID_QUESTIONS
  };
}

module.exports = {
  MIN_VALID_QUESTIONS,
  validateQuestion,
  validateGeneratedQuestions
};
