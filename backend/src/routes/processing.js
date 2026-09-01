const express = require('express');
const router = express.Router();

// ✅ Simple Auth Check - Extract from Authorization header
const authCheck = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentifizierung erforderlich' });
  }
  // For testing: use userId from query param or default to 1
  req.user = { id: req.query.userId || 1 };
  next();
};

// Try to get database connection, but gracefully fall back to mock mode
let db = null;
let usingMockMode = false;

try {
} catch (error) {
  console.warn('⚠️  Database not available - Running in MOCK MODE');
  console.warn('Error:', error.message);
  usingMockMode = true;
}

// ✅ Mock data storage for fallback mode
const mockSubmissions = new Map();

// ✅ POST /api/processing/tests/:testId/submit - Test einreichen
router.post('/tests/:testId/submit', authCheck, async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user.id;
    const { answers, correctCount, totalQuestions, accuracy, timeTaken } = req.body;

    // Validation
    if (correctCount === undefined || totalQuestions === undefined || accuracy === undefined) {
      return res.status(400).json({
        error: 'Erforderliche Felder fehlen: correctCount, totalQuestions, accuracy'
      });
    }

    if (correctCount < 0 || correctCount > totalQuestions) {
      return res.status(400).json({
        error: 'correctCount muss zwischen 0 und totalQuestions liegen'
      });
    }

    if (accuracy < 0 || accuracy > 100) {
      return res.status(400).json({
        error: 'accuracy muss zwischen 0 und 100 liegen'
      });
    }

    if (usingMockMode) {
      // Mock mode - store in memory
      const submissionId = Math.floor(Math.random() * 100000);
      const submission = {
        id: submissionId,
        user_id: userId,
        test_id: testId,
        correct_count: correctCount,
        total_questions: totalQuestions,
        accuracy,
        submitted_at: new Date().toISOString(),
        answers_json: answers,
        time_taken: timeTaken || 0
      };

      if (!mockSubmissions.has(userId)) {
        mockSubmissions.set(userId, []);
      }
      mockSubmissions.get(userId).push(submission);

      return res.json({
        success: true,
        message: 'Test erfolgreich eingereicht',
        submission: {
          submissionId,
          correctCount,
          totalQuestions,
          accuracy,
          submittedAt: submission.submitted_at
        }
      });
    } else {
      // Real database mode
      const testExists = await db.query(
        'SELECT id, title FROM tests WHERE id = $1',
        [testId]
      );

      if (testExists.rows.length === 0) {
        return res.status(404).json({ error: 'Test nicht gefunden' });
      }

      const submissionResult = await db.query(
        `INSERT INTO test_submissions
         (user_id, test_id, correct_count, total_questions, accuracy, answers_json, time_taken, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING id, correct_count, total_questions, accuracy, submitted_at`,
        [userId, testId, correctCount, totalQuestions, accuracy, JSON.stringify(answers), timeTaken || 0]
      );

      const submission = submissionResult.rows[0];
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
    }
  } catch (error) {
    console.error('Fehler beim Test-Submit:', error);
    return res.status(500).json({
      error: 'Fehler beim Einreichen des Tests',
      details: error.message
    });
  }
});

// ✅ GET /api/processing/tests/:testId - Test laden
router.get('/tests/:testId', authCheck, async (req, res) => {
  try {
    const { testId } = req.params;

    if (usingMockMode) {
      // Mock mode - return sample test
      return res.json({
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
    } else {
      // Real database mode
      const testResult = await db.query(
        `SELECT id, title, description, questions_json, created_at
         FROM tests
         WHERE id = $1`,
        [testId]
      );

      if (testResult.rows.length === 0) {
        return res.status(404).json({ error: 'Test nicht gefunden' });
      }

      const test = testResult.rows[0];
      const questions = JSON.parse(test.questions_json || '[]');

      return res.json({
        test: {
          id: test.id,
          title: test.title,
          description: test.description,
          questions: questions,
          createdAt: test.created_at
        }
      });
    }
  } catch (error) {
    console.error('Fehler beim Test-Laden:', error);
    return res.status(500).json({
      error: 'Fehler beim Laden des Tests',
      details: error.message
    });
  }
});

// ✅ GET /api/processing/submissions - Alle Tests des Benutzers
router.get('/submissions', authCheck, async (req, res) => {
  try {
    const userId = req.user.id;

    if (usingMockMode) {
      // Mock mode - return user's submissions
      const userSubmissions = mockSubmissions.get(userId) || [];
      const submissions = userSubmissions.map(row => ({
        id: row.id,
        testId: row.test_id,
        testTitle: row.test_title || 'Test Beispiel',
        testDescription: row.test_description || 'Dies ist ein Test',
        correctCount: row.correct_count,
        totalQuestions: row.total_questions,
        accuracy: row.accuracy,
        submittedAt: row.submitted_at
      }));

      return res.json({
        success: true,
        submissions: submissions,
        totalSubmissions: submissions.length
      });
    } else {
      // Real database mode
      const submissionsResult = await db.query(
        `SELECT
          ts.id,
          ts.test_id,
          ts.correct_count,
          ts.total_questions,
          ts.accuracy,
          ts.submitted_at,
          t.title as test_title,
          t.description as test_description
         FROM test_submissions ts
         JOIN tests t ON ts.test_id = t.id
         WHERE ts.user_id = $1
         ORDER BY ts.submitted_at DESC
         LIMIT 100`,
        [userId]
      );

      const submissions = submissionsResult.rows.map(row => ({
        id: row.id,
        testId: row.test_id,
        testTitle: row.test_title,
        testDescription: row.test_description,
        correctCount: row.correct_count,
        totalQuestions: row.total_questions,
        accuracy: row.accuracy,
        submittedAt: row.submitted_at
      }));

      return res.json({
        success: true,
        submissions: submissions,
        totalSubmissions: submissions.length
      });
    }
  } catch (error) {
    console.error('Fehler beim Laden der Submissions:', error);
    return res.status(500).json({
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

    if (usingMockMode) {
      // Mock mode - find submission in memory
      const userSubmissions = mockSubmissions.get(userId) || [];
      const submission = userSubmissions.find(s => s.id === parseInt(submissionId));

      if (!submission) {
        return res.status(404).json({ error: 'Einreichung nicht gefunden' });
      }

      return res.json({
        success: true,
        submission: {
          id: submission.id,
          testId: submission.test_id,
          testTitle: submission.test_title || 'Test Beispiel',
          correctCount: submission.correct_count,
          totalQuestions: submission.total_questions,
          accuracy: submission.accuracy,
          timeTaken: submission.time_taken,
          submittedAt: submission.submitted_at,
          userAnswers: submission.answers_json || {},
          questions: [
            {
              id: 1,
              type: 'multiple_choice',
              question: 'Was ist 2+2?',
              options: ['3', '4', '5', '6']
            }
          ]
        }
      });
    } else {
      // Real database mode
      const submissionResult = await db.query(
        `SELECT
          ts.id,
          ts.test_id,
          ts.correct_count,
          ts.total_questions,
          ts.accuracy,
          ts.answers_json,
          ts.time_taken,
          ts.submitted_at,
          t.title as test_title,
          t.questions_json
         FROM test_submissions ts
         JOIN tests t ON ts.test_id = t.id
         WHERE ts.id = $1 AND ts.user_id = $2`,
        [submissionId, userId]
      );

      if (submissionResult.rows.length === 0) {
        return res.status(404).json({ error: 'Einreichung nicht gefunden' });
      }

      const submission = submissionResult.rows[0];
      return res.json({
        success: true,
        submission: {
          id: submission.id,
          testId: submission.test_id,
          testTitle: submission.test_title,
          correctCount: submission.correct_count,
          totalQuestions: submission.total_questions,
          accuracy: submission.accuracy,
          timeTaken: submission.time_taken,
          submittedAt: submission.submitted_at,
          userAnswers: JSON.parse(submission.answers_json || '{}'),
          questions: JSON.parse(submission.questions_json || '[]')
        }
      });
    }
  } catch (error) {
    console.error('Fehler beim Laden der Submission-Details:', error);
    return res.status(500).json({
      error: 'Fehler beim Laden der Einreichungsdetails',
      details: error.message
    });
  }
});

module.exports = router;
