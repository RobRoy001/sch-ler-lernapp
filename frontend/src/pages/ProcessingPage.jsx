import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function ProcessingPage() {
  const navigate = useNavigate();
  const { sourceId } = useParams();

  const [status, setStatus] = useState('processing');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Wird verarbeitet...');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!sourceId) {
      navigate('/');
      return;
    }

    // STEP 1: START PROCESSING
    const startProcessing = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('Kein Token!');
          setStatus('error');
          return;
        }

        console.log(`📝 Starte POST /process für Source ${sourceId}`);

        const response = await fetch(
          `https://web-production-adfb70.up.railway.app/api/processing/sources/${sourceId}/process`,
          {
            method: 'POST',
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
        console.log('✅ Processing started:', data);
        setStarted(true);
      } catch (error) {
        console.error('❌ Start Error:', error);
        setStatus('error');
        setMessage(error.message);
      }
    };

    // STEP 2: CHECK STATUS EVERY 2 SECONDS
    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(
          `https://web-production-adfb70.up.railway.app/api/processing/sources/${sourceId}/status`,
          {
            method: 'GET',
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
        console.log('✅ Status:', data.status, 'Progress:', data.progress);

        setStatus(data.status || 'processing');
        setProgress(data.progress || 0);
        setMessage(data.current_job || 'Wird verarbeitet...');

        // Wenn fertig - redirect
        if (data.status === 'completed') {
          console.log('✅ DONE! Redirect zu /test/' + sourceId);
          setTimeout(() => {
            navigate(`/test/${sourceId}`);
          }, 1000);
        }
      } catch (error) {
        console.error('❌ Status Error:', error);
      }
    };

    // Start processing sofort
    startProcessing();

    // Status checken alle 2 Sekunden (nach starten)
    const interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, [sourceId, navigate]);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-5">
      <div className="text-center max-w-md w-full">
        {(status === 'processing' || status === 'pending') && (
          <div>
            <div className="mb-10 flex justify-center">
              <div
                className="w-20 h-20 rounded-full border-4 border-gray-200 border-t-primary animate-spin"
                role="status"
                aria-label="Wird verarbeitet"
              />
            </div>

            <h1 className="font-display text-3xl font-bold text-gray-900 mb-4">
              🔄 Verarbeitung läuft…
            </h1>

            <p className="text-gray-500 mb-8">
              Dein Test wird mit KI vorbereitet…
            </p>

            <div
              className="bg-gray-200 rounded-lg overflow-hidden h-5 mb-4"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-gradient-to-r from-primary to-success rounded-lg transition-all duration-400"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between text-gray-500 text-sm mb-6">
              <span>{progress}%</span>
              <span>{message}</span>
            </div>

            <div className="bg-primary-light/40 border border-primary/20 rounded-md p-4 text-gray-700 text-sm text-left">
              💡 Dies kann einige Minuten dauern – bitte nicht schließen!
            </div>
          </div>
        )}

        {status === 'completed' && (
          <div>
            <div className="mb-10 text-8xl animate-bounceIn">✅</div>
            <h1 className="font-display text-3xl font-bold text-gray-900 mb-4">Fertig! 🎉</h1>
            <p className="text-gray-500 mb-6">Dein Test ist bereit – wird geladen…</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="mb-10 text-8xl">❌</div>
            <h1 className="font-display text-3xl font-bold text-gray-900 mb-4">Fehler!</h1>
            <p className="text-error-dark mb-6">{message}</p>
            <button
              onClick={() => navigate('/upload')}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-md shadow-md transition"
            >
              Zurück zum Upload
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
