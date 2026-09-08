const {
  MIN_VALID_QUESTIONS,
  validateQuestion,
  validateGeneratedQuestions
} = require('../../src/utils/questionValidator');

// Die letzte Verteidigungslinie gegen kaputte KI-Ausgaben, bevor eine Frage
// einem Kind angezeigt wird (siehe KI-Testgenerierung-Konzept Abschnitt 5,
// Schritt 6). Ein Fehler hier bedeutet entweder: kaputte Fragen erreichen
// den Nutzer, oder korrekte Fragen werden fälschlich verworfen.

describe('validateQuestion - multiple_choice', () => {
  const base = {
    type: 'multiple_choice',
    question_text: 'Was ist 2+2?',
    options: ['3', '4', '5', '6'],
    correct_answer: '4'
  };

  it('akzeptiert eine korrekt geformte Frage', () => {
    expect(validateQuestion(base)).toBeNull();
  });

  it('lehnt ab, wenn question_text fehlt', () => {
    expect(validateQuestion({ ...base, question_text: '' })).toMatch(/question_text/);
  });

  it('lehnt ab, wenn nicht genau 4 Optionen vorhanden sind', () => {
    expect(validateQuestion({ ...base, options: ['3', '4', '5'] })).toMatch(/4 options/);
  });

  it('lehnt ab, wenn eine Option leer ist', () => {
    expect(validateQuestion({ ...base, options: ['3', '', '5', '6'] })).toMatch(/option ist leer/);
  });

  it('lehnt ab, wenn correct_answer nicht unter den options ist', () => {
    expect(validateQuestion({ ...base, correct_answer: '7' })).toMatch(/nicht Teil von options/);
  });
});

describe('validateQuestion - fill_gap', () => {
  it('akzeptiert einen Text mit erkennbarer Lücke (___)', () => {
    const q = { type: 'fill_gap', question_text: 'Die Hauptstadt von ___ ist Berlin.', correct_answer: 'Deutschland' };
    expect(validateQuestion(q)).toBeNull();
  });

  it('lehnt ab, wenn keine Lücke im Text erkennbar ist', () => {
    const q = { type: 'fill_gap', question_text: 'Kein Lückentext hier.', correct_answer: 'x' };
    expect(validateQuestion(q)).toMatch(/keine erkennbare Lücke/);
  });
});

describe('validateQuestion - vocabulary', () => {
  it('akzeptiert ein Begriff/Übersetzung-Paar', () => {
    expect(validateQuestion({ type: 'vocabulary', term: 'Haus', translation: 'house' })).toBeNull();
  });

  it('lehnt ab, wenn translation fehlt', () => {
    expect(validateQuestion({ type: 'vocabulary', term: 'Haus' })).toMatch(/translation/);
  });
});

describe('validateQuestion - unbekannter Typ / kaputte Eingabe', () => {
  it('lehnt einen unbekannten Fragetyp ab', () => {
    expect(validateQuestion({ type: 'essay' })).toMatch(/unbekannter Fragetyp/);
  });

  it('lehnt null/undefined/kein Objekt ab, ohne zu crashen', () => {
    expect(validateQuestion(null)).toMatch(/kein Objekt/);
    expect(validateQuestion(undefined)).toMatch(/kein Objekt/);
    expect(validateQuestion('text')).toMatch(/kein Objekt/);
  });
});

describe('validateGeneratedQuestions', () => {
  const good1 = { type: 'multiple_choice', question_text: 'Q1', options: ['a', 'b', 'c', 'd'], correct_answer: 'a' };
  const good2 = { type: 'vocabulary', term: 'Katze', translation: 'cat' };
  const good3 = { type: 'fill_gap', question_text: 'Text mit ___ Lücke.', correct_answer: 'einer' };
  const bad = { type: 'multiple_choice', question_text: 'Q2', options: ['a', 'b'], correct_answer: 'a' };

  it('trennt gültige von ungültigen Fragen', () => {
    const result = validateGeneratedQuestions([good1, bad, good2, good3]);
    expect(result.valid).toEqual([good1, good2, good3]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].question).toEqual(bad);
  });

  it('ist "ok", wenn mindestens MIN_VALID_QUESTIONS gültige Fragen übrig bleiben', () => {
    expect(MIN_VALID_QUESTIONS).toBe(3);
    const result = validateGeneratedQuestions([good1, good2, good3]);
    expect(result.ok).toBe(true);
  });

  it('ist NICHT "ok", wenn zu wenige gültige Fragen übrig bleiben', () => {
    const result = validateGeneratedQuestions([good1, good2, bad]);
    expect(result.valid).toHaveLength(2);
    expect(result.ok).toBe(false);
  });

  it('behandelt eine leere oder nicht-Array-Eingabe wie null Fragen, ohne zu crashen', () => {
    expect(validateGeneratedQuestions([])).toEqual({ valid: [], rejected: [], ok: false });
    expect(validateGeneratedQuestions(undefined)).toEqual({ valid: [], rejected: [], ok: false });
  });
});
