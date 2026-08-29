// src/services/processingQueue.js - Processing Queue Manager

const pool = require('../database/connection');
const OCRService = require('./ocrService');
const OpenAIService = require('./openaiService');
const TestAssembler = require('./testAssembler');

class ProcessingQueue {
  static async processContentSource(sourceId) {
    const client = await pool.connect();
    
    try {
      console.log(`\n[ProcessingQueue] Starting processing for source ${sourceId}...`);

      // Get source info
      const sourceResult = await client.query(
        'SELECT cs.*, ud.file_path, u.id as user_id, u.grade_level FROM content_sources cs JOIN uploaded_documents ud ON cs.reference_id = ud.id JOIN users u ON cs.user_id = u.id WHERE cs.id = $1',
        [sourceId]
      );

      if (sourceResult.rows.length === 0) {
        throw new Error('Content source not found');
      }

      const source = sourceResult.rows[0];

      // ============= STEP 1: OCR =============
      console.log('[ProcessingQueue] Step 1/6: OCR...');
      const extractedData = await OCRService.extract(source.file_path);
      
      const extractResult = await client.query(
        `INSERT INTO extracted_content (source_id, raw_text, text_length, language, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [sourceId, extractedData.raw_text, extractedData.text_length, 'deu', 'completed']
      );
      const extractedContentId = extractResult.rows[0].id;
      console.log(`[ProcessingQueue] ✓ Extracted ${extractedData.text_length} characters`);

      // ============= STEP 2: Analysis =============
      console.log('[ProcessingQueue] Step 2/6: Content Analysis...');
      const analysis = await OpenAIService.analyzeContent(extractedData.raw_text, source.grade_level);
      
      const analyzeResult = await client.query(
        `INSERT INTO analyzed_content (extracted_content_id, concepts, topics, difficulty_level, summary, key_points, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [extractedContentId, JSON.stringify(analysis.concepts), JSON.stringify(analysis.topics), analysis.difficulty_level, analysis.summary, JSON.stringify(analysis.key_points), 'completed']
      );
      const analyzedContentId = analyzeResult.rows[0].id;
      console.log(`[ProcessingQueue] ✓ Analyzed: ${analysis.topics.join(', ')}`);

      // ============= STEP 3: Generation =============
      console.log('[ProcessingQueue] Step 3/6: Question Generation...');
      const generatedQuestions = await OpenAIService.generateQuestions(extractedData.raw_text, source.grade_level, analysis.concepts);
      
      for (const question of generatedQuestions) {
        await client.query(
          `INSERT INTO generated_questions (analyzed_content_id, question_text, question_type, options, correct_answer, explanation, difficulty, concept_tags, quality_score, is_valid)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            analyzedContentId,
            question.question_text,
            question.type,
            JSON.stringify(question.options || []),
            question.correct_answer,
            question.explanation,
            question.difficulty,
            JSON.stringify(question.concept_tags || []),
            0.5,
            true
          ]
        );
      }
      console.log(`[ProcessingQueue] ✓ Generated ${generatedQuestions.length} questions`);

      // ============= STEP 4: Quality Check =============
      console.log('[ProcessingQueue] Step 4/6: Quality Check...');
      const qualityResult = await OpenAIService.qualityCheck(generatedQuestions, source.grade_level);
      
      for (const result of qualityResult.results) {
        const qId = result.question_id.replace('q', '');
        await client.query(
          `UPDATE generated_questions SET quality_score = $1, is_valid = $2
           WHERE analyzed_content_id = $3
           LIMIT 1`,
          [result.quality_score, result.is_valid, analyzedContentId]
        );
      }
      console.log(`[ProcessingQueue] ✓ Quality avg: ${qualityResult.average_quality}`);

      // ============= STEP 5: Assembly =============
      console.log('[ProcessingQueue] Step 5/6: Test Assembly...');
      const validQuestions = generatedQuestions.filter((_, i) => qualityResult.results[i]?.is_valid);
      const tests = await TestAssembler.createTests(sourceId, source.user_id, validQuestions, analysis);
      console.log(`[ProcessingQueue] ✓ Tests created: ${tests.quick_test.id} (quick), ${tests.full_test?.id} (full)`);

      // ============= STEP 6: Finalize =============
      console.log('[ProcessingQueue] Step 6/6: Finalizing...');
      await client.query(
        `UPDATE content_sources SET processing_status = $1, processing_completed_at = NOW()
         WHERE id = $2`,
        [' completed', sourceId]
      );
      console.log('[ProcessingQueue] ✓ Processing complete!\n');

      return {
        success: true,
        source_id: sourceId,
        extracted_text_length: extractedData.text_length,
        questions_generated: generatedQuestions.length,
        questions_valid: validQuestions.length,
        tests_created: [tests.quick_test.id, tests.full_test?.id].filter(Boolean)
      };
    } catch (error) {
      console.error('[ProcessingQueue] Error:', error.message);
      
      // Update status to failed
      try {
        await client.query(
          `UPDATE content_sources SET processing_status = $1
           WHERE id = $2`,
          ['failed', sourceId]
        );
      } catch (updateError) {
        console.error('[ProcessingQueue] Failed to update status:', updateError.message);
      }

      throw error;
    } finally {
      client.release();
    }
  }

  // Placeholder für Queue Management (später mit Bull/Bee-Queue)
  static async enqueueProcessing(sourceId) {
    console.log(`[ProcessingQueue] Enqueued: ${sourceId}`);
    
    // TODO: Integrate with job queue (Bull, Bee-Queue, RabbitMQ)
    // For now: Process immediately
    setTimeout(() => {
      this.processContentSource(sourceId).catch(err => {
        console.error(`[ProcessingQueue] Processing failed for ${sourceId}:`, err.message);
      });
    }, 1000);
  }
}

module.exports = ProcessingQueue;