import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import Logo from '../components/Logo';
import DeepeningPanel from '../components/DeepeningPanel';
import AnswerReview from '../components/AnswerReview';
import { API_BASE_URL } from '../config/api';

// Zeigt die Details einer bereits eingereichten Test-Submission
// (Route: /results/:submissionId). TestPlayer zeigt das Ergebnis primär
// direkt nach dem Einreichen an - diese Seite ist für das spätere erneute
// Aufrufen eines Ergebnisses gedacht (z.B. über einen Link im Dashboard),
// UND für die Rückkehr von einem Stripe-Checkout für einen Vertiefungsmodus-
// Einzelkauf (siehe billing.js POST /checkout, success_url für type
// "vertiefung" zeigt hierher zurück, mit ?billing=success&topic=...).

export default function ResultsPage() {
  const navigate = useNavigate();
  const { submissionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const billingBanner = searchParams.get('billing');
  const autoGenerateTopic = billingBanner === 'success' ? searchParams.get('topic') : null;

  // ✅ Fix (2026-09-06): "cameFromCheckout" wird EINMALIG beim allerersten
  // Rendern aus der URL gelesen, nicht aus dem live "billingBanner" oben -
  // DeepeningPanel entfernt ?billing=success/&topic= schon nach dem ersten
  // automatischen "Jetzt vertiefen"-Aufruf wieder (dismissBillingBanner
  // unten), das darf das Nachladen weiter unten nicht vorzeitig stoppen.
  const [cameFromCheckout] = useState(() => searchParams.get('billing') === 'success');

  const dismissBillingBanner = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('billing');
    next.delete('topic');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  // ✅ Fix (2026-09-06): Robert berichtete, dass nach einem Vertiefungsmodus-
  // Kauf zwar das automatisch gestartete Thema freigeschaltet wurde, alle
  // anderen Schwachthemen-Karten desselben Tests aber weiter "2,49 €
  // freischalten" zeigten - obwohl der Kauf laut Datenbank den ganzen Test
  // freischaltet (siehe processing.js computeWeakTopics/loadDeepeningAccess).
  // Ursache: der Stripe-Webhook (checkout.session.completed), der den Kauf
  // erst als "completed" markiert, kann dem Redirect zurück in die App noch
  // hinterherhinken (beobachtet: bis zu ~28 Sekunden) - der einmalige Fetch
  // beim Mount sah den Kauf dann noch als "pending". Deshalb hier nach einer
  // Checkout-Rückkehr das Ergebnis mehrfach neu laden, bis entweder alle
  // Schwachthemen als freigeschaltet zurückkommen oder ein Zeitlimit
  // erreicht ist.
  useEffect(() => {
    if (!cameFromCheckout) return undefined;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 8; // 8 x 4s = 32s, deckt die beobachtete Verzögerung ab

    const poll = async () => {
      if (cancelled) return;
      attempts++;
      const updated = await loadSubmission();
      if (cancelled) return;
      const stillLocked = updated?.weakTopics?.some((t) => !t.unlocked);
      if (stillLocked && attempts < maxAttempts) {
        setTimeout(poll, 4000);
      }
    };

    const timer = setTimeout(poll, 4000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameFromCheckout]);

  const loadSubmission = async () => {
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/processing/submissions/${submissionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include'
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ergebnis konnte nicht geladen werden');
      }

      setSubmission(data.submission);
      return data.submission;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm font-medium"
        >
          <ArrowLeft size={18} /> Zurück zum Dashboard
        </button>

        <div className="flex items-center gap-3 mb-8">
          <Logo size={32} />
          <h1 className="font-display text-2xl font-bold text-gray-900">Testergebnis</h1>
        </div>

        {billingBanner === 'success' && (
          <div className="flex items-start justify-between gap-3 bg-success-light border border-success/30 rounded-lg p-4 mb-6">
            <p className="text-success-dark text-sm">
              Zahlung erfolgreich! Deine Vertiefung wird jetzt erstellt.
            </p>
            <button onClick={dismissBillingBanner} className="text-success-dark/60 hover:text-success-dark flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        )}
        {billingBanner === 'cancel' && (
          <div className="flex items-start justify-between gap-3 bg-gray-100 border border-gray-200 rounded-lg p-4 mb-6">
            <p className="text-gray-600 text-sm">Der Bezahlvorgang wurde abgebrochen, es wurde nichts abgebucht.</p>
            <button onClick={dismissBillingBanner} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-gray-500">Wird geladen…</div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 bg-error-light border border-error/20 rounded-lg">
            <AlertTriangle size={18} className="text-error-dark flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error-dark">{error}</p>
          </div>
        )}

        {submission && (
          <div className="bg-white border border-gray-100 rounded-lg p-8 shadow-sm text-center">
            {submission.accuracy >= 70 ? (
              <CheckCircle size={48} className="mx-auto mb-4 text-success" />
            ) : (
              <XCircle size={48} className="mx-auto mb-4 text-error" />
            )}
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
              {submission.testTitle || 'Test'}
            </h2>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                  Richtig
                </p>
                <p className="font-display text-3xl font-bold text-success">
                  {submission.correctCount}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                  Gesamt
                </p>
                <p className="font-display text-3xl font-bold text-gray-900">
                  {submission.totalQuestions}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                  Erfolgsquote
                </p>
                <p className="font-display text-3xl font-bold text-primary">
                  {submission.accuracy}%
                </p>
              </div>
            </div>
          </div>
        )}

        {submission && <AnswerReview questions={submission.questions} />}

        {submission && (
          <DeepeningPanel
            submissionId={submissionId}
            weakTopics={submission.weakTopics}
            autoGenerateTopic={autoGenerateTopic}
            onAutoGenerateHandled={dismissBillingBanner}
          />
        )}
      </div>
    </div>
  );
}
