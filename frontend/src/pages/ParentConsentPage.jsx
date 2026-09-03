import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../config/api';

// ✅ Sicherheitsaudit Kritisch #5 (Art. 8 DSGVO): Ziel des Links aus der
// Eltern-Email. Ohne diese Seite gäbe es keine Möglichkeit, ein Konto
// eines unter 16-Jährigen jemals zu aktivieren - der Server-Endpoint
// (POST /auth/parent-consent/confirm) existiert bereits, diese Seite
// stellt nur das UI dafür bereit. Bewusst ohne Login erreichbar, da der
// Erziehungsberechtigte selbst kein Konto in der App hat.

export default function ParentConsentPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading | preview | confirming | confirmed | error
  const [childName, setChildName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Kein gültiger Bestätigungs-Link. Bitte prüfe den Link aus der Email.');
      return;
    }
    loadPreview();
  }, [token]);

  const loadPreview = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/parent-consent?token=${encodeURIComponent(token)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Dieser Link ist ungültig oder abgelaufen.');
      }

      setChildName(data.childName);
      setParentEmail(data.parentEmail);
      setStatus('preview');
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  };

  const handleConfirm = async () => {
    setStatus('confirming');
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/parent-consent/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bestätigung fehlgeschlagen');
      }

      setStatus('confirmed');
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Logo size={36} />
          <h1 className="font-display text-2xl font-bold text-gray-900">Kapiert</h1>
        </div>

        <div className="bg-cream border border-gray-100 rounded-lg p-8 shadow-sm text-center">
          {status === 'loading' && (
            <div className="py-8">
              <Clock size={32} className="mx-auto mb-4 text-gray-400 animate-spin" />
              <p className="text-gray-600">Link wird geprüft…</p>
            </div>
          )}

          {status === 'preview' && (
            <div>
              <h2 className="font-display text-xl font-bold text-gray-900 mb-3">
                Elternzustimmung erforderlich
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                <strong>{childName}</strong> hat sich bei Kapiert registriert. Da{' '}
                {childName ? childName.split(' ')[0] : 'das Kind'} unter 16 Jahre alt ist,
                benötigen wir gemäß Art. 8 DSGVO deine Zustimmung als Erziehungsberechtigte(r),
                bevor das Konto genutzt werden kann.
              </p>
              <p className="text-xs text-gray-500 mb-6">
                Diese Anfrage wurde an {parentEmail} gesendet.
              </p>
              <button
                onClick={handleConfirm}
                className="w-full bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md font-semibold transition"
              >
                Zustimmung erteilen
              </button>
            </div>
          )}

          {status === 'confirming' && (
            <div className="py-8">
              <Clock size={32} className="mx-auto mb-4 text-gray-400 animate-spin" />
              <p className="text-gray-600">Wird bestätigt…</p>
            </div>
          )}

          {status === 'confirmed' && (
            <div>
              <CheckCircle size={48} className="mx-auto mb-4 text-success" />
              <h2 className="font-display text-xl font-bold text-gray-900 mb-3">
                Zustimmung erteilt!
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                Vielen Dank. Das Konto von {childName} ist jetzt freigeschaltet und kann
                verwendet werden.
              </p>
              <Link
                to="/"
                className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md font-semibold transition"
              >
                Zur Anmeldung
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div>
              <XCircle size={48} className="mx-auto mb-4 text-error" />
              <h2 className="font-display text-xl font-bold text-gray-900 mb-3">
                Link ungültig
              </h2>
              <div className="flex items-start gap-2 text-left bg-error-light border border-error/20 rounded-md p-4 mb-4">
                <AlertTriangle size={18} className="text-error-dark flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error-dark">{error}</p>
              </div>
              <p className="text-xs text-gray-500">
                Falls der Link abgelaufen ist, muss sich das Kind erneut registrieren.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
