// src/routes/processing.js - AI Content Processing + Test APIs

const express = require('express');
const router = express.Router();
const pool = require('../database/connection');
const ProcessingQueue = require('../services/processingQueue');

// Middleware: JWT Verification
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).json({ error: 'Token erforderlich' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token ungültig oder abgelaufen' });
    }
    req.user = decoded;
    next();
  });
}

// ============= API 1: Processing Status =============
router.get('/sources/:sourceId/status', verifyToken, async (req, res) => {
  try {
    const { sourceId } = req.params;
    const userId = req.user.id;

    // Überprüfe ob Content Source dem User gehört
    const sourceResult = await pool.query(
      `SELECT cs.*, ud.filename 
       FROM content_sources cs
       JOIN uploaded_documents ud ON cs.reference_id = ud.id
       WHERE cs.id = $1 AND cs.user_id = $2`,
      [sourceId, userId]
    );

    if (sourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Content Source nicht gefunden' });
    }

    const source = sourceResult.rows[0];

    // Get processing progress
    const jobsResult = await pool.query(
      `SELECT job_type, status, progress, error_message, completed_at
       FROM processing_jobs
       WHERE source_id = $1
       ORDER BY created_at DESC`,
      [sourceId]
    );

    const jobs = jobsResult.rows;
    const totalSteps = 6; // OCR, Analysis, Generation, Quality, Assembly, Metadata
    const completedSteps = jobs.filter(j => j.status === 'completed').length;
    const currentProgress = Math.round((completedSteps / totalSteps) * 100);

    // Bestimme Status
    let status = source.processing_status;
    let message = '';
    let currentJob = '';

    if (jobs.length > 0) {
      const latestJob = jobs[0];
      currentJob = latestJob.job_type;
      
      const jobMessages = {
        'ocr': 'Extrahiere Text aus Bildern...',
        'analysis': 'Analysiere Inhalte...',
        'generation': 'Generiere Fragen...',
        'quality_check': 'Überprüfe Qualität...',
        'assembly': 'Stelle Tests zusammen...',
        'metadata': 'Speichere Daten...'
      };
      
      message = jobMessages[currentJob] || 'Wird verarbeitet...';
      
      if (latestJob.error_message) {
        status = 'failed';
        message = latestJob.error_message;
      }
    }

    res.json({
      source_id: sourceId,
      filename: source.filename,
      processing_status: status,
      progress: currentProgress,
      current_job: currentJob,
      message: message,
      jobs_completed: completedSteps,
      total_jobs: totalSteps,
      estimated_time: status === 'completed' ? 0 : Math.max(30, 120 - (completedSteps * 20))
    });
  } catch (error) {
    console.error('Status Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen des Status' });
  }
});

// ============= API 2: Get Generated Tests =============
router.get('/sources/:sourceId/tests', verifyToken, async (req, res) => {
  try {
    const { sourceId } = req.params;
    const userId = req.user.id;

    // Überprüfe ob Content Source dem User gehört
    const sourceResult = await pool.query(
      `SELECT * FROM content_sources
       WHERE id = $1 AND user_id = $2`,
      [sourceId, userId]
    );

    if (sourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Content Source nicht gefunden' });
    }

    // Get generated tests
    const testsResult = await pool.query(
      `SELECT id, test_type, title, total_questions, difficulty, estimated_time, status, created_at
       FROM tests
       WHERE source_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [sourceId, userId]
    );

    const tests = testsResult.rows;

    // Get detailed test data if requested
    const detailedTests = [];
    for (const test of tests) {
      const questionsResult = await pool.query(
        `SELECT * FROM tests WHERE id = $1`,
        [test.id]
      );

      if (questionsResult.rows.length > 0) {
        const testData = questionsResult.rows[0];
        detailedTests.push({
          id: test.id,
          test_type: test.test_type,
          title: test.title,
          total_questions: test.total_questions,
          difficulty: test.difficulty,
          estimated_time: test.estimated_time,
          status: test.status,
          questions: testData.questions, // JSONB data
          created_at: test.created_at
        });
      }
    }

    res.json({
      source_id: sourceId,
      tests_count: tests.length,
      tests: detailedTests,
      message: tests.length > 0 ? 'Tests erfolgreich generiert' : 'Keine Tests gefunden'
    });
  } catch (error) {
    console.error('Get Tests Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Tests' });
  }
});

// ============= API 3: Submit Test Answers =============
router.post('/tests/:testId/submit', verifyToken, async (req, res) => {
  try {
    const { testId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Antworten erforderlich (Array)' });
    }

    // Get test details
    const testResult = await pool.query(
      `SELECT * FROM tests WHERE id = $1 AND user_id = $2`,
      [testId, userId]
    );

    if (testResult.rows.length === 0) {
      return res.status(404).json({ error: 'Test nicht gefunden' });
    }

    const test = testResult.rows[0];
    const questions = test.questions; // JSONB

    // Calculate score
    let correctCount = 0;
    const detailedAnswers = [];

    for (let i = 0; i < answers.length; i++) {
      const userAnswer = answers[i];
      const question = questions[i];

      if (!question) continue;

      const isCorrect = userAnswer.toLowerCase().trim() === 
                       question.correct_answer.toLowerCase().trim();

      if (isCorrect) correctCount++;

      detailedAnswers.push({
        question_id: question.id,
        question_text: question.question_text,
        question_type: question.type,
        user_answer: userAnswer,
        correct_answer: question.correct_answer,
        is_correct: isCorrect,
        explanation: question.explanation,
        difficulty: question.difficulty
      });
    }

    const accuracy = Math.round((correctCount / answers.length) * 100);
    const score = correctCount;
    const totalPoints = answers.length;

    // Save submission
    const submissionResult = await pool.query(
      `INSERT INTO test_submissions (test_id, user_id, answers, score, total_points, accuracy_percentage, time_taken, feedback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, submitted_at`,
      [
        testId,
        userId,
        JSON.stringify(detailedAnswers),
        score,
        totalPoints,
        accuracy,
        0, // Zeit wird vom Frontend gemessen
        JSON.stringify({
          message: accuracy >= 70 ? 'Gute Arbeit!' : 'Versuche es nächstes Mal besser!',
          tips: detailedAnswers.filter(a => !a.is_correct).map(a => a.explanation)
        })
      ]
    );

    // Update test status
    await pool.query(
      `UPDATE tests SET status = 'completed', first_attempted_at = NOW() WHERE id = $1`,
      [testId]
    );

    // Update user progress
    await pool.query(
      `UPDATE progress 
       SET completed_at = NOW(), score = $1
       WHERE student_id = $2`,
      [score, userId]
    );

    res.json({
      submission_id: submissionResult.rows[0].id,
      test_id: testId,
      score: score,
      total_points: totalPoints,
      accuracy_percentage: accuracy,
      submitted_at: submissionResult.rows[0].submitted_at,
      results: {
        correct_count: correctCount,
        incorrect_count: totalPoints - correctCount,
        detailed_answers: detailedAnswers
      },
      message: accuracy >= 70 ? '🎉 Gute Arbeit!' : '💪 Nächstes Mal wird es besser!'
    });
  } catch (error) {
    console.error('Submit Test Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Speichern des Tests' });
  }
});

// ============= API 4: Trigger Processing (Trigger KI-Pipeline) =============
router.post('/sources/:sourceId/process', verifyToken, async (req, res) => {
  try {
    const { sourceId } = req.params;
    const userId = req.user.id;

    // Überprüfe ob Content Source dem User gehört
    const sourceResult = await pool.query(
      `SELECT * FROM content_sources WHERE id = $1 AND user_id = $2`,
      [sourceId, userId]
    );

    if (sourceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Content Source nicht gefunden' });
    }

    // Start processing
    await pool.query(
      `UPDATE content_sources SET processing_status = $1, processing_started_at = NOW()
       WHERE id = $2`,
      ['processing', sourceId]
    );

    // Trigger async processing
    ProcessingQueue.enqueueProcessing(sourceId);

    res.json({
      source_id: sourceId,
      status: 'processing',
      message: 'KI-Verarbeitung gestartet. Dies kann einige Minuten dauern...'
    });
  } catch (error) {
    console.error('Process Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Starten der Verarbeitung' });
  }
});

// ============= API 5: Get User Test Statistics =============
router.get('/user/statistics', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const statsResult = await pool.query(
      `SELECT 
        COUNT(DISTINCT t.id) as total_tests,
        COUNT(DISTINCT ts.id) as total_attempts,
        ROUND(AVG(ts.accuracy_percentage), 2) as avg_accuracy,
        MAX(ts.submitted_at) as last_attempt
       FROM tests t
       LEFT JOIN test_submissions ts ON t.id = ts.test_id
       WHERE t.user_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0];

    res.json({
      user_id: userId,
      total_tests: parseInt(stats.total_tests) || 0,
      total_attempts: parseInt(stats.total_attempts) || 0,
      average_accuracy: parseFloat(stats.avg_accuracy) || 0,
      last_attempt: stats.last_attempt || null
    });
  } catch (error) {
    console.error('Statistics Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Statistiken' });
  }
});

module.exports = router;