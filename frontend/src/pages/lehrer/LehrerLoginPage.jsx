import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogoWithText } from '../../components/Logo';
import { API_BASE_URL } from '../../config/api';

// Lehrer-Portal Login/Registrierung (Phase 1) - eigene Login-Identität für
// Lehrkräfte, komplett getrennt vom Kind- und Eltern-Konto (eigenes
// "teacher_token"-Cookie, siehe backend/src/utils/cookies.js). Anders als
// beim Eltern-Board (Konto entsteht nur über den Zustimmungs-Link) gibt es
// hier eine echte Selbst-Registrierung, da Lehrkräfte keine Kinder sind und
// kein Consent-Flow nötig ist - deshalb ein Umschalter zwischen Login und
// Registrierung auf derselben Seite (gleiches Muster wie RegisterPage.jsx).
export default function LehrerLoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password || (mode === 'register' && !formData.name)) {
      setError('Bitte fülle alle Felder aus.');
      return;
    }
    if (mode === 'register' && formData.password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? 'login' : 'register';
      const body =
        mode === 'login'
          ? { email: formData.email, password: formData.password }
          : formData;

      const response = await fetch(`${API_BASE_URL}/teacher/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || (mode === 'login' ? 'Login fehlgeschlagen' : 'Registrierung fehlgeschlagen'));
      }

      navigate('/lehrer');
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
            Lehrer-Portal
          </h2>
          <p className="text-gray-500 text-center text-sm mb-6">
            {mode === 'login'
              ? 'Melde dich mit deinem Lehrkraft-Konto an'
              : 'Lege ein neues Lehrkraft-Konto an'}
          </p>

          {error && (
            <div className="bg-error-light border border-error text-error-dark text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Name"
                className="w-full h-11 px-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
            )}
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="E-Mail-Adresse"
              className="w-full h-11 px-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={mode === 'register' ? 'Passwort (mind. 6 Zeichen)' : 'Passwort'}
              className="w-full h-11 px-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold rounded-md py-2.5 transition disabled:opacity-60"
            >
              {loading
                ? mode === 'login'
                  ? 'Wird angemeldet…'
                  : 'Wird registriert…'
                : mode === 'login'
                ? 'Anmelden'
                : 'Konto anlegen'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            {mode === 'login' ? (
              <>
                Noch kein Lehrkraft-Konto?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  Jetzt registrieren
                </button>
              </>
            ) : (
              <>
                Bereits registriert?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  Hier anmelden
                </button>
              </>
            )}
          </p>
          <p className="text-center text-gray-400 text-xs mt-4">
            <Link to="/" className="hover:underline">Zurück zur Schüler-Anmeldung</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
