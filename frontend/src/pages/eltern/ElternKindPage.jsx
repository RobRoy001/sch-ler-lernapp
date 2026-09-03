import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Logo from '../../components/Logo';
import { API_BASE_URL } from '../../config/api';

// Eltern-Board: Fortschritt eines einzelnen Kindes (Phase 1). Der
// Ownership-Check (darf DIESER Elternteil DIESES Kind sehen) passiert
// serverseitig in backend/src/routes/parent.js - hier wird nur angezeigt,
// was die API zurückgibt.
export default function ElternKindPage() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/parent/children/${childId}/progress`, {
          credentials: 'include'
        });
        if (response.status === 401) {
          navigate('/eltern/login');
          return;
        }
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Fortschritt konnte nicht geladen werden');
        }
        setSubmissions(data.submissions || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [childId, navigate]);

  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/eltern')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm font-medium"
        >
          <ArrowLeft size={18} /> Zurück zur Übersicht
        </button>

        <div className="flex items-center gap-3 mb-8">
          <Logo size={32} />
          <h1 className="font-display text-2xl font-bold text-gray-900">Fortschritt</h1>
        </div>

        {loading && <p className="text-gray-500 text-sm">Wird geladen…</p>}

        {error && (
          <div className="bg-error-light border border-error text-error-dark text-sm p-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {!loading && !error && submissions.length === 0 && (
          <div className="bg-cream border border-gray-100 rounded-lg p-8 text-center">
            <p className="text-gray-500 text-sm">
              Noch keine abgeschlossenen Tests vorhanden.
            </p>
          </div>
        )}

        {!loading && submissions.length > 0 && (
          <div className="space-y-3">
            {submissions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between bg-cream border border-gray-100 rounded-lg p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-success flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 font-semibold">
                      {s.correct_count} / {s.total_questions} richtig
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {new Date(s.submitted_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
                <span className="text-primary font-bold text-sm">
                  {Math.round(s.accuracy)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
