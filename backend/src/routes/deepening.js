// Vertiefungsmodus (2026-09-06, siehe claude/LernApp-Preismodell-Nachhilfe-
// Klassenmodell-2026-09-02.md Abschnitt 4). Der eigentliche "KI-Nachhilfe-
// lehrer": zu einem im Test erkannten Schwachthema wird eine verständliche
// Erklärung plus 3-5 neue Übungsfragen generiert - diese Übungsfragen dienen
// zugleich als Nachtest (POST /:id/retest), statt dafür einen separaten
// dritten KI-Aufruf zu machen. Das ist eine bewusste Vereinfachung
// gegenüber dem Konzept-Dokument (dort werden "Vertiefung" und "Nachtest"
// als zwei getrennte Schritte beschrieben) - inhaltlich bleibt der Zweck
// derselbe (Erfolgskontrolle, ob die Lücke geschlossen ist), nur mit einem
// KI-Aufruf statt zwei, was die Kosten pro Vertiefung nochmal halbiert.
//
// Freischaltung (siehe computeWeakTopics in routes/processing.js):
// - Pro/Familie/Klassen-Abo (users.subscription_status === 'active'):
//   unbegrenzt.
// - Free-Nutzer:innen: ein abgeschlossener 2,49-€-Einzelkauf
//   (purchases.product_type = 'vertiefung') für GENAU DIESEN TEST
//   (purchases.submission_id). ✅ Fix (2026-09-06): vorher war der Kauf an
//   den exakten Themen-Text gebunden - dadurch wurde bei mehreren
//   Schwachthemen in einem Test fälschlich mehrfach 2,49 € fällig. Jetzt
//   schaltet ein einziger Kauf ALLE Schwachthemen des jeweiligen Tests frei
//   (behebt nebenbei auch die alte Schwäche, dass ein leicht anders
//   formulierter Themen-Text bei einem späteren Test nicht wiedererkannt
//   wurde - der Test-Bezug ist eindeutig, kein String-Vergleich mehr nötig).

const express = require('express');
const router = express.Router();
const authCheck = require('../middleware/authCheck');
const asyncHandler = require('../utils/asyncHandler');
const { generateDeepening } = require('../services/questionGenerator');
const {
  findSubmissionById,
  findUserBillingStatus,
  findPurchasesByUser,
  createDeepening,
  findLatestDeepeningByTopic,
  findDeepeningById,
  completeDeepeningRetest
} = require('../store');

function mapDeepening(row) {
  return {
    id: row.id,
    topic: row.topic,
    explanation: row.explanation,
    practiceQuestions: row.practice_questions,
    retestCorrectCount: row.retest_correct_count,
    retestTotal: row.retest_total,
    retestCompletedAt: row.retest_completed_at
  };
}

// ✅ POST /api/deepening/generate - Vertiefung zu einem Schwachthema
// erzeugen (oder eine bereits vorhandene zurückgeben, siehe Kommentar oben).
router.post('/generate', authCheck, asyncHandler(async (req, res) => {
  const { submissionId, topic } = req.body;
  const userId = req.user.id;

  if (!submissionId || !topic) {
    return res.status(400).json({ error: 'submissionId und topic sind erforderlich' });
  }

  const submission = await findSubmissionById(parseInt(submissionId, 10), userId);
  if (!submission) {
    return res.status(404).json({ error: 'Einreichung nicht gefunden' });
  }

  const gradedAnswers = submission.answers_json || [];
  const wrongQuestions = gradedAnswers.filter((a) => a.topic === topic && !a.is_correct);
  if (wrongQuestions.length === 0) {
    return res.status(400).json({ error: 'Kein Schwachthema mit diesem Namen in dieser Einreichung gefunden' });
  }

  const [billing, purchases] = await Promise.all([
    findUserBillingStatus(userId),
    findPurchasesByUser(userId)
  ]);
  const isPro = billing?.subscription_status === 'active';
  const submissionIdInt = parseInt(submissionId, 10);
  const hasPurchased = purchases.some(
    (p) => p.product_type === 'vertiefung' && p.submission_id === submissionIdInt
  );

  if (!isPro && !hasPurchased) {
    return res.status(402).json({
      error: 'Für diesen Test ist ein Kauf oder ein Pro-Abo nötig',
      requiresPurchase: true,
      topic
    });
  }

  // Idempotent: schon vorhandene Vertiefung zu diesem Thema wiederverwenden
  // statt erneut KI-Kosten zu verursachen (z.B. wenn die Ergebnisseite neu
  // geladen wird).
  const existing = await findLatestDeepeningByTopic(userId, topic);
  if (existing) {
    return res.json({ deepening: mapDeepening(existing) });
  }

  let generated;
  try {
    generated = await generateDeepening({ topic, wrongQuestions });
  } catch (err) {
    console.error('Vertiefung konnte nicht generiert werden:', err.message);
    return res.status(500).json({ error: 'Vertiefung konnte gerade nicht erstellt werden, bitte später erneut versuchen' });
  }

  const row = await createDeepening({
    userId,
    submissionId: parseInt(submissionId, 10),
    topic,
    explanation: generated.explanation,
    practiceQuestions: generated.practiceQuestions
  });

  res.json({ deepening: mapDeepening(row) });
}));

// ✅ GET /api/deepening/:id - gespeicherte Vertiefung erneut laden (z.B.
// nach einem Seiten-Reload).
router.get('/:id', authCheck, asyncHandler(async (req, res) => {
  const row = await findDeepeningById(parseInt(req.params.id, 10), req.user.id);
  if (!row) {
    return res.status(404).json({ error: 'Vertiefung nicht gefunden' });
  }
  res.json({ deepening: mapDeepening(row) });
}));

// ✅ POST /api/deepening/:id/retest - Nachtest einreichen (die
// practice_questions dienen als Erfolgskontrolle, siehe Kommentar oben).
// Serverseitige Bewertung wie beim Haupttest (Sicherheitsaudit Kritisch #4):
// der Client sendet nur rohe Antworten, nie ein selbst berechnetes Ergebnis.
router.post('/:id/retest', authCheck, asyncHandler(async (req, res) => {
  const { answers } = req.body;
  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: 'answers (Array) erforderlich' });
  }

  const row = await findDeepeningById(parseInt(req.params.id, 10), req.user.id);
  if (!row) {
    return res.status(404).json({ error: 'Vertiefung nicht gefunden' });
  }

  const questions = row.practice_questions || [];
  const answerByQuestionId = new Map(answers.map((a) => [String(a.question_id), a.answer]));

  let correctCount = 0;
  const gradedAnswers = questions.map((q) => {
    const userAnswer = answerByQuestionId.get(String(q.id)) || '';
    const isCorrect =
      !!userAnswer && userAnswer.toLowerCase().trim() === String(q.correct_answer).toLowerCase().trim();
    if (isCorrect) correctCount++;
    return { question_id: q.id, answer: userAnswer, is_correct: isCorrect, correct_answer: q.correct_answer, explanation: q.explanation || '' };
  });

  const totalQuestions = questions.length;
  const updated = await completeDeepeningRetest(row.id, { correctCount, totalQuestions });

  res.json({
    success: true,
    retest: {
      correctCount,
      totalQuestions,
      accuracy: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
      gradedAnswers,
      completedAt: updated.retest_completed_at
    }
  });
}));

module.exports = router;
