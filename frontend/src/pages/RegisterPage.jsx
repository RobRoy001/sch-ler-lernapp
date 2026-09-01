import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogoWithText } from '../components/Logo';

const API_URL = 'https://web-production-adfb70.up.railway.app/api';

export default function RegisterPage({ onLoginSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    grade_level: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.grade_level || !formData.email || !formData.password) {
      setError('Alle Felder ausfüllen.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein.');
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
          password: formData.password
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registrierung fehlgeschlagen');

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
