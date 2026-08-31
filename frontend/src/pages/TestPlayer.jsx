import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// MultipleChoice Component
function MultipleChoiceQuestion({ question, answer, onAnswer }) {
  // Parse options wenn String
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
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'white' }}>
        {question.question_text}
      </h3>
      <div>
        {options.map((option, idx) => (
          <label key={idx} style={{
            display: 'block',
            marginBottom: '12px',
            cursor: 'pointer',
            padding: '12px',
            border: answer === option ? '2px solid #3b82f6' : '2px solid #475569',
            borderRadius: '8px',
            backgroundColor: answer === option ? '#1e293b' : '#0f172a',
            transition: 'all 0.2s'
          }}>
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option}
              checked={answer === option}
              onChange={(e) => onAnswer(e.target.value)}
              style={{ marginRight: '12px', cursor: 'pointer' }}
            />
            <span style={{ color: '#e2e8f0' }}>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// FillGap Component
function FillGapQuestion({ question, answer, onAnswer }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'white' }}>
        {question.question_text}
      </h3>
      <input
        type="text"
        value={answer || ''}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder="Antworte hier..."
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#1e293b',
          border: '2px solid #475569',
          borderRadius: '8px',
          color: '#e2e8f0',
          fontSize: '16px',
          boxSizing: 'border-box'
        }}
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
          `http://localhost:5000/api/processing/sources/${sourceId}/tests`,
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
          // Initialize answers
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
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div>Lädt Test...</div>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fca5a5'
      }}>
        <div>Fehler: {error || 'Kein Test geladen'}</div>
      </div>
    );
  }

  const questions = test.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?.id] || '';

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Alle Fragen beantwortet - Submit
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
        `http://localhost:5000/api/processing/tests/${test.id}/submit`,
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

      // Redirect to results
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '28px', color: 'white', marginBottom: '8px' }}>
            {test.title}
          </h1>
          <p style={{ color: '#cbd5e1', marginBottom: '16px' }}>
            {test.total_questions} Fragen • {test.difficulty}
          </p>

          {/* Progress Bar */}
          <div style={{
            backgroundColor: '#334155',
            borderRadius: '12px',
            overflow: 'hidden',
            height: '24px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
              height: '100%',
              backgroundColor: '#3b82f6',
              transition: 'width 0.3s ease'
            }}></div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#94a3b8',
            fontSize: '14px'
          }}>
            <span>Frage {currentQuestionIndex + 1} von {questions.length}</span>
            <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
          </div>
        </div>

        {/* Question */}
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #475569',
          borderRadius: '12px',
          padding: '32px',
          marginBottom: '32px'
        }}>
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
                <div style={{
                  marginTop: '24px',
                  padding: '16px',
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  borderLeft: '4px solid #3b82f6',
                  fontSize: '14px',
                  color: '#cbd5e1'
                }}>
                  <strong>Erklärung:</strong> {currentQuestion.explanation}
                </div>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={handleBack}
            disabled={currentQuestionIndex === 0}
            style={{
              padding: '12px 24px',
              backgroundColor: currentQuestionIndex === 0 ? '#334155' : '#475569',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: currentQuestionIndex === 0 ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            ← Zurück
          </button>

          <button
            onClick={handleNext}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              flex: 1,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            {currentQuestionIndex === questions.length - 1 ? 'Abschließen' : 'Weiter →'}
          </button>
        </div>
      </div>
    </div>
  );
}
