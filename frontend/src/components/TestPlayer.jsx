import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/TestPlayer.css';

export default function TestPlayer() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Load test on mount
  useEffect(() => {
    const loadTest = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `http://localhost:5000/api/processing/tests/${testId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (!response.ok) throw new Error('Test nicht gefunden');

        const data = await response.json();
        setTest(data.test || data);

        // Initialize userAnswers object
        const answers = {};
        if (data.test?.questions || data.questions) {
          (data.test?.questions || data.questions).forEach((q, idx) => {
            answers[idx] = '';
          });
        }
        setUserAnswers(answers);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadTest();
  }, [testId]);

  if (loading) return <div className="test-container"><p>Test wird geladen...</p></div>;
  if (error) return <div className="test-container"><p className="error">Fehler: {error}</p></div>;
  if (!test || !test.questions) return <div className="test-container"><p>Test nicht gefunden</p></div>;

  const questions = test.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion) return <div className="test-container"><p>Frage nicht gefunden</p></div>;

  // ✅ FIX #1: Handle answer selection
  const handleAnswerChange = (value) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: value
    }));
  };

  // ✅ FIX #2: Calculate correct answers (echte Vergleiche!)
  const calculateScore = () => {
    let correctCount = 0;

    questions.forEach((question, index) => {
      const userAnswer = userAnswers[index];
      const correctAnswer = question.correct_answer;

      // WICHTIG: Echte Vergleiche mit verschiedenen Question-Types
      if (question.type === 'multiple_choice') {
        // Radio-Button: direkter Vergleich
        if (userAnswer === correctAnswer) {
          correctCount++;
        }
      } else if (question.type === 'fill_gap') {
        // Lückentext: Case-insensitive Vergleich
        if (userAnswer?.toLowerCase?.() === correctAnswer?.toLowerCase?.()) {
          correctCount++;
        }
      } else if (question.type === 'vocabulary') {
        // Vokabel: direkter Vergleich
        if (userAnswer === correctAnswer) {
          correctCount++;
        }
      } else if (question.type === 'short_answer') {
        // Kurzantwort: Fuzzy Matching (60%+ ähnlich = richtig)
        const similarity = calculateSimilarity(userAnswer, correctAnswer);
        if (similarity >= 0.6) {
          correctCount++;
        }
      }
    });

    return correctCount;
  };

  // Fuzzy Matching für Short Answers (Levenshtein Distance)
  const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  const getEditDistance = (s1, s2) => {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };

  // ✅ FIX #3: Submit test with correct scoring
  const submitTest = async () => {
    setIsSubmitting(true);
    try {
      const correctCount = calculateScore();
      const totalQuestions = questions.length;
      const accuracy = Math.round((correctCount / totalQuestions) * 100);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/processing/tests/${testId}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            answers: userAnswers,           // Alle Benutzer-Antworten
            correctCount: correctCount,      // ✅ ECHTE Anzahl richtig
            totalQuestions: totalQuestions,
            accuracy: accuracy,              // ✅ ECHTE Prozentquote
            timeTaken: Math.round(Date.now() / 1000), // Zeit in Sekunden
          })
        }
      );

      if (!response.ok) {
        throw new Error('Test-Einreichung fehlgeschlagen');
      }

      const result = await response.json();

      // Navigate to Results Page mit Score
      navigate(`/results/${testId}`, {
        state: {
          correctCount,
          totalQuestions,
          accuracy,
          test: test
        }
      });

    } catch (err) {
      setError('Fehler beim Einreichen des Tests: ' + err.message);
      setIsSubmitting(false);
    }
  };

  // Handle Navigation
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Render Question Component
  const renderQuestion = () => {
    const q = currentQuestion;
    const answer = userAnswers[currentQuestionIndex];

    if (q.type === 'multiple_choice') {
      return (
        <div className="question-content">
          <p className="question-text">{q.question}</p>
          <div className="options">
            {q.options?.map((option, idx) => (
              <label key={idx} className="option">
                <input
                  type="radio"
                  name="answer"
                  value={idx.toString()}
                  checked={answer === idx.toString()}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      );
    } else if (q.type === 'fill_gap') {
      return (
        <div className="question-content">
          <p className="question-text">{q.question}</p>
          <input
            type="text"
            className="answer-input"
            value={answer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder="Antwort eingeben..."
            autoFocus
          />
        </div>
      );
    } else if (q.type === 'short_answer') {
      return (
        <div className="question-content">
          <p className="question-text">{q.question}</p>
          <textarea
            className="answer-input"
            value={answer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder="Schreibe deine Antwort..."
            rows="4"
            autoFocus
          />
        </div>
      );
    }

    return <p>Unbekannte Frage-Type: {q.type}</p>;
  };

  return (
    <div className="test-player">
      <div className="test-header">
        <h1>Test: {test.title || 'Frage-Test'}</h1>
        <div className="progress">
          Frage {currentQuestionIndex + 1} von {questions.length}
        </div>
      </div>

      <div className="test-content">
        {renderQuestion()}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="test-navigation">
        <button
          className="btn-prev"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          ← Zurück
        </button>

        <div className="question-counter">
          {currentQuestionIndex + 1} / {questions.length}
        </div>

        {currentQuestionIndex === questions.length - 1 ? (
          <button
            className="btn-submit"
            onClick={submitTest}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Wird eingereicht...' : 'Test einreichen'}
          </button>
        ) : (
          <button
            className="btn-next"
            onClick={handleNext}
          >
            Weiter →
          </button>
        )}
      </div>

      <div className="answered-counter">
        Beantwortet: {Object.values(userAnswers).filter(a => a !== '').length} / {questions.length}
      </div>
    </div>
  );
}
