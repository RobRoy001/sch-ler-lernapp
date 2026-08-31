const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ✅ FIX #2: POST /api/processing/tests/:testId/submit - ECHTE Scoring speichern
router.post('/tests/:testId/submit', authMiddleware, async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user.id;
    const {
      answers,           // Benutzer-Antworten Objekt
      correctCount,      // ECHTE Anzahl richtig (vom Frontend berechnet)
      totalQuestions,    // Gesamtzahl Fragen
      accuracy,          // ECHTE Prozentquote (vom Frontend berechnet)
      timeTaken          // Zeit in Sekunden
    } = req.body;

    // Validierung der erforderlichen Felder
    if (correctCount === undefined || totalQuestions === undefined || accuracy === undefined) {
      return res.status(400).json({
        error: 'Erforderliche Felder fehlen: correctCount, totalQuestions, accuracy'
      });
    }

    // Validierung der Werte
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

    // Prüfen ob Test existiert
    const testExists = await db.query(
      'SELECT id, title, user_id FROM tests WHERE id = $1',
      [testId]
    );

    if (testExists.rows.length === 0) {
      return res.status(404).json({ error: 'Test nicht gefunden' });
    }

    // Test-Einreichung in Datenbank speichern
    const submissionResult = await db.query(
      `INSERT INTO test_submissions
       (user_id, test_id, correct_count, total_questions, accuracy, answers_json, time_taken, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, correct_count, total_questions, accuracy, submitted_at`,
      [
        userId,
        testId,
        correctCount,
        totalQuestions,
        accuracy,
        JSON.stringify(answers),  // Benutzer-Antworten als JSON speichern
        timeTaken || 0
      ]
    );

    const submission = submissionResult.rows[0];

    // Erfolgreiche Antwort mit Score-Daten
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

// ✅ GET /api/processing/tests/:testId - Test laden (für TestPlayer)
router.get('/tests/:testId', authMiddleware, async (req, res) => {
  try {
    const { testId } = req.params;

    const testResult = await db.query(
      `SELECT id, title, description, questions_json, user_id, created_at
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

  } catch (error) {
    console.error('Fehler beim Test-Laden:', error);
    return res.status(500).json({
      error: 'Fehler beim Laden des Tests',
      details: error.message
    });
  }
});

// ✅ GET /api/processing/submissions - Alle eingereichten Tests für den Benutzer
router.get('/submissions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

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

  } catch (error) {
    console.error('Fehler beim Laden der Submissions:', error);
    return res.status(500).json({
      error: 'Fehler beim Laden der Test-Einreichungen',
      details: error.message
    });
  }
});

// ✅ GET /api/processing/submissions/:submissionId - Einzelne Submission mit Details
router.get('/submissions/:submissionId', authMiddleware, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;

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

  } catch (error) {
    console.error('Fehler beim Laden der Submission-Details:', error);
    return res.status(500).json({
      error: 'Fehler beim Laden der Einreichungsdetails',
      details: error.message
    });
  }
});

module.exports = router;
