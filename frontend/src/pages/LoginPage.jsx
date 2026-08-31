import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

export default function LoginPage() {
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
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-xl">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">Lernapp</h2>
          <p className="text-slate-400 text-center mb-6">Dein cleverer Lern-Partner</p>

          {error && <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-2 rounded-lg mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="email" name="email" placeholder="Email" value={email} onChange={handleChange} className="w-full bg-slate-700/50 text-white placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" />
            
            <input type="password" name="password" placeholder="Passwort" value={password} onChange={handleChange} className="w-full bg-slate-700/50 text-white placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" />

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-3 rounded-lg transition">{loading ? 'Wird angemeldet...' : 'Anmelden'}</button>
          </form>

          <p className="text-slate-400 text-center mt-6">Noch kein Konto? <Link to="/register" className="text-blue-400 hover:text-blue-300">Registrieren →</Link></p>
        </div>
      </div>
    </div>
  );
}