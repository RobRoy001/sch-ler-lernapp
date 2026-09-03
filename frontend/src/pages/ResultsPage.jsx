import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../config/api';

// Zeigt die Details einer bereits eingereichten Test-Submission
// (Route: /results/:submissionId). TestPlayer zeigt das Ergebnis primär
// direkt nach dem Einreichen an - diese Seite ist für das spätere erneute
// Aufrufen eines Ergebnisses gedacht (z.B. über einen Link im Dashboard).

export default function ResultsPage() {
  const navigate = useNavigate();
  const { submissionId } = useParams();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  const loadSubmission = async () => {
    setLoading(true);
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
    } catch (err) {
      setError(err.message);
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
      </div>
    </div>
  );
}
