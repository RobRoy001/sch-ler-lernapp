import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogoWithText } from '../components/Logo';
import { API_BASE_URL } from '../config/api';
import { calculateAge } from '../utils/age';

const API_URL = API_BASE_URL;

export default function RegisterPage({ onLoginSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    date_of_birth: '',
    grade_level: '',
    parent_email: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingConsent, setPendingConsent] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password || !formData.date_of_birth) {
      setError('Name, Email, Passwort und Geburtsdatum sind erforderlich.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    const age = calculateAge(formData.date_of_birth);
    if (age === null || age < 0 || age > 120) {
      setError('Ungültiges Geburtsdatum.');
      return;
    }

    if (age < 16 && !formData.parent_email) {
      setError('Für Nutzer unter 16 Jahren ist die Email eines Erziehungsberechtigten erforderlich.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          date_of_birth: formData.date_of_birth,
          grade_level: formData.grade_level || null,
          parent_email: formData.parent_email || null
        })
      });

      const data = await response.json();

      if (response.status === 202) {
        setPendingConsent(true);
        return;
      }

      if (!response.ok) throw new Error(data.error || 'Registrierung fehlgeschlagen');

      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (pendingConsent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-canvas via-primary-light/20 to-canvas flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-cream border border-gray-100 rounded-lg p-8 shadow-lg text-center">
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">
              Bestätigung erforderlich
            </h2>
            <p className="text-gray-600 mb-6">
              Wir haben einen Bestätigungslink an <strong>{formData.parent_email}</strong> geschickt.
            </p>
            <p className="text-gray-500 text-sm">
              Ein Erziehungsberechtigter muss die Nutzung bestätigen, bevor das Konto aktiv wird.
            </p>
            <Link to="/" className="text-primary hover:underline font-semibold mt-6 inline-block">
              Zurück zum Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const age = formData.date_of_birth ? calculateAge(formData.date_of_birth) : null;
  const needsParentEmail = age !== null && age < 16;

  return (
    <div className="min-h-screen bg-gradient-to-br from-canvas via-primary-light/20 to-canvas flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-fadeInUp">
        <div className="flex justify-center mb-8">
          <LogoWithText size={48} textClassName="text-3xl" />
        </div>

        <div className="bg-cream border border-gray-100 rounded-lg p-8 shadow-lg">
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-1 text-center">
            Konto erstellen
          </h2>
          <p className="text-gray-500 text-center text-sm mb-6">
            Wird nur eine Minute dauern
          </p>

          {error && (
            <div className="bg-error-light border border-error text-error-dark text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Vorname"
              className="w-full h-11 px-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
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
              placeholder="Passwort (mind. 6 Zeichen)"
              className="w-full h-11 px-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              className="w-full h-11 px-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
            <select
              name="grade_level"
              value={formData.grade_level}
              onChange={handleChange}
              className="w-full h-11 px-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Klassenstufe (optional)</option>
              {[5, 6, 7, 8, 9, 10, 11, 12, 13].map(g => (
                <option key={g} value={g}>Klasse {g}</option>
              ))}
            </select>

            {needsParentEmail && (
              <input
                type="email"
                name="parent_email"
                value={formData.parent_email}
                onChange={handleChange}
                placeholder="Email Erziehungsberechtigter"
                className="w-full h-11 px-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold rounded-md py-2.5 transition disabled:opacity-60"
            >
              {loading ? 'Wird registriert…' : 'Registrieren'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Bereits registriert?{' '}
            <Link to="/" className="text-primary hover:underline font-semibold">
              Hier anmelden
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
