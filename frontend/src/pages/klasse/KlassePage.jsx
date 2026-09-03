import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import Logo from '../../components/Logo';
import { API_BASE_URL } from '../../config/api';

// Schüler-Ansicht einer Klasse (Lehrer-Portal Phase 1): Liste der
// Klassenarbeiten dieser Klasse, mit Möglichkeit, eine offene Klassenarbeit
// direkt hier zu bearbeiten. Anders als TestPlayer.jsx (Einzelaufgaben,
// mehrseitig mit Fortschrittsbalken) hier bewusst EINE Seite mit allen
// Fragen zugleich, weil die Mock-Klassenarbeiten aus routes/teacher.js nur
// 3 Fragen haben - eine Seiten-Navigation wäre für 3 Fragen unnötige
// Komplexität.
export default function KlassePage() {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState('');
  const [sources, setSources] = useState([]);
  const [error, setError] = useState('');

  // Aktuell bearbeitete Klassenarbeit (Inline-Quiz), null = Liste anzeigen.
  const [activeTest, setActiveTest] = useState(null);
  const [activeSourceId, setActiveSourceId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const myClassesResponse = await fetch(`${API_BASE_URL}/auth/my-classes`, {
        credentials: 'include'
      });
      const myClassesData = await myClassesResponse.json();
      if (myClassesResponse.ok) {
        const match = (myClassesData.classes || []).find((c) => String(c.id) === String(classId));
        if (match) setClassName(match.name);
      }

      const sourcesResponse = await fetch(`${API_BASE_URL}/classes/${classId}/sources`, {
        credentials: 'include'
      });
      const sourcesData = await sourcesResponse.json();
      if (!sourcesResponse.ok) {
        throw new Error(sourcesData.error || 'Klassenarbeiten konnten nicht geladen werden');
      }
      setSources(sourcesData.sources || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (sourceId) => {
    setTestError('');
    setResult(null);
    setTestLoading(true);
    setActiveSourceId(sourceId);
    try {
      const response = await fetch(`${API_BASE_URL}/classes/${classId}/sources/${sourceId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Test konnte nicht geladen werden');

      const test = data.test;
      if (Array.isArray(test.questions)) {
        test.questions = test.questions.map((q) => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        }));
      }
      setActiveTest(test);

      const initialAnswers = {};
      (test.questions || []).forEach((q) => {
        initialAnswers[q.id] = '';
      });
      setAnswers(initialAnswers);
    } catch (err) {
      setTestError(err.message);
    } finally {
      setTestLoading(false);
    }
  };

  const handleCancelTest = () => {
    setActiveTest(null);
    setActiveSourceId(null);
    setAnswers({});
    setTestError('');
    setResult(null);
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTestError('');
    setSubmitting(true);
    try {
      const payload = (activeTest.questions || []).map((q) => ({
        question_id: q.id,
        answer: answers[q.id] || ''
      }));

      // ✅ Sicherheitsaudit Kritisch #4: Bewertung passiert serverseitig
      // (siehe backend/src/routes/classes.js) - hier wird nur die rohe
      // Antwort gesendet, nie ein selbst berechnetes Ergebnis.
      const response = await fetch(
        `${API_BASE_URL}/classes/${classId}/sources/${activeSourceId}/submit`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: payload })
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Test konnte nicht eingereicht werden');

      setResult(data.submission);
      await loadData();
    } catch (err) {
      setTestError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="text-gray-500 font-body">Wird geladen…</p>
      </div>
    );
  }

  // Inline-Quiz aktiv
  if (activeSourceId) {
    return (
      <div className="min-h-screen bg-canvas px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleCancelTest}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm font-medium"
          >
            <ArrowLeft size={18} /> Zurück zur Klasse
          </button>

          {testLoading ? (
            <div className="text-center py-12 text-gray-500">
              <Clock size={32} className="mx-auto mb-2 animate-spin" />
              <p>Wird geladen…</p>
            </div>
          ) : testError && !activeTest ? (
            <div className="flex items-start gap-3 p-4 bg-error-light border border-error/20 rounded-lg">
              <AlertTriangle size={18} className="text-error-dark flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error-dark">{testError}</p>
            </div>
          ) : result ? (
            <div className="bg-white border border-gray-100 rounded-lg p-8 shadow-sm text-center">
              <CheckCircle size={56} className="mx-auto text-success mb-4" />
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">
                Klassenarbeit abgeschickt!
              </h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                    Richtig
                  </p>
                  <p className="font-display text-3xl font-bold text-success">
                    {result.correctCount}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                    Gesamt
                  </p>
                  <p className="font-display text-3xl font-bold text-gray-900">
                    {result.totalQuestions}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                    Erfolgsquote
                  </p>
                  <p className="font-display text-3xl font-bold text-primary">
                    {result.accuracy}%
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelTest}
                className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md font-semibold transition"
              >
                Zurück zur Klasse
              </button>
            </div>
          ) : (
            activeTest && (
              <form onSubmit={handleSubmit}>
                <div className="flex items-center gap-3 mb-6">
                  <Logo size={28} />
                  <h1 className="font-display text-xl font-bold text-gray-900">
                    {activeTest.title}
                  </h1>
                </div>

                {testError && (
                  <div className="flex items-start gap-3 p-4 bg-error-light border border-error/20 rounded-lg mb-6">
                    <AlertTriangle size={18} className="text-error-dark flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-error-dark">{testError}</p>
                  </div>
                )}

                <div className="space-y-6 mb-6">
                  {(activeTest.questions || []).map((q, idx) => (
                    <div
                      key={q.id}
                      className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm"
                    >
                      <h2 className="font-semibold text-gray-900 mb-4">
                        {idx + 1}. {q.question_text}
                      </h2>

                      {q.type === 'multiple_choice' && Array.isArray(q.options) ? (
                        <div className="space-y-2">
                          {q.options.map((option, oIdx) => (
                            <label
                              key={oIdx}
                              className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${
                                answers[q.id] === option
                                  ? 'border-primary bg-primary/5'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question_${q.id}`}
                                value={option}
                                checked={answers[q.id] === option}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                className="w-4 h-4"
                              />
                              <span className="text-gray-900 text-sm font-medium">{option}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={answers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          placeholder="Deine Antwort…"
                          className="w-full h-11 px-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-success hover:bg-success-dark text-white px-6 py-3 rounded-md font-semibold transition disabled:opacity-60"
                >
                  {submitting ? 'Wird eingereicht…' : 'Klassenarbeit abschicken ✓'}
                </button>
              </form>
            )
          )}
        </div>
      </div>
    );
  }

  // Liste der Klassenarbeiten
  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm font-medium"
        >
          <ArrowLeft size={18} /> Zurück zu meinen Klassen
        </button>

        <div className="flex items-center gap-3 mb-8">
          <Logo size={32} />
          <h1 className="font-display text-2xl font-bold text-gray-900">
            {className || 'Klasse'}
          </h1>
        </div>

        {error && (
          <div className="bg-error-light border border-error text-error-dark text-sm p-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {sources.length === 0 ? (
          <div className="bg-cream border border-gray-100 rounded-lg p-8 text-center">
            <p className="text-gray-500 text-sm">
              Deine Lehrkraft hat noch keine Klassenarbeit für diese Klasse hochgeladen.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900">{source.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{source.questionCount} Fragen</p>
                  {source.completed && source.lastResult && (
                    <p className="text-xs text-success font-semibold mt-1">
                      ✓ Erledigt · {source.lastResult.correctCount}/{source.lastResult.totalQuestions} ·{' '}
                      {source.lastResult.accuracy}%
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleStartTest(source.id)}
                  className={`px-4 py-2 rounded-md font-semibold text-sm transition ${
                    source.completed
                      ? 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'
                      : 'bg-primary hover:bg-primary-dark text-white'
                  }`}
                >
                  {source.completed ? 'Nochmal ansehen' : 'Test starten'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
