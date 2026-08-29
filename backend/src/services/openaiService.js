// src/services/openaiService.js - OpenAI API Integration

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class OpenAIService {
  static async analyzeContent(rawText, gradeLevel = 9) {
    try {
      console.log('[OpenAI] Analyzing content...');

      const prompt = `Analyze the following educational content for grade ${gradeLevel} students.
Extract:
1. Key concepts (max 8)
2. Difficulty level (easy/medium/hard)
3. Relevant topics/subjects (max 5)
4. Brief summary (max 100 words)
5. Key points (max 5)

Content:
${rawText}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "concepts": [{"name": "concept name", "relevance": 0.8, "difficulty": "medium"}, ...],
  "topics": ["topic1", "topic2"],
  "difficulty_level": "medium",
  "summary": "Brief summary...",
  "key_points": ["point1", "point2"]
}`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      });

      let content = response.choices[0].message.content.trim();
      
      // Remove markdown code blocks if present
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const analysis = JSON.parse(content);
      console.log('[OpenAI] Analysis complete');
      
      return analysis;
    } catch (error) {
      console.error('[OpenAI] Analysis Error:', error.message);
      throw new Error(`Content analysis failed: ${error.message}`);
    }
  }

  static async generateQuestions(rawText, gradeLevel = 9, concepts = []) {
    try {
      console.log('[OpenAI] Generating questions...');

      const prompt = `Generate 8 educational questions based on this content for grade ${gradeLevel} students.
Create different question types (distribute evenly):
- Multiple Choice (3-4 questions)
- Fill in the Gap (2 questions)
- Vocabulary/Matching (1 question)
- Short Answer (1-2 questions)

Requirements:
- Questions must be clear and unambiguous
- Multiple choice: 4 plausible options
- Include explanations for correct answers
- Vary difficulty: some easy, some medium, some hard
- Age-appropriate for grade ${gradeLevel}

Content:
${rawText}

Return ONLY valid JSON (no markdown):
{
  "questions": [
    {
      "id": "q1",
      "question_text": "...",
      "type": "multiple_choice",
      "difficulty": "easy",
      "options": [
        {"text": "option A", "is_correct": false},
        {"text": "option B", "is_correct": true},
        {"text": "option C", "is_correct": false},
        {"text": "option D", "is_correct": false}
      ],
      "correct_answer": "option B",
      "explanation": "Explanation why this is correct...",
      "concept_tags": ["concept1", "concept2"]
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      });

      let content = response.choices[0].message.content.trim();
      
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const result = JSON.parse(content);
      console.log(`[OpenAI] Generated ${result.questions.length} questions`);
      
      return result.questions;
    } catch (error) {
      console.error('[OpenAI] Generation Error:', error.message);
      throw new Error(`Question generation failed: ${error.message}`);
    }
  }

  static async qualityCheck(questions, gradeLevel = 9) {
    try {
      console.log('[OpenAI] Quality checking questions...');

      const prompt = `Quality check these educational questions for grade ${gradeLevel} students.
For each question, evaluate:
1. Clarity: Is the question clear and unambiguous?
2. Correctness: Is the answer actually correct?
3. Appropriateness: Is it age-appropriate for grade ${gradeLevel}?
4. Uniqueness: Is it different from other questions?
5. Difficulty: Is stated difficulty accurate?

Questions:
${JSON.stringify(questions, null, 2)}

Return ONLY valid JSON:
{
  "results": [
    {
      "question_id": "q1",
      "quality_score": 0.85,
      "is_valid": true,
      "feedback": "Clear question with good options",
      "issues": []
    }
  ],
  "average_quality": 0.85
}`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      let content = response.choices[0].message.content.trim();
      
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const result = JSON.parse(content);
      console.log(`[OpenAI] Quality check complete (avg: ${result.average_quality})`);
      
      return result;
    } catch (error) {
      console.error('[OpenAI] Quality Check Error:', error.message);
      throw new Error(`Quality check failed: ${error.message}`);
    }
  }
}

module.exports = OpenAIService;