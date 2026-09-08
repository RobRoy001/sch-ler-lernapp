// computeWeakTopics() entscheidet direkt darüber, welche Schwachthemen ein
// Kind nach einem Test sieht UND ob der Vertiefungsmodus dafür schon
// freigeschaltet ist (siehe Kommentar in routes/processing.js - "einmal pro
// Test" statt "pro Thema" bezahlen, Fix vom 2026-09-06). Als Property am
// Router-Export angehängt (siehe Kommentar direkt vor `module.exports =
// router` in processing.js), damit dieser Test ohne echten Server/DB läuft.
const processingRouter = require('../../src/routes/processing');
const { computeWeakTopics } = processingRouter;

describe('computeWeakTopics', () => {
  it('gruppiert falsch beantwortete Fragen nach Thema und zählt richtig/falsch', () => {
    const answers = [
      { topic: 'Bruchrechnung', is_correct: true },
      { topic: 'Bruchrechnung', is_correct: false },
      { topic: 'Gleichungen', is_correct: false },
      { topic: 'Gleichungen', is_correct: false }
    ];

    const result = computeWeakTopics(answers, { isPro: false, isUnlockedForSubmission: false });

    expect(result).toEqual([
      { topic: 'Gleichungen', wrongCount: 2, totalCount: 2, unlocked: false },
      { topic: 'Bruchrechnung', wrongCount: 1, totalCount: 2, unlocked: false }
    ]);
  });

  it('ignoriert Fragen ohne topic-Tag (z.B. Vokabelfragen)', () => {
    const answers = [
      { topic: null, is_correct: false },
      { topic: 'Englisch', is_correct: false }
    ];

    const result = computeWeakTopics(answers, { isPro: false, isUnlockedForSubmission: false });

    expect(result).toEqual([{ topic: 'Englisch', wrongCount: 1, totalCount: 1, unlocked: false }]);
  });

  it('lässt Themen ohne einen einzigen Fehler ganz weg (nichts zu vertiefen)', () => {
    const answers = [{ topic: 'Alles richtig', is_correct: true }];
    expect(computeWeakTopics(answers, { isPro: false, isUnlockedForSubmission: false })).toEqual([]);
  });

  it('markiert alle Themen als unlocked, wenn der Nutzer Pro-Abo hat', () => {
    const answers = [{ topic: 'X', is_correct: false }];
    const result = computeWeakTopics(answers, { isPro: true, isUnlockedForSubmission: false });
    expect(result[0].unlocked).toBe(true);
  });

  it('markiert alle Themen als unlocked, wenn GENAU DIESER Test einzeln gekauft wurde', () => {
    // Regressionstest für den Fix vom 2026-09-06: vorher wurde pro Thema
    // einzeln abgerechnet ("für jeden Fehler 2,49 €") - jetzt schaltet ein
    // Kauf für den Test ALLE seine Schwachthemen auf einmal frei.
    const answers = [
      { topic: 'Thema A', is_correct: false },
      { topic: 'Thema B', is_correct: false }
    ];
    const result = computeWeakTopics(answers, { isPro: false, isUnlockedForSubmission: true });
    expect(result.every((t) => t.unlocked)).toBe(true);
  });

  it('sortiert absteigend nach Anzahl falscher Antworten', () => {
    const answers = [
      { topic: 'wenig falsch', is_correct: false },
      { topic: 'viel falsch', is_correct: false },
      { topic: 'viel falsch', is_correct: false },
      { topic: 'viel falsch', is_correct: false }
    ];
    const result = computeWeakTopics(answers, { isPro: false, isUnlockedForSubmission: false });
    expect(result.map((t) => t.topic)).toEqual(['viel falsch', 'wenig falsch']);
  });
});
