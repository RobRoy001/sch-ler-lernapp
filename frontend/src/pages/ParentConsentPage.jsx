import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { LogoWithText } from '../components/Logo';
import { API_BASE_URL } from '../config/api';

// Sicherheitsaudit Kritisch #5 (Art. 8 DSGVO): diese Seite ist das Ziel des
// Links aus der Eltern-Email (siehe backend/src/config/email.js - im
// Mock-Modus landet der Link nicht wirklich im Postfach, sondern gut
// sichtbar in der Server-Konsole, von dort zum Testen kopieren).
export default function ParentConsentPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // 'loading' | 'preview' | 'confirming' | 'confirmed' | 'error'
  const [state, setState] = useState('loading');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Kein Bestätigungs-Token in diesem Link gefunden.');
      setState('error');
      return;
    }

    const loadPreview = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/parent-consent?token=${encodeURIComponent(token)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Link ungültig');
        setPreview(data);
        setState('preview');
      } catch (err) {
        setError(err.message);
        setState('error');
      }
    };

    loadPreview();
  }, [token]);

  const handleConfirm = async () => {
    setState('confirming');
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/parent-consent/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Bestätigung fehlgeschlagen');
      setState('confirmed');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-canvas via-primary-light/20 to-canvas flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-fadeInUp">
        <div className="flex justify-center mb-8">
          <LogoWithText size={48} textClassName="text-3xl" />
        </div>

        <div className="bg-cream border border-gray-100 rounded-lg p-8 shadow-lg text-center">
          {state === 'loading' && (
            <p className="text-gray-500">Link wird geprüft…</p>
          )}

          {state === 'error' && (
            <>
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-3">
                Das hat nicht geklappt
              </h2>
              <p className="text-error-dark bg-error-light border border-error/30 rounded-md px-4 py-3 text-sm mb-6">
                {error}
              </p>
              <Link to="/" className="text-primary font-medium hover:text-primary-dark text-sm">
                Zurück zum Login →
              </Link>
            </>
          )}

          {state === 'preview' && preview && (
            <>
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-3">
                Zustimmung zur Registrierung
              </h2>
              <p className="text-gray-600 mb-6">
                <strong>{preview.childName}</strong> möchte Kapiert? nutzen. Da die Nutzerin/der Nutzer
                unter 16 Jahre alt ist, ist dafür laut Art. 8 DSGVO deine Zustimmung als
                Erziehungsberechtigte:r erforderlich.
              </p>
              <button
                onClick={handleConfirm}
                className="w-full h-11 bg-primary hover:bg-primary-dark text-white font-semibold rounded-md shadow-md hover:shadow-lg transition-all"
              >
                Ich stimme der Nutzung zu
              </button>
            </>
          )}

          {state === 'confirming' && (
            <p className="text-gray-500">Wird bestätigt…</p>
          )}

          {state === 'confirmed' && (
            <>
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-3">
                Danke! ✅
              </h2>
              <p className="text-gray-600 mb-6">
                Das Konto ist jetzt freigeschaltet. Das Kind kann sich ab sofort ganz normal einloggen.
              </p>
              <Link
                to="/"
                className="inline-block w-full h-11 leading-[2.75rem] bg-primary hover:bg-primary-dark text-white font-semibold rounded-md shadow-md transition-all"
              >
                Zum Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}