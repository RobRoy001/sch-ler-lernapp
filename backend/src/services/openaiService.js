const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generiere Fragen mit GPT-4o-mini (kostenoptimiert!)
 */
async function generateQuestionsFromContent(content, difficulty = 'medium', count = 5) {
  try {
    console.log(`🤖 Generiere ${count} ${difficulty} Fragen mit GPT-4o-mini...`);

    const prompt = `Du bist ein Deutschlehrer und erstellst hochwertige Testfragen für Schüler.

INHALTE ZUM LERNEN:
${content}

AUFGABE:
Erstelle ${count} Testfragen zum obigen Inhalt.
Schwierigkeitsgrad: ${difficulty}
Sprache: Deutsch (altersgerecht)

WICHTIG:
- 60% Multiple Choice (4 Optionen)
- 40% Fill-the-Gap (Lückentexte)
- Kurze, prägnante Erklärungen
- Antworten sind eindeutig
- Motivierende Tonalität

ANTWORT FORMAT - NUR REINES JSON:
[
  {
    "question_text": "Was ist die Hauptstadt von Frankreich?",
    "type": "multiple_choice",
    "options": ["Paris", "Lyon", "Marseille", "Toulouse"],
    "correct_answer": "Paris",
    "explanation": "Paris ist seit Jahrhunderten die Hauptstadt Frankreichs."
  },
  {
    "question_text": "Die Formel für die Fläche eines Rechtecks ist A = Länge × ___",
    "type": "fill_gap",
    "correct_answer": "Breite",
    "explanation": "Die Fläche berechnet sich aus Länge multipliziert mit Breite."
  }
]`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      top_p: 0.9
    });

    const responseText = response.choices[0].message.content;
    console.log('🤖 OpenAI Response erhalten');

    // Parse JSON
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('❌ Kein JSON im Response:', responseText);
      throw new Error('Keine gültigen Fragen im GPT Response');
    }

    const questions = JSON.parse(jsonMatch[0]);
    
    const validatedQuestions = questions.map(q => ({
      question_text: q.question_text || 'Fehler',
      type: q.type === 'fill_gap' ? 'fill_gap' : 'multiple_choice',
      options: q.type === 'multiple_choice' ? q.options : null,
      correct_answer: q.correct_answer || '',
      explanation: q.explanation || 'Siehe Antwort'
    }));

    console.log(`✅ ${validatedQuestions.length} Fragen generiert!`);
    return validatedQuestions;

  } catch (error) {
    console.error('❌ OpenAI Error:', error.message);
    throw error;
  }
}

/**
 * Analysiere Content mit GPT-4o-mini
 */
async function analyzeContent(content) {
  try {
    console.log('🤖 Analysiere Inhalt mit GPT-4o-mini...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Analysiere diesen Text schnell und gib JSON zurück:

TEXT:
${content.substring(0, 500)}

Antworte NUR mit JSON, kein anderer Text:
{
  "topics": ["Thema1", "Thema2", "Thema3"],
  "difficulty": "medium",
  "estimatedTime": 10
}`
        }
      ],
      temperature: 0.5,
      max_tokens: 300
    });

    const responseText = response.choices[0].message.content;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return {
        topics: ['Allgemeines Thema'],
        difficulty: 'medium',
        estimatedTime: 10
      };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('❌ Analysis Error:', error.message);
    return {
      topics: ['Allgemeines Thema'],
      difficulty: 'medium',
      estimatedTime: 10
    };
  }
}

module.exports = {
  generateQuestionsFromContent,
  analyzeContent
};