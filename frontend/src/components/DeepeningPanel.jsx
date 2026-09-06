import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Lock } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

// ✅ Vertiefungsmodus (2026-09-06, siehe claude/LernApp-Preismodell-Nachhilfe-
// Klassenmodell-2026-09-02.md Abschnitt 4). Zeigt pro erkanntem Schwachthema
// (backend: computeWeakTopics in routes/processing.js) entweder einen
// "Jetzt vertiefen"-Button (Pro-Abo oder schon gekauft) oder einen
// "2,49 € freischalten"-Button (Free, noch nicht gekauft). Wird sowohl
// direkt nach dem Test (TestPlayer.jsx) als auch beim späteren erneuten
// Aufruf des Ergebnisses (ResultsPage.jsx) verwendet.

function PracticeQuiz({ deepeningId, questions }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = questions.map((q) => ({ question_id: q.id, answer: answers[q.id] || '' }));
      const response = await fetch(`${API_BASE_URL}/deepening/${deepeningId}/retest`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Nachtest konnte nicht ausgewertet werden');
      setResult(data.retest);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="bg-success-light border border-success/30 rounded-lg p-4 mt-4">
        <p className="text-success-dark font-semibold text-sm">
          Nachtest: {result.correctCount} von {result.totalQuestions} richtig ({result.accuracy}%)
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {questions.map((q, idx) => (
        <div key={q.id} className="bg-white border border-gray-100 rounded-md p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">
            {idx + 1}. {q.question_text}
          </p>
          <div className="space-y-2">
            {(q.options || []).map((opt, i) => (
              <label
                key={i}
                className={`flex items-center gap-2 p-2.5 border rounded-md cursor-pointer text-sm transition ${
                  answers[q.id] === opt ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={`deepen_q_${q.id}`}
                  checked={answers[q.id] === opt}
                  onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                  className="w-4 h-4"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}
      {error && <p className="text-error-dark text-sm">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="bg-success hover:bg-success-dark text-white px-5 py-2.5 rounded-md font-semibold text-sm transition disabled:opacity-60"
      >
        {submitting ? 'Wird ausgewertet…' : 'Nachtest abschicken'}
      </button>
    </div>
  );
}

function TopicCard({ submissionId, weakTopic, autoGenerate, onAutoGenerateHandled }) {
  const [deepening, setDeepening] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/deepening/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, topic: weakTopic.topic })
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 402) {
          setError('Die Zahlung wird noch verarbeitet - bitte in ein paar Sekunden erneut versuchen.');
          return;
        }
        throw new Error(data.error || 'Vertiefung konnte nicht geladen werden');
      }
      setDeepening(data.deepening);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [submissionId, weakTopic.topic]);

  useEffect(() => {
    if (autoGenerate) {
      generate();
      onAutoGenerateHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate]);

  const handleUnlock = async () => {
    setCheckoutLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/billing/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'vertiefung', topic: weakTopic.topic, submissionId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout konnte nicht gestartet werden');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-gray-900 font-semibold text-sm">{weakTopic.topic}</p>
          <p className="text-gray-500 text-xs mt-0.5">
            {weakTopic.wrongCount} von {weakTopic.totalCount} Fragen falsch
          </p>
        </div>
        {!deepening &&
          (weakTopic.unlocked ? (
            <button
              onClick={generate}
              disabled={loading}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md font-semibold text-sm transition disabled:opacity-60"
            >
              <Sparkles size={15} />
              {loading ? 'Wird erstellt…' : 'Jetzt vertiefen'}
            </button>
          ) : (
            <button
              onClick={handleUnlock}
              disabled={checkoutLoading}
              className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-md font-semibold text-sm transition disabled:opacity-60"
            >
              <Lock size={15} />
              {checkoutLoading ? 'Wird geöffnet…' : 'Für 2,49 € freischalten'}
            </button>
          ))}
      </div>

      {error && <p className="text-error-dark text-sm mt-3">{error}</p>}

      {deepening && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-gray-700 text-sm whitespace-pre-line">{deepening.explanation}</p>
          {deepening.retestCompletedAt ? (
            <div className="bg-success-light border border-success/30 rounded-lg p-4 mt-4">
              <p className="text-success-dark font-semibold text-sm">
                Nachtest bereits gemacht: {deepening.retestCorrectCount} von {deepening.retestTotal} richtig
              </p>
            </div>
          ) : (
            <PracticeQuiz deepeningId={deepening.id} questions={deepening.practiceQuestions} />
          )}
        </div>
      )}
    </div>
  );
}

export default function DeepeningPanel({ submissionId, weakTopics, autoGenerateTopic, onAutoGenerateHandled }) {
  if (!weakTopics || weakTopics.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">
        <Sparkles size={14} /> Vertiefungsmodus – erkannte Schwachthemen
      </h3>
      <div className="space-y-4">
        {weakTopics.map((wt) => (
          <TopicCard
            key={wt.topic}
            submissionId={submissionId}
            weakTopic={wt}
            autoGenerate={autoGenerateTopic === wt.topic}
            onAutoGenerateHandled={onAutoGenerateHandled}
          />
        ))}
      </div>
    </div>
  );
}
