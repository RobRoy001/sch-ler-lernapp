import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../config/api';

// Hinweis: im aktuellen Backend (processing.js, Mock-Testgenerierung)
// entspricht die Test-Id der Source-Id - ein Test wird also über
// GET /processing/sources/:sourceId/tests geladen und über
// POST /processing/tests/:testId/submit (testId === sourceId) eingereicht.

export default function TestPlayer({ user }) {
  const navigate = useNavigate();
  const { sourceId } = useParams();

  const [test, setTest] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    loadTest();
  }, [sourceId]);

  const loadTest = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/processing/sources/${sourceId}/tests`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Test konnte nicht geladen werden. Ist die Verarbeitung schon abgeschlossen?');
      }

      const data = await response.json();
      const loadedTest = (data.tests && data.tests[0]) || null;

      if (loadedTest && Array.isArray(loadedTest.questions)) {
        // options kommt vom Backend als JSON-String (JSONB Feld) - hier geparst
        loadedTest.questions = loadedTest.questions.map((q) => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        }));
      }

      setTest(loadedTest);

      const initialAnswers = {};
      (loadedTest?.questions || []).forEach((q) => {
        initialAnswers[q.id] = '';
      });
      setUserAnswers(initialAnswers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const questions = test?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  const handleAnswerChange = (value) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  const handleNext = () => {
    if (!isLastQuestion) setCurrentQuestionIndex(prev => prev + 1);
  };

  const handlePrevious = () => {
    if (!isFirstQuestion) setCurrentQuestionIndex(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const timeTaken = Math.round((Date.now() - startTime) / 1000);

      const answers = questions.map((q) => ({
        question_id: q.id,
        answer: userAnswers[q.id] || ''
      }));

      // ✅ Sicherheitsaudit Kritisch #4: die Bewertung passiert serverseitig
      // (der Client sendet nur die rohen Antworten, nie ein selbst
      // berechnetes Ergebnis) - siehe backend/src/routes/processing.js
      const response = await fetch(
        `${API_BASE_URL}/processing/tests/${sourceId}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ answers, timeTaken }),
          credentials: 'include'
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Test konnte nicht eingereicht werden');
      }

      setResults({
        totalQuestions: data.submission.totalQuestions,
        correctAnswers: data.submission.correctCount,
        accuracy: data.submission.accuracy
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas px-4 py-8">
        <div className="max-w-3xl mx-auto text-center py-12 text-gray-500">
          <div className="animate-spin mb-4 inline-block">
            <RotateCcw size={32} />
          </div>
          <p>Wird geladen…</p>
        </div>
      </div>
    );
  }

  if (!submitted) {
    return (
      <div className="min-h-screen bg-canvas px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate('/processing')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm font-medium"
          >
            <ArrowLeft size={18} /> Zurück
          </button>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-error-light border border-error/20 rounded-lg mb-6">
              <AlertTriangle size={18} className="text-error-dark flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error-dark">{error}</p>
            </div>
          )}

          {questions.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-lg p-12 text-center shadow-sm">
              <AlertTriangle size={32} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 font-semibold">Keine Fragen verfügbar</p>
              <p className="text-sm text-gray-500 mt-2">
                Diese Aufgabe hat noch keine Fragen. Bitte versuche es später erneut.
              </p>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900">
                    Frage {currentQuestionIndex + 1} von {questions.length}
                  </p>
                  <p className="text-xs text-gray-500">
                    {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
                  </p>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`
                    }}
                  />
                </div>
              </div>

              {/* Question Card */}
              <div className="bg-white border border-gray-100 rounded-lg p-8 shadow-sm mb-6">
                <h2 className="font-display text-xl font-bold text-gray-900 mb-6">
                  {currentQuestion?.question_text || 'Frage'}
                </h2>

                {/* Question Type: Multiple Choice */}
                {currentQuestion?.type === 'multiple_choice' && Array.isArray(currentQuestion?.options) && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${
                          userAnswers[currentQuestion.id] === option
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question_${currentQuestion.id}`}
                          value={option}
                          checked={userAnswers[currentQuestion.id] === option}
                          onChange={(e) => handleAnswerChange(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-gray-900 font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Question Type: Lückentext / Freitext */}
                {(currentQuestion?.type === 'fill_gap' || currentQuestion?.type === 'short_answer') && (
                  <div>
                    <input
                      type="text"
                      value={userAnswers[currentQuestion.id]}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      placeholder="Deine Antwort…"
                      className="w-full h-11 px-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Gib eine kurze Antwort ein
                    </p>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-3 justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={isFirstQuestion}
                  className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-md font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  ← Zurück
                </button>

                {isLastQuestion ? (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-success hover:bg-success-dark text-white px-6 py-3 rounded-md font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Wird eingereicht…' : 'Test abschließen ✓'}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md font-semibold transition"
                  >
                    Weiter →
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Results Screen
  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white border border-gray-100 rounded-lg p-8 shadow-sm text-center mb-6">
          <div className="mb-6">
            {results.accuracy >= 70 ? (
              <CheckCircle size={64} className="mx-auto text-success mb-4" />
            ) : (
              <XCircle size={64} className="mx-auto text-error mb-4" />
            )}
          </div>

          <h2 className="font-display text-3xl font-bold text-gray-900 mb-2">
            Test abgeschlossen!
          </h2>
          <p className="text-gray-600 mb-6">
            {results.accuracy >= 70
              ? 'Gute Leistung! Du hast das Thema gut verstanden.'
              : 'Gutes Lernen! Hier sind Möglichkeiten zur Verbesserung.'}
          </p>

          {/* Score Display */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                Richtig
              </p>
              <p className="font-display text-3xl font-bold text-success">
                {results.correctAnswers}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                Gesamt
              </p>
              <p className="font-display text-3xl font-bold text-gray-900">
                {results.totalQuestions}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                Erfolgsquote
              </p>
              <p className="font-display text-3xl font-bold text-primary">
                {results.accuracy}%
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/processing')}
              className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-md font-semibold transition"
            >
              Andere Aufgaben
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md font-semibold transition"
            >
              Zum Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
