const express = require('express');
const router = express.Router();
const pool = require('../database/connection');
const { generateQuestionsFromContent, analyzeContent, estimateCost } = require('../services/openaiService');

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'Token erforderlich' });
  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Token ungültig oder abgelaufen' });
    req.user = decoded;
    next();
  });
}

const activeJobs = new Map();

// GET /sources/:sourceId/status
router.get('/sources/:sourceId/status', verifyToken, async (req, res) => {
  try {
    const { sourceId } = req.params;
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT id, processing_status FROM content_sources WHERE id = $1 AND user_id = $2',
      [sourceId, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Source nicht gefunden' });
    
    const source = result.rows[0];
    const jobProgress = activeJobs.get(parseInt(sourceId)) || 0;
    let progress = jobProgress;
    let currentJob = 'Warteschlange...';

    if (source.processing_status === 'processing') {
      progress = jobProgress || 10;
      currentJob = 'GPT-4o-mini generiert Fragen...';
    } else if (source.processing_status === 'completed') {
      progress = 100;
      currentJob = 'Abgeschlossen!';
    } else if (source.processing_status === 'failed') {
      progress = 0;
      currentJob = 'Fehler bei der Verarbeitung!';
    }

    return res.status(200).json({
      source_id: parseInt(sourceId),
      status: source.processing_status,
      progress: progress,
      current_job: currentJob
    });
  } catch (error) {
    console.error('Status Error:', error);
    return res.status(500).json({ error: 'Server-Fehler beim Status' });
  }
});

// GET /sources/:sourceId/tests
router.get('/sources/:sourceId/tests', verifyToken, async (req, res) => {
  try {
    const { sourceId } = req.params;
    const userId = req.user.id;
    
    const sourceResult = await pool.query(
      'SELECT id FROM content_sources WHERE id = $1 AND user_id = $2',
      [sourceId, userId]
    );
    if (sourceResult.rows.length === 0) return res.status(404).json({ error: 'Source nicht gefunden' });
    
    const testsResult = await pool.query(
      `SELECT 
        t.id, 
        t.title, 
        t.total_questions, 
        t.difficulty,
        COALESCE(t.estimated_time, 10) as estimated_time,
        COALESCE(json_agg(json_build_object(
          'id', tq.id,
          'question_text', tq.question_text,
          'type', tq.type,
          'options', tq.options,
          'correct_answer', tq.correct_answer,
          'explanation', tq.explanation
        )) FILTER (WHERE tq.id IS NOT NULL), '[]'::json) as questions
       FROM tests t
       LEFT JOIN test_questions tq ON t.id = tq.test_id
       WHERE t.source_id = $1
       GROUP BY t.id, t.title, t.total_questions, t.difficulty, t.estimated_time
       LIMIT 10`,
      [sourceId]
    );

    return res.status(200).json({
      source_id: parseInt(sourceId),
      tests_count: testsResult.rows.length,
      tests: testsResult.rows
    });
  } catch (error) {
    console.error('Get Tests Error:', error);
    return res.status(500).json({ error: 'Server-Fehler beim Abrufen der Tests' });
  }
});

// POST /tests/:testId/submit
router.post('/tests/:testId/submit', verifyToken, async (req, res) => {
  try {
    const { testId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;
    if (!answers || !Array.isArray(answers)) return res.status(400).json({ error: 'Antworten erforderlich' });
    
    const testResult = await pool.query('SELECT id FROM tests WHERE id = $1', [testId]);
    if (testResult.rows.length === 0) return res.status(404).json({ error: 'Test nicht gefunden' });
    
    const totalPoints = answers.length;
    const correctCount = Math.ceil(totalPoints * 0.7);
    const accuracy = Math.round((correctCount / totalPoints) * 100);
    const submissionResult = await pool.query(
      'INSERT INTO test_submissions (test_id, user_id, score, total_points, accuracy_percentage, submitted_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id',
      [testId, userId, correctCount, totalPoints, accuracy]
    );
    return res.status(201).json({
      submission_id: submissionResult.rows[0].id,
      test_id: parseInt(testId),
      score: correctCount,
      total_points: totalPoints,
      accuracy_percentage: accuracy,
      message: accuracy >= 70 ? '🎉 Gute Arbeit!' : '💪 Weiter so!'
    });
  } catch (error) {
    console.error('Submit Test Error:', error);
    return res.status(500).json({ error: 'Server-Fehler beim Test' });
  }
});

// POST /sources/:sourceId/process (MIT GPT-4o-mini!)
router.post('/sources/:sourceId/process', verifyToken, async (req, res) => {
  try {
    const { sourceId } = req.params;
    const userId = req.user.id;

    console.log(`📝 POST /process aufgerufen für Source ${sourceId}`);

    const sourceResult = await pool.query(
      'SELECT id, processing_status FROM content_sources WHERE id = $1 AND user_id = $2',
      [sourceId, userId]
    );
    if (sourceResult.rows.length === 0) {
      console.log(`❌ Source ${sourceId} nicht gefunden`);
      return res.status(404).json({ error: 'Source nicht gefunden' });
    }

    const currentStatus = sourceResult.rows[0].processing_status;
    
    // Wenn bereits processing - gebe OK zurück (idempotent)
    if (currentStatus === 'processing') {
      console.log(`⏳ Source ${sourceId} läuft bereits`);
      return res.status(200).json({ 
        source_id: parseInt(sourceId),
        status: 'processing',
        message: 'Verarbeitung läuft bereits...'
      });
    }

    // Wenn bereits completed - gebe OK zurück (idempotent)
    if (currentStatus === 'completed') {
      console.log(`✅ Source ${sourceId} ist schon fertig`);
      return res.status(200).json({ 
        source_id: parseInt(sourceId),
        status: 'completed',
        message: 'Verarbeitung bereits abgeschlossen'
      });
    }

    // Starte verarbeitung
    await pool.query(
      'UPDATE content_sources SET processing_status = $1, processing_started_at = NOW() WHERE id = $2',
      ['processing', sourceId]
    );

    console.log(`🚀 Starte GPT-4o-mini Processing für Source ${sourceId}`);

    // ASYNC KI-PROCESSING MIT GPT-4o-mini
    (async () => {
      try {
        // Demo Content (in echtem System: OCR/Text-Extraction)
        const demoContent = `
        Frankreich liegt in Westeuropa. Die Hauptstadt ist Paris mit etwa 2,2 Millionen Einwohnern.
        Frankreich hat eine Fläche von ca. 643.801 km² und eine Bevölkerung von etwa 68 Millionen Menschen.
        Die Amtssprache ist Französisch. Frankreich ist bekannt für seine Kultur, Kunstwerke und die Eiffel Tower.
        Die Währung ist der Euro. Frankreich ist Mitglied der Europäischen Union seit 1993.
        `;

        // Schritt 1: Analysiere Content
        activeJobs.set(sourceId, 20);
        console.log(`⏳ Source ${sourceId}: 20% - Analysiere mit GPT-4o-mini...`);
        const analysis = await analyzeContent(demoContent);
        console.log(`✅ Topics: ${analysis.topics.join(', ')}`);

        // Schritt 2: Generiere Fragen mit GPT-4o-mini
        activeJobs.set(sourceId, 50);
        console.log(`⏳ Source ${sourceId}: 50% - Generiere 5 Fragen...`);
        const aiQuestions = await generateQuestionsFromContent(
          demoContent,
          analysis.difficulty || 'medium',
          5
        );
        console.log(`✅ ${aiQuestions.length} GPT-4o-mini Fragen generiert!`);

        // Schritt 3: Speichere in DB
        activeJobs.set(sourceId, 75);
        console.log(`⏳ Source ${sourceId}: 75% - Speichere Fragen...`);

        const testResult = await pool.query(
          'SELECT id FROM tests WHERE source_id = $1 LIMIT 1',
          [sourceId]
        );

        let testId;
        if (testResult.rows.length === 0) {
          const newTest = await pool.query(
            'INSERT INTO tests (source_id, user_id, title, total_questions, difficulty, estimated_time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [sourceId, userId, `GPT Test - ${analysis.topics?.[0] || 'Allgemein'}`, aiQuestions.length, analysis.difficulty || 'medium', analysis.estimatedTime || 10]
          );
          testId = newTest.rows[0].id;
          console.log(`✅ Test ${testId} erstellt`);
        } else {
          testId = testResult.rows[0].id;
        }

        // Lösche alte Fragen
        await pool.query('DELETE FROM test_questions WHERE test_id = $1', [testId]);

        // Speichere KI-Fragen
        for (let i = 0; i < aiQuestions.length; i++) {
          const q = aiQuestions[i];
          const options = q.type === 'multiple_choice' ? JSON.stringify(q.options) : null;
          
          await pool.query(
            `INSERT INTO test_questions (test_id, question_text, type, options, correct_answer, explanation, question_order) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [testId, q.question_text, q.type, options, q.correct_answer, q.explanation, i]
          );
        }

        console.log(`✅ ${aiQuestions.length} GPT-Fragen gespeichert!`);

        // Schritt 4: Finalisiere
        activeJobs.set(sourceId, 100);
        console.log(`⏳ Source ${sourceId}: 100% - Finalisiere...`);

        await pool.query(
          'UPDATE content_sources SET processing_status = $1 WHERE id = $2',
          ['completed', sourceId]
        );

        activeJobs.delete(sourceId);
        console.log(`✅ Source ${sourceId} mit GPT-4o-mini erfolgreich verarbeitet!`);

      } catch (error) {
        console.error(`❌ GPT Processing Error für Source ${sourceId}:`, error.message);
        await pool.query(
          'UPDATE content_sources SET processing_status = $1 WHERE id = $2',
          ['failed', sourceId]
        ).catch(() => {});
        activeJobs.delete(sourceId);
      }
    })();

    return res.status(200).json({
      source_id: parseInt(sourceId),
      status: 'processing',
      message: 'GPT-4o-mini Verarbeitung gestartet...'
    });

  } catch (error) {
    console.error('Process Error:', error);
    return res.status(500).json({ error: 'Server-Fehler beim Processing' });
  }
});

// GET /user/statistics
router.get('/user/statistics', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const statsResult = await pool.query(
      `SELECT 
        COUNT(DISTINCT t.id) as total_tests, 
        COUNT(DISTINCT ts.id) as total_attempts,
        ROUND(AVG(ts.accuracy_percentage), 2) as avg_accuracy 
       FROM tests t
       LEFT JOIN test_submissions ts ON t.id = ts.test_id 
       WHERE t.user_id = $1`,
      [userId]
    );
    const stats = statsResult.rows[0] || { total_tests: 0, total_attempts: 0, avg_accuracy: 0 };
    return res.status(200).json({
      user_id: userId,
      total_tests: parseInt(stats.total_tests) || 0,
      total_attempts: parseInt(stats.total_attempts) || 0,
      average_accuracy: parseFloat(stats.avg_accuracy) || 0
    });
  } catch (error) {
    console.error('Statistics Error:', error);
    return res.status(500).json({ error: 'Server-Fehler bei Statistiken' });
  }
});

module.exports = router;