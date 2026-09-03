// Schüler-seitige Klassen-Routen (Lehrer-Portal Phase 1, 2026-09-03).
//
// Getrennt von routes/teacher.js: hier geht es um das KIND-Konto (normales
// "token"-Cookie, authCheck-Middleware), das einer Klasse beigetreten ist
// und deren Klassenarbeiten ansehen/bearbeiten darf - nicht um die
// Lehrkraft selbst. Jede Route prüft zusätzlich zur Anmeldung, ob dieser
// Schüler tatsächlich Mitglied der angefragten Klasse ist (Ownership-Check,
// gleiches Muster wie beim Eltern-Board: Autorisierung nie aus der URL
// ableiten, sondern immer serverseitig gegen die echte Mitgliedschaft
// prüfen).

const express = require('express');
const authCheck = require('../middleware/authCheck');
const {
  findClassMembership,
  findClassSourcesByClass,
  findClassSourceById,
  findClassSourceSubmissionByStudent,
  createClassSourceSubmission
} = require('../store');

const router = express.Router();

async function requireMembership(req, res) {
  const classId = parseInt(req.params.classId, 10);
  if (!classId) {
    res.status(400).json({ error: 'Ungültige Klassen-ID' });
    return null;
  }
  const membership = await findClassMembership(classId, req.user.id);
  if (!membership) {
    res.status(403).json({ error: 'Du bist kein Mitglied dieser Klasse' });
    return null;
  }
  return classId;
}

// Liste der Klassenarbeiten dieser Klasse, jeweils mit Hinweis, ob DIESER
// Schüler sie schon gemacht hat (für "Test starten" vs. "Bereits erledigt").
router.get('/:classId/sources', authCheck, async (req, res) => {
  try {
    const classId = await requireMembership(req, res);
    if (!classId) return;

    const sources = await findClassSourcesByClass(classId);
    const sourcesWithStatus = await Promise.all(
      sources.map(async (source) => {
        const submission = await findClassSourceSubmissionByStudent(source.id, req.user.id);
        return {
          id: source.id,
          title: source.title,
          status: source.status,
          questionCount: source.test?.questions?.length || 0,
          completed: !!submission,
          lastResult: submission
            ? {
                correctCount: submission.correct_count,
                totalQuestions: submission.total_questions,
                accuracy: submission.accuracy,
                submittedAt: submission.submitted_at
              }
            : null
        };
      })
    );

    return res.json({ sources: sourcesWithStatus });
  } catch (error) {
    console.error('Class Sources (Student) Error:', error);
    return res.status(500).json({ error: 'Klassenarbeiten konnten nicht geladen werden' });
  }
});

router.get('/:classId/sources/:sourceId', authCheck, async (req, res) => {
  try {
    const classId = await requireMembership(req, res);
    if (!classId) return;

    const sourceId = parseInt(req.params.sourceId, 10);
    const source = await findClassSourceById(sourceId);
    if (!source || source.class_id !== classId) {
      return res.status(404).json({ error: 'Klassenarbeit nicht gefunden' });
    }
    if (!source.test) {
      return res.status(404).json({ error: 'Test noch nicht bereit' });
    }

    return res.json({ test: { id: source.id, ...source.test } });
  } catch (error) {
    console.error('Class Source (Student) Error:', error);
    return res.status(500).json({ error: 'Test konnte nicht geladen werden' });
  }
});

// ✅ Sicherheitsaudit Kritisch #4: die Bewertung passiert serverseitig -
// der Client sendet nur die rohen Antworten, nie ein selbst berechnetes
// Ergebnis (gleiches Muster wie processing.js /tests/:testId/submit).
router.post('/:classId/sources/:sourceId/submit', authCheck, async (req, res) => {
  try {
    const classId = await requireMembership(req, res);
    if (!classId) return;

    const sourceId = parseInt(req.params.sourceId, 10);
    const source = await findClassSourceById(sourceId);
    if (!source || source.class_id !== classId || !source.test) {
      return res.status(404).json({ error: 'Klassenarbeit nicht gefunden' });
    }

    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers (Array) erforderlich' });
    }

    const questions = source.test.questions || [];
    const answerByQuestionId = new Map(answers.map((a) => [String(a.question_id), a.answer]));

    let correctCount = 0;
    questions.forEach((q) => {
      const userAnswer = answerByQuestionId.get(String(q.id)) || '';
      if (
        userAnswer &&
        userAnswer.toLowerCase().trim() === String(q.correct_answer).toLowerCase().trim()
      ) {
        correctCount++;
      }
    });

    const totalQuestions = questions.length;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const submission = await createClassSourceSubmission({
      classSourceId: sourceId,
      studentUserId: req.user.id,
      correctCount,
      totalQuestions,
      accuracy
    });

    return res.json({
      success: true,
      submission: {
        correctCount: submission.correct_count,
        totalQuestions: submission.total_questions,
        accuracy: submission.accuracy,
        submittedAt: submission.submitted_at
      }
    });
  } catch (error) {
    console.error('Class Source Submit Error:', error);
    return res.status(500).json({ error: 'Test konnte nicht eingereicht werden' });
  }
});

module.exports = router;
