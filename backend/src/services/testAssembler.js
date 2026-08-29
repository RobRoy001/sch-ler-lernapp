// src/services/testAssembler.js - Zusammen Tests aus Fragen

const pool = require('../database/connection');

class TestAssembler {
  static assembleQuestions(allQuestions, testType = 'quick') {
    // Quick Test: 5 Fragen, Full Test: 20 Fragen
    const questionCount = testType === 'quick' ? 5 : 20;

    // Sortiere nach Quality Score, dann mix difficulty
    const sorted = [...allQuestions].sort((a, b) => 
      (b.quality_score || 0) - (a.quality_score || 0)
    );

    // Balance difficulty
    const easy = sorted.filter(q => q.difficulty === 'easy').slice(0, Math.ceil(questionCount * 0.3));
    const medium = sorted.filter(q => q.difficulty === 'medium').slice(0, Math.ceil(questionCount * 0.5));
    const hard = sorted.filter(q => q.difficulty === 'hard').slice(0, Math.ceil(questionCount * 0.2));

    const selected = [...easy, ...medium, ...hard].slice(0, questionCount);

    // Shuffle
    return selected.sort(() => Math.random() - 0.5);
  }

  static async createTests(sourceId, userId, questions, analyzedContent) {
    try {
      console.log('[TestAssembler] Creating tests...');

      // Assemble Quick Test (5 Fragen)
      const quickQuestions = this.assembleQuestions(questions, 'quick');
      const quickTest = await this.insertTest(
        userId,
        sourceId,
        'quick',
        quickQuestions,
        analyzedContent
      );

      // Assemble Full Test (20 Fragen, falls genug vorhanden)
      let fullTest = null;
      if (questions.length >= 20) {
        const fullQuestions = this.assembleQuestions(questions, 'full');
        fullTest = await this.insertTest(
          userId,
          sourceId,
          'full',
          fullQuestions,
          analyzedContent
        );
      }

      console.log('[TestAssembler] Tests created successfully');

      return {
        quick_test: quickTest,
        full_test: fullTest,
        total_questions_available: questions.length
      };
    } catch (error) {
      console.error('[TestAssembler] Error:', error.message);
      throw error;
    }
  }

  static async insertTest(userId, sourceId, testType, questions, analyzedContent) {
    const title = `${testType === 'quick' ? 'Quick' : 'Full'} Test - ${new Date().toLocaleDateString('de-DE')}`;
    
    const result = await pool.query(
      `INSERT INTO tests (user_id, source_id, test_type, title, questions, total_questions, difficulty, estimated_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, test_type, total_questions, created_at`,
      [
        userId,
        sourceId,
        testType,
        title,
        JSON.stringify(questions),
        questions.length,
        analyzedContent?.difficulty_level || 'medium',
        testType === 'quick' ? 10 : 30,
        'available'
      ]
    );

    return result.rows[0];
  }
}

module.exports = TestAssembler;