// computeClassWeakTopics() speist die "Schwächste Themen der Klasse"-Box im
// Lehrer-Portal (siehe LernApp-Vollaudit-2026-09-03.md, Abschnitt "Themen-
// Aggregation für die ganze Klasse"). Wichtigster Unterschied zur
// individuellen Variante (routes/processing.js computeWeakTopics): hier wird
// über ALLE Einreichungen gezählt, wie viele VERSCHIEDENE Schüler:innen ein
// Thema betrifft - nicht wie oft insgesamt, sonst sähe eine Klasse mit vielen
// Einreichungen künstlich schlechter aus als eine mit wenigen.
const teacherRouter = require('../../src/routes/teacher');
const { computeClassWeakTopics } = teacherRouter;

describe('computeClassWeakTopics', () => {
  it('zählt studentsAffected pro Thema unabhängig von der Fragenanzahl (live verifiziertes Beispiel)', () => {
    // Exakt das Szenario aus dem end-to-end-Test im Audit-Dokument: 6 Fragen
    // über 3 Themen, ein Thema absichtlich falsch beantwortet.
    const submissions = [
      {
        answers_json: [
          { topic: 'Hauptstädte', is_correct: false },
          { topic: 'Hauptstädte', is_correct: false },
          { topic: 'Flüsse', is_correct: true },
          { topic: 'Flüsse', is_correct: true },
          { topic: 'Gebirge', is_correct: true },
          { topic: 'Gebirge', is_correct: true }
        ]
      }
    ];

    const result = computeClassWeakTopics(submissions);

    expect(result).toEqual([
      { topic: 'Hauptstädte', wrongCount: 2, totalCount: 2, studentsAffected: 1 }
    ]);
  });

  it('zählt eine Schülerin/einen Schüler pro Thema nur EINMAL, auch bei mehreren Fehlern darin', () => {
    const submissions = [
      {
        answers_json: [
          { topic: 'X', is_correct: false },
          { topic: 'X', is_correct: false },
          { topic: 'X', is_correct: false }
        ]
      }
    ];
    const result = computeClassWeakTopics(submissions);
    expect(result).toEqual([{ topic: 'X', wrongCount: 3, totalCount: 3, studentsAffected: 1 }]);
  });

  it('summiert über mehrere Einreichungen (mehrere Schüler:innen) hinweg', () => {
    const submissions = [
      { answers_json: [{ topic: 'X', is_correct: false }] },
      { answers_json: [{ topic: 'X', is_correct: false }] },
      { answers_json: [{ topic: 'X', is_correct: true }] }
    ];
    const result = computeClassWeakTopics(submissions);
    expect(result).toEqual([{ topic: 'X', wrongCount: 2, totalCount: 3, studentsAffected: 2 }]);
  });

  it('lässt Themen ohne Fehler ganz weg und ignoriert fehlende answers_json', () => {
    const submissions = [
      { answers_json: [{ topic: 'Alles richtig', is_correct: true }] },
      { /* answers_json fehlt - z.B. noch nicht abgeschickt */ }
    ];
    expect(computeClassWeakTopics(submissions)).toEqual([]);
  });

  it('sortiert absteigend zuerst nach studentsAffected, dann nach wrongCount', () => {
    const submissions = [
      { answers_json: [{ topic: 'wenig Schüler, viele Fehler', is_correct: false }] },
      { answers_json: [{ topic: 'viele Schüler', is_correct: false }] },
      { answers_json: [{ topic: 'viele Schüler', is_correct: false }] }
    ];
    // "wenig Schüler, viele Fehler" hat nur 1 betroffene Person, obwohl der
    // Name es anders suggeriert - Zweck des Tests ist die Sortierreihenfolge.
    const result = computeClassWeakTopics(submissions);
    expect(result.map((t) => t.topic)).toEqual(['viele Schüler', 'wenig Schüler, viele Fehler']);
  });
});
