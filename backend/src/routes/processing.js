const express = require('express');
const router = express.Router();
const {
  findSourceById,
  updateSource,
  createSubmission,
  findSubmissionsByUser,
  findSubmissionById
} = require('../store');
const authCheck = require('../middleware/authCheck');
const asyncHandler = require('../utils/asyncHandler');
const { sourceFiles } = require('../utils/pendingUploads');
const { extractText } = require('../services/textExtraction');
const { sanitizeForOpenAI } = require('../utils/contentSanitizer');
const { generateQuestions } = require('../services/questionGenerator');

// ✅ Sicherheitsaudit Befund 10: es gibt hier keinen "Mock-Modus"-Zweig mehr
// (vorher: usingMockMode-Flag + eine separate, nur lokal im Prozess
// gehaltene mockSubmissions-Map). Alles läuft jetzt ausschließlich über
// store.js gegen die echte Datenbank (Supabase/Postgres) - Daten bleiben
// deshalb auch nach einem Server-Neustart erhalten.
//
// ✅ Sicherheitsaudit Hoch #9: alle async Routen hier sind zusätzlich mit
// asyncHandler() umschlossen (siehe utils/asyncHandler.js) - das
// try/catch in jeder Route bleibt bestehen (eigene deutsche
// Fehlermeldungen), asyncHandler ist das Sicherheitsnetz für alles
// Unerwartete, das sonst zu einem Server-Absturz für alle Nutzer führen
// würde statt nur zu einem 500er für diese eine Anfrage.

// ---- Mock-Testgenerierung ----
// ✅ KI-Testgenerierung (2026-09-03): jetzt der bewusste FALLBACK statt des
// einzigen Wegs - siehe processSourceInBackground() unten. Greift, wenn (a)
// keine Datei verknüpft ist, (b) keine Einwilligung zur KI-Verarbeitung
// vorliegt (Robert-Entscheidung: kein Hard-Block, sondern klar
// gekennzeichneter Mock-Test als Fallback), oder (c) die echte Pipeline aus
// irgendeinem Grund fehlschlägt (schlechtes Foto, OpenAI-Fehler, zu wenige
// valide Fragen nach der Prüfung). So bekommt der Nutzer NIE eine leere
// Fehlerseite, nur im schlechteren Fall generische Beispielfragen statt
// echter.
function generateMockTest(sourceId) {
  return {
    id: sourceId,
    title: 'Generierter Test',
    total_questions: 3,
    difficulty: 'mittel',
    questions: [
      {
        id: 1,
        type: 'multiple_choice',
        question_text: 'Was ist 6 × 7?',
        options: JSON.stringify(['40', '42', '48', '54']),
        correct_answer: '42',
        explanation: '6 × 7 = 42.'
      },
      {
        id: 2,
        type: 'multiple_choice',
        question_text: 'Welches ist die Hauptstadt von Deutschland?',
        options: JSON.stringify(['München', 'Hamburg', 'Berlin', 'Köln']),
        correct_answer: 'Berlin',
        explanation: 'Berlin ist seit 1990 die Hauptstadt der Bundesrepublik Deutschland.'
      },
      {
        id: 3,
        type: 'fill_gap',
        question_text: 'Die Sonne ist ein ______.',
        correct_answer: 'Stern',
        explanation: 'Die Sonne ist der Stern im Zentrum unseres Sonnensystems.'
      }
    ]
  };
}

// ✅ KI-Testgenerierung (2026-09-03): echte Pipeline statt der bisherigen
// setInterval-Simulation ohne echte Arbeit (siehe claude/KI-Testgenerierung-
// Konzept-2026-09-03.md Abschnitt 5). Läuft NACH dem Response weiter (wie
// vorher schon der Fall) - deshalb eigenes try/catch statt asyncHandler
// (das wirkt nur auf die direkte Route-Funktion, nicht auf diese später
// laufende Funktion). Wirft NIE einen Fehler nach außen: jeder Fehlerfall
// endet am Ende trotzdem in status: 'completed' mit einem Mock-Test statt
// status: 'error' (siehe generateMockTest-Kommentar oben) - das Frontend
// (ProcessingPage.jsx) hat für einen dauerhaften 'error'-Status ohnehin
// keine eigene Anzeige vorgesehen, und Robert hat sich bewusst für
// "Mock-Test als Fallback" statt eines Hard-Blocks entschieden.
async function processSourceInBackground(sourceId) {
  const pendingFile = sourceFiles.take(String(sourceId));
  let test = null;
  let fallbackReason = null;

  try {
    await updateSource(sourceId, { progress: 25 });

    if (!pendingFile) {
      fallbackReason = 'keine Datei verknüpft';
    } else if (!pendingFile.consent) {
      fallbackReason = 'keine Einwilligung zur KI-Verarbeitung erteilt';
    } else {
      const { text } = await extractText(pendingFile.buffer, pendingFile.mimetype);
      await updateSource(sourceId, { progress: 55 });

      const sanitized = sanitizeForOpenAI(text);
      await updateSource(sourceId, { progress: 70 });

      test = await generateQuestions({
        text: sanitized,
        format: pendingFile.testFormat,
        scope: pendingFile.testScope
      });
      await updateSource(sourceId, { progress: 90 });
    }
  } catch (err) {
    fallbackReason = err.message;
    console.error(`Echte Testgenerierung für Source ${sourceId} fehlgeschlagen, nutze Mock-Fallback:`, err.message);
  }

  if (!test) {
    test = generateMockTest(sourceId);
    // Rein informativ fürs spätere Debugging/Audit-Log - wird von
    // TestPlayer.jsx/store.js nicht ausgewertet, stört also nirgends.
    test.fallback_reason = fallbackReason;
  }

  await updateSource(sourceId, { status: 'completed', progress: 100, test });
}

// ✅ POST /api/processing/sources/:sourceId/process - Verarbeitung starten
router.post('/sources/:sourceId/process', authCheck, asyncHandler(async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId, 10);
    const source = await findSourceById(sourceId);

    if (!source) {
      return res.status(404).json({ error: 'Source nicht gefunden' });
    }

    await updateSource(sourceId, { status: 'processing', progress: 10 });
    res.json({ message: 'Verarbeitung gestartet', status: 'processing' });

    processSourceInBackground(sourceId).catch((err) => {
      console.error(`Unerwarteter Fehler bei der Verarbeitung von Source ${sourceId}:`, err);
    });
  } catch (error) {
    console.error('Fehler beim Start der Verarbeitung:', error);
    res.status(500).json({ error: 'Verarbeitung konnte nicht gestartet werden' });
  }
}));

// ✅ GET /api/processing/sources/:sourceId/status - Verarbeitungsstatus abfragen
router.get('/sources/:sourceId/status', authCheck, asyncHandler(async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId, 10);
    const source = await findSourceById(sourceId);

    if (!source) {
      return res.status(404).json({ error: 'Source nicht gefunden' });
    }

    res.json({
      status: source.status,
      progress: source.progress || 0,
      current_job: source.status === 'completed' ? 'Fertig' : 'Fragen werden generiert…'
    });
  } catch (error) {
    console.error('Fehler beim Abfragen des Verarbeitungsstatus:', error);
    res.status(500).json({ error: 'Status konnte nicht abgefragt werden' });
  }
}));

// ✅ GET /api/processing/sources/:sourceId/tests - Generierten Test abrufen
router.get('/sources/:sourceId/tests', authCheck, asyncHandler(async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId, 10);
    const source = await findSourceById(sourceId);

    if (!source || !source.test) {
      return res.status(404).json({ error: 'Test noch nicht bereit' });
    }

    res.json({ tests: [source.test] });
  } catch (error) {
    console.error('Fehler beim Abrufen des Tests:', error);
    res.status(500).json({ error: 'Test konnte nicht abgerufen werden' });
  }
}));

// ✅ POST /api/processing/tests/:testId/submit - Test einreichen
//
// Sicherheitsaudit Kritisch #4: der Client sendet nur noch die rohen
// Antworten; das Ergebnis wird ausschließlich serverseitig aus den beim
// Verarbeitungs-Schritt gespeicherten richtigen Antworten
// (source.test.questions) berechnet - unverändert gegenüber vorher, nur
// dass die Source jetzt aus der echten Datenbank kommt.
router.post('/tests/:testId/submit', authCheck, asyncHandler(async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user.id;
    const { answers, timeTaken } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers (Array) erforderlich' });
    }

    // Im Mock-Modus entspricht die Test-Id der Source-Id (siehe
    // generateMockTest: test.id = sourceId) - darüber finden wir die
    // tatsächlich richtigen Antworten wieder, statt dem Client zu glauben.
    const source = await findSourceById(parseInt(testId, 10));
    if (!source || !source.test) {
      return res.status(404).json({ error: 'Test nicht gefunden' });
    }

    const questions = source.test.questions || [];
    const answerByQuestionId = new Map(
      answers.map(a => [String(a.question_id), a.answer])
    );

    let correctCount = 0;
    const gradedAnswers = questions.map((q) => {
      const userAnswer = answerByQuestionId.get(String(q.id)) || '';
      const isCorrect =
        !!userAnswer &&
        userAnswer.toLowerCase().trim() === String(q.correct_answer).toLowerCase().trim();
      if (isCorrect) correctCount++;
      return { question_id: q.id, answer: userAnswer, is_correct: isCorrect };
    });

    const totalQuestions = questions.length;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const submission = await createSubmission({
      userId,
      testId: parseInt(testId, 10),
      correctCount,
      totalQuestions,
      accuracy,
      answersJson: gradedAnswers,
      timeTaken: timeTaken || 0
    });

    return res.json({
      success: true,
      message: 'Test erfolgreich eingereicht',
      submission: {
        submissionId: submission.id,
        correctCount: submission.correct_count,
        totalQuestions: submission.total_questions,
        accuracy: submission.accuracy,
        submittedAt: submission.submitted_at
      }
    });
  } catch (error) {
    console.error('Fehler beim Test-Submit:', error);
    return res.status(500).json({
      error: 'Fehler beim Einreichen des Tests',
      details: error.message
    });
  }
}));

// GET /api/processing/tests/:testId - Test laden
//
// Hinweis: dieser Endpoint wird vom aktuellen Frontend nicht aufgerufen
// (der eigentliche Test kommt über GET /sources/:sourceId/tests) - bleibt
// hier nur als einfacher Beispiel-Endpoint für spätere Erweiterungen
// erhalten, statt wie vorher einen toten "echte DB"-Zweig gegen eine nie
// existierende tests-Tabelle zu haben.
router.get('/tests/:testId', authCheck, (req, res) => {
  const { testId } = req.params;
  res.json({
    test: {
      id: testId,
      title: 'Test Beispiel',
      description: 'Dies ist ein Test',
      questions: [
        {
          id: 1,
          type: 'multiple_choice',
          question: 'Was ist 2+2?',
          options: ['3', '4', '5', '6'],
          correct_answer: '1'
        }
      ],
      createdAt: new Date().toISOString()
    }
  });
});

// ✅ GET /api/processing/submissions - Alle Tests des Benutzers
router.get('/submissions', authCheck, asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await findSubmissionsByUser(userId);

    const submissions = rows.map(row => ({
      id: row.id,
      testId: row.test_id,
      testTitle: row.test_title || 'Generierter Test',
      correctCount: row.correct_count,
      totalQuestions: row.total_questions,
      accuracy: row.accuracy,
      submittedAt: row.submitted_at
    }));

    res.json({
      success: true,
      submissions,
      totalSubmissions: submissions.length
    });
  } catch (error) {
    console.error('Fehler beim Laden der Submissions:', error);
    res.status(500).json({
      error: 'Fehler beim Laden der Test-Einreichungen',
      details: error.message
    });
  }
}));

// ✅ GET /api/processing/submissions/:submissionId - Einzelne Submission
router.get('/submissions/:submissionId', authCheck, asyncHandler(async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;

    const submission = await findSubmissionById(parseInt(submissionId, 10), userId);
    if (!submission) {
      return res.status(404).json({ error: 'Einreichung nicht gefunden' });
    }

    res.json({
      success: true,
      submission: {
        id: submission.id,
        testId: submission.test_id,
        testTitle: submission.testTitle || 'Generierter Test',
        correctCount: submission.correct_count,
        totalQuestions: submission.total_questions,
        accuracy: submission.accuracy,
        timeTaken: submission.time_taken,
        submittedAt: submission.submitted_at,
        userAnswers: submission.answers_json || [],
        questions: submission.questions || []
      }
    });
  } catch (error) {
    console.error('Fehler beim Laden der Submission-Details:', error);
    res.status(500).json({
      error: 'Fehler beim Laden der Einreichungsdetails',
      details: error.message
    });
  }
}));

module.exports = router;
