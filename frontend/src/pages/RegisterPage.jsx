import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogoWithText } from '../components/Logo';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

// Gleiche Berechnung wie im Backend (utils/age.js) - hier nur, um dem
// Nutzer sofort beim Ausfüllen das Eltern-Email-Feld ein-/auszublenden.
// Die eigentliche, verbindliche Prüfung passiert immer serverseitig.
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

const PARENT_CONSENT_AGE = 16;

export default function RegisterPage({ onLoginSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    grade_level: '',
    email: '',
    password: '',
    confirmPassword: '',
    date_of_birth: '',
    parent_email: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Sicherheitsaudit Kritisch #5 (Art. 8 DSGVO): wenn der Server meldet,
  // dass eine Elternzustimmung nötig ist, wird statt der App direkt ein
  // Hinweis angezeigt - es gibt in diesem Fall (noch) kein Token/Login.
  const [pendingConsent, setPendingConsent] = useState(false);
  const navigate = useNavigate();

  const age = calculateAge(formData.date_of_birth);
  const needsParentConsent = age !== null && age < PARENT_CONSENT_AGE;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.grade_level || !formData.email || !formData.password || !formData.date_of_birth) {
      setError('Alle Felder ausfüllen.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }

    if (needsParentConsent && !formData.parent_email) {
      setError('Für Nutzer unter 16 Jahren wird die Email eines Erziehungsberechtigten benötigt.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          grade_level: formData.grade_level,
          email: formData.email,
          password: formData.password,
          date_of_birth: formData.date_of_birth,
          parent_email: needsParentConsent ? formData.parent_email : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registrierung fehlgeschlagen');

      if (data.pendingParentConsent) {
        setPendingConsent(true);
        return;
      }

      localStorage.setItem('token', data.token);

      if (onLoginSuccess) {
        onLoginSuccess(data.user, data.token);
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
        <div className="w-full max-w-md animate-fadeInUp">
          <div className="flex justify-center mb-8">
            <LogoWithText size={48} textClassName="text-3xl" />
          </div>
          <div className="bg-cream border border-gray-100 rounded-lg p-8 shadow-lg text-center">
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-3">
              Fast geschafft! 📧
            </h2>
            <p className="text-gray-600 mb-4">
              Da du unter {PARENT_CONSENT_AGE} Jahre alt bist, braucht Kapiert? noch die Zustimmung
              eines Erziehungsberechtigten. Wir haben eine Email mit einem Bestätigungslink an{' '}
              <strong>{formData.parent_email}</strong> geschickt.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Sobald dort bestätigt wurde, kannst du dich hier ganz normal einloggen.
            </p>
            <Link
              to="/"
              className="inline-block w-full h-11 leading-[2.75rem] bg-primary hover:bg-primary-dark text-white font-semibold rounded-md shadow-md transition-all"
            >
              Zurück zum Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-canvas via-primary-light/20 to-canvas flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-fadeInUp">
        <div className="flex justify-center mb-8">
          <LogoWithText size={48} textClassName="text-3xl" />
        </div>

        <div className="bg-cream border border-gray-100 rounded-lg p-8 shadow-lg">
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-1 text-center">
            Mach dich bereit zum Lernen
          </h2>
          <p className="text-gray-500 text-center mb-6">Erstelle dein Kapiert?-Konto</p>

          {error && (
            <div role="alert" className="bg-error-light border border-error/30 text-error-dark text-sm px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <input
              type="text"
              name="name"
              placeholder="Name"
              autoComplete="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full h-11 bg-white text-gray-900 placeholder-gray-400 px-4 rounded-md border border-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
            />
            <select
              name="grade_level"
              value={formData.grade_level}
              onChange={handleChange}
              className="w-full h-11 bg-white text-gray-900 px-4 rounded-md border border-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
            >
              <option value="">Klasse wählen</option>
              {[5, 6, 7, 8, 9, 10, 11, 12, 13].map(g => (
                <option key={g} value={g}>Klasse {g}</option>
              ))}
            </select>

            <div>
              <label htmlFor="date_of_birth" className="block text-gray-600 text-sm mb-1.5">
                Geburtsdatum
              </label>
              <input
                id="date_of_birth"
                type="date"
                name="date_of_birth"
                autoComplete="bday"
                value={formData.date_of_birth}
                onChange={handleChange}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full h-11 bg-white text-gray-900 px-4 rounded-md border border-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
              />
            </div>

            {needsParentConsent && (
              <div>
                <label htmlFor="parent_email" className="block text-gray-600 text-sm mb-1.5">
                  Email eines Erziehungsberechtigten
                </label>
                <input
                  id="parent_email"
                  type="email"
                  name="parent_email"
                  placeholder="eltern@beispiel.de"
                  autoComplete="off"
                  value={formData.parent_email}
                  onChange={handleChange}
                  className="w-full h-11 bg-white text-gray-900 placeholder-gray-400 px-4 rounded-md border border-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
                />
                <p className="text-gray-400 text-xs mt-1.5">
                  Unter {PARENT_CONSENT_AGE} Jahren braucht Kapiert? laut DSGVO die Zustimmung
                  eines Erziehungsberechtigten, bevor das Konto genutzt werden kann.
                </p>
              </div>
            )}

            <input
              type="email"
              name="email"
              placeholder="Email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full h-11 bg-white text-gray-900 placeholder-gray-400 px-4 rounded-md border border-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
            />
            <input
              type="password"
              name="password"
              placeholder="Passwort"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              className="w-full h-11 bg-white text-gray-900 placeholder-gray-400 px-4 rounded-md border border-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Passwort wiederholen"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full h-11 bg-white text-gray-900 placeholder-gray-400 px-4 rounded-md border border-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary hover:bg-primary-dark disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-md shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              {loading ? 'Wird registriert…' : 'Registrieren'}
            </button>
          </form>

          <p className="text-gray-500 text-center mt-6 text-sm">
            Bereits registriert?{' '}
            <Link to="/" className="text-primary font-medium hover:text-primary-dark">
              Login →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}