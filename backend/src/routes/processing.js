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

// ✅ Sicherheitsaudit Befund 10: es gibt hier keinen "Mock-Modus"-Zweig mehr
// (vorher: usingMockMode-Flag + eine separate, nur lokal im Prozess
// gehaltene mockSubmissions-Map). Alles läuft jetzt ausschließlich über
// store.js gegen die echte Datenbank (Supabase/Postgres) - Daten bleiben
// deshalb auch nach einem Server-Neustart erhalten.

// ---- Mock-Testgenerierung ----
// Platzhalter, bis eine echte KI-Generierung aus dem Dokumenttext sicher
// angebunden ist (siehe Sicherheitsaudit Kritisch #6: Uploads müssen vor
// einem OpenAI-Aufruf bereinigt werden – das ist bewusst NICHT Teil
// dieses Fixes, der nur die Datenpersistenz behebt).
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

// ✅ POST /api/processing/sources/:sourceId/process - Verarbeitung starten
router.post('/sources/:sourceId/process', authCheck, async (req, res) => {
  try {
    const sourceId = parseInt(req.params.sourceId, 10);
    const source = await findSourceById(sourceId);

    if (!source) {
      return res.status(404).json({ error: 'Source nicht gefunden' });
    }

    await updateSource(sourceId, { status: 'processing', progress: 10 });

    // Simuliert einen laufenden Verarbeitungsschritt (wie vorher), nur dass
    // jetzt bei jedem Fortschrittsschritt die Datenbank aktualisiert wird
    // statt nur ein In-Memory-Objekt zu mutieren - so übersteht der Zustand
    // auch einen Server-Neustart mitten in der "Verarbeitung".
    const steps = [30, 60, 90, 100];
    let i = 0;
    const interval = setInterval(async () => {
      try {
        const progress = steps[i];
        if (progress === 100) {
          await updateSource(sourceId, {
            status: 'completed',
            progress,
            test: generateMockTest(sourceId)
          });
          clearInterval(interval);
        } else {
          await updateSource(sourceId, { progress });
        }
        i++;
      } catch (err) {
        console.error('Fehler bei der Verarbeitungs-Simulation:', err);
        clearInterval(interval);
      }
    }, 800);

    res.json({ message: 'Verarbeitung gestartet', status: 'processing' });
  } catch (error) {
    console.error('Fehler beim Start der Verarbeitung:', error);
    res.status(500).json({ error: 'Verarbeitung konnte nicht gestartet werden' });
  }
});

// ✅ GET /api/processing/sources/:sourceId/status - Verarbeitungsstatus abfragen
router.get('/sources/:sourceId/status', authCheck, async (req, res) => {
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
});

// ✅ GET /api/processing/sources/:sourceId/tests - Generierten Test abrufen
router.get('/sources/:sourceId/tests', authCheck, async (req, res) => {
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
});

// ✅ POST /api/processing/tests/:testId/submit - Test einreichen
//
// Sicherheitsaudit Kritisch #4: der Client sendet nur noch die rohen
// Antworten; das Ergebnis wird ausschließlich serverseitig aus den beim
// Verarbeitungs-Schritt gespeicherten richtigen Antworten
// (source.test.questions) berechnet - unverändert gegenüber vorher, nur
// dass die Source jetzt aus der echten Datenbank kommt.
router.post('/tests/:testId/submit', authCheck, async (req, res) => {
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
});

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
router.get('/submissions', authCheck, async (req, res) => {
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
});

// ✅ GET /api/processing/submissions/:submissionId - Einzelne Submission
router.get('/submissions/:submissionId', authCheck, async (req, res) => {
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
});

module.exports = router;