import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// MultipleChoice Component
function MultipleChoiceQuestion({ question, answer, onAnswer }) {
  let options = [];
  try {
    if (typeof question.options === 'string') {
      options = JSON.parse(question.options);
    } else if (Array.isArray(question.options)) {
      options = question.options;
    }
  } catch (e) {
    console.error('Error parsing options:', e);
    options = [];
  }

  return (
    <div className="mb-6">
      <h3 className="font-display text-lg font-semibold text-gray-900 mb-4">
        {question.question_text}
      </h3>
      <div>
        {options.map((option, idx) => (
          <label
            key={idx}
            className={`block mb-3 cursor-pointer p-3.5 rounded-md border-2 transition ${
              answer === option
                ? 'border-primary bg-primary-light/40'
                : 'border-gray-200 bg-white hover:border-primary/40'
            }`}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option}
              checked={answer === option}
              onChange={(e) => onAnswer(e.target.value)}
              className="mr-3 accent-primary cursor-pointer"
            />
            <span className="text-gray-800">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// FillGap Component
function FillGapQuestion({ question, answer, onAnswer }) {
  return (
    <div className="mb-6">
      <h3 className="font-display text-lg font-semibold text-gray-900 mb-4">
        {question.question_text}
      </h3>
      <input
        type="text"
        value={answer || ''}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder="Antworte hier..."
        className="w-full h-11 px-4 bg-white border-2 border-gray-200 rounded-md text-gray-900 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
      />
    </div>
  );
}

// Main TestPlayer Component
export default function TestPlayer() {
  const navigate = useNavigate();
  const { sourceId } = useParams();

  const [test, setTest] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    const fetchTest = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(
          `https://web-production-adfb70.up.railway.app/api/processing/sources/${sourceId}/tests`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('Tests loaded:', data);

        if (data.tests && data.tests.length > 0) {
          setTest(data.tests[0]);
          const initialAnswers = {};
          data.tests[0].questions?.forEach(q => {
            initialAnswers[q.id] = '';
          });
          setAnswers(initialAnswers);
        } else {
          setError('Kein Test gefunden');
        }
      } catch (err) {
        console.error('Fehler beim Laden:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [sourceId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center text-gray-500">
        Lädt Test…
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center text-error-dark">
        Fehler: {error || 'Kein Test geladen'}
      </div>
    );
  }

  const questions = test.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?.id] || '';
  const progressPct = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      submitTest();
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitTest = async () => {
    try {
      const token = localStorage.getItem('token');
      const answerArray = questions.map((q, idx) => ({
        question_id: q.id,
        answer: answers[q.id] || '',
        is_correct: checkAnswer(q, answers[q.id])
      }));

      console.log('Submitting answers:', answerArray);

      const response = await fetch(
        `https://web-production-adfb70.up.railway.app/api/processing/tests/${test.id}/submit`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ answers: answerArray })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('Test Result:', result);

      navigate(`/results/${test.id}`, {
        state: {
          score: result.score,
          totalPoints: result.total_points,
          accuracy: result.accuracy_percentage,
          message: result.message
        }
      });
    } catch (err) {
      console.error('Submit Error:', err);
      alert('Fehler beim Absenden: ' + err.message);
    }
  };

  const checkAnswer = (question, userAnswer) => {
    if (!userAnswer) return false;
    const correctAnswer = question.correct_answer;
    return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
  };

  return (
    <div className="min-h-screen bg-canvas py-10 px-5">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">
            {test.title}
          </h1>
          <p className="text-gray-500 mb-4">
            {test.total_questions} Fragen • {test.difficulty}
          </p>

          {/* Progress Bar */}
          <div
            className="bg-gray-200 rounded-lg overflow-hidden h-3 mb-3"
            role="progressbar"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-primary rounded-lg transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex justify-between text-gray-500 text-sm">
            <span>Frage {currentQuestionIndex + 1} von {questions.length}</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
        </div>

        {/* Question */}
        <div className="bg-cream border border-gray-100 rounded-lg p-6 md:p-8 mb-8 shadow-sm">
          {currentQuestion && (
            <>
              {currentQuestion.type === 'multiple_choice' && (
                <MultipleChoiceQuestion
                  question={currentQuestion}
                  answer={currentAnswer}
                  onAnswer={(value) => setAnswers({
                    ...answers,
                    [currentQuestion.id]: value
                  })}
                />
              )}

              {currentQuestion.type === 'fill_gap' && (
                <FillGapQuestion
                  question={currentQuestion}
                  answer={currentAnswer}
                  onAnswer={(value) => setAnswers({
                    ...answers,
                    [currentQuestion.id]: value
                  })}
                />
              )}

              {currentQuestion.explanation && (
                <div className="mt-6 p-4 bg-primary-light/30 rounded-md border-l-4 border-primary text-sm text-gray-700">
                  <strong>Erklärung:</strong> {currentQuestion.explanation}
                </div>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 justify-between">
          <button
            onClick={handleBack}
            disabled={currentQuestionIndex === 0}
            className={`px-6 py-3 rounded-md font-semibold transition ${
              currentQuestionIndex === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ← Zurück
          </button>

          <button
            onClick={handleNext}
            className="flex-1 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md font-semibold shadow-md hover:shadow-lg transition"
          >
            {currentQuestionIndex === questions.length - 1 ? 'Abschließen' : 'Weiter →'}
          </button>
        </div>
      </div>
    </div>
  );
}
