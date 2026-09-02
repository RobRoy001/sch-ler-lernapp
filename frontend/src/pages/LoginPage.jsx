import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogoWithText } from '../components/Logo';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email') setEmail(value);
    if (name === 'password') setPassword(value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('E-Mail und Passwort erforderlich.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login fehlgeschlagen');

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
            Willkommen zurück!
          </h2>
          <p className="text-gray-500 text-center mb-6">Dein cleverer Lern-Partner</p>

          {error && (
            <div
              role="alert"
              className="bg-error-light border border-error/30 text-error-dark text-sm px-4 py-3 rounded-md mb-4"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="login-email" className="sr-only">Email</label>
              <input
                id="login-email"
                type="email"
                name="email"
                placeholder="Email"
                autoComplete="email"
                value={email}
                onChange={handleChange}
                aria-describedby={error ? 'login-error' : undefined}
                className="w-full h-11 bg-white text-gray-900 placeholder-gray-400 px-4 rounded-md border border-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="sr-only">Passwort</label>
              <input
                id="login-password"
                type="password"
                name="password"
                placeholder="Passwort"
                autoComplete="current-password"
                value={password}
                onChange={handleChange}
                aria-describedby={error ? 'login-error' : undefined}
                className="w-full h-11 bg-white text-gray-900 placeholder-gray-400 px-4 rounded-md border border-gray-300 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary hover:bg-primary-dark disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-md shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              {loading ? 'Wird angemeldet…' : 'Anmelden'}
            </button>
          </form>

          <p className="text-gray-500 text-center mt-6 text-sm">
            Noch kein Konto?{' '}
            <Link to="/register" className="text-primary font-medium hover:text-primary-dark">
              Registrieren →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}