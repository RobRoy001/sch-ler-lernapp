import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, Play } from 'lucide-react';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../config/api';

// Verfolgt den Verarbeitungsfortschritt EINER hochgeladenen Aufgabe
// (Route: /processing/:sourceId). Startet die Verarbeitung und pollt den
// Fortschritt, bis der generierte Test bereit ist.

export default function ProcessingPage() {
  const navigate = useNavigate();
  const { sourceId } = useParams();
  const pollRef = useRef(null);

  const [status, setStatus] = useState('pending'); // pending | processing | completed | error
  const [progress, setProgress] = useState(0);
  const [currentJob, setCurrentJob] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    startProcessing();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sourceId]);

  const startProcessing = async () => {
    setError('');
    try {
      const token = localStorage.getItem('token');

      // Verarbeitung anstoßen (idempotent genug für dieses Mock-Backend -
      // ein erneuter Aufruf während bereits verarbeitet wird, ist unschädlich)
      await fetch(`${API_BASE_URL}/processing/sources/${sourceId}/process`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });

      pollStatus();
      pollRef.current = setInterval(pollStatus, 1000);
    } catch (err) {
      setStatus('error');
      setError('Verarbeitung konnte nicht gestartet werden.');
    }
  };

  const pollStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/processing/sources/${sourceId}/status`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Status konnte nicht abgerufen werden');
      }

      const data = await response.json();
      setStatus(data.status);
      setProgress(data.progress || 0);
      setCurrentJob(data.current_job || '');

      if (data.status === 'completed' && pollRef.current) {
        clearInterval(pollRef.current);
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
      if (pollRef.current) clearInterval(pollRef.current);
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
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Aufgabe wird verarbeitet
          </h1>
        </div>

        <div className="bg-white border border-gray-100 rounded-lg p-8 shadow-sm text-center">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-error-light border border-error/20 rounded-lg mb-6 text-left">
              <AlertTriangle size={18} className="text-error-dark flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error-dark">{error}</p>
            </div>
          )}

          {status !== 'completed' && status !== 'error' && (
            <>
              <div className="mb-6">
                <Clock size={48} className="mx-auto text-primary animate-spin" />
              </div>
              <p className="font-semibold text-gray-900 mb-1">
                {currentJob || 'Deine Aufgabe wird analysiert…'}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Wir erstellen automatisch passende Testfragen. Das dauert nur einen Moment.
              </p>

              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">{progress}%</p>
            </>
          )}

          {status === 'completed' && (
            <div>
              <CheckCircle size={48} className="mx-auto mb-4 text-success" />
              <p className="font-semibold text-gray-900 mb-1">Verarbeitung abgeschlossen!</p>
              <p className="text-sm text-gray-500 mb-6">
                Deine Testfragen sind bereit.
              </p>
              <Link
                to={`/test/${sourceId}`}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md font-semibold transition"
              >
                <Play size={18} />
                Test starten
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
