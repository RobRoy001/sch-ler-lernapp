import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogoWithText } from '../../components/Logo';
import { API_BASE_URL } from '../../config/api';

// Eltern-Board Login (Phase 1) - eigene Login-Identität, getrennt vom
// Kind-Konto (eigenes "parent_token"-Cookie, siehe backend/src/utils/cookies.js).
// Ein Eltern-Konto entsteht aktuell ausschließlich beim Bestätigen der
// Elternzustimmung (siehe ParentConsentPage.jsx) - es gibt bewusst keine
// eigenständige "Eltern registrieren"-Seite in Phase 1.
export default function ElternLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('E-Mail und Passwort erforderlich.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/parent/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login fehlgeschlagen');

      navigate('/eltern');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-canvas via-primary-light/20 to-canvas flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-fadeInUp">
        <div className="flex justify-center mb-8">
          <LogoWithText size={48} textClassName="text-3xl" />
        </div>

        <div className="bg-cream border border-gray-100 rounded-lg p-8 shadow-lg">
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-1 text-center">
            Eltern-Board
          </h2>
          <p className="text-gray-500 text-center text-sm mb-6">
            Melde dich mit deinem Eltern-Konto an
          </p>

          {error && (
            <div className="bg-error-light border border-error text-error-dark text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-Mail-Adresse"
              className="w-full h-11 px-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort"
              className="w-full h-11 px-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold rounded-md py-2.5 transition disabled:opacity-60"
            >
              {loading ? 'Wird angemeldet…' : 'Anmelden'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Noch kein Eltern-Konto?{' '}
            <span className="text-gray-400">
              Du erhältst es über den Zustimmungs-Link aus der Email deines Kindes.
            </span>
          </p>
          <p className="text-center text-gray-400 text-xs mt-4">
            <Link to="/" className="hover:underline">Zurück zur Schüler-Anmeldung</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
