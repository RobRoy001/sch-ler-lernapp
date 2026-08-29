import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const navigate = useNavigate();

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Email erforderlich.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (response.ok) {
        setResetToken(data.resetToken);
        setSuccess(true);
      } else {
        setError(data.error || 'Fehler beim Reset-Request.');
      }
    } catch (err) {
      setError('Verbindungsfehler.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const newPassword = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;

    if (newPassword !== confirmPassword) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Min. 6 Zeichen.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword })
      });
      const data = await response.json();
      if (response.ok) {
        setTimeout(() => navigate('/'), 2000);
        return <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center"><div className="text-center"><div className="text-6xl mb-4">✅</div><h1 className="text-3xl font-bold text-white mb-2">Passwort zurückgesetzt!</h1><p className="text-slate-400">Weiterleitung zum Login...</p></div></div>;
      } else {
        setError(data.error || 'Passwort-Reset fehlgeschlagen.');
      }
    } catch (err) {
      setError('Verbindungsfehler.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-10 shadow-2xl">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🔑</div>
              <h1 className="text-3xl font-bold text-white mb-2">Neues Passwort</h1>
              <p className="text-slate-400 text-sm">Gib ein neues Passwort ein</p>
            </div>
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Neues Passwort</label>
                <input type="password" name="password" placeholder="Min. 6 Zeichen" className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Bestätigung</label>
                <input type="password" name="confirmPassword" placeholder="Passwort wiederholen" className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" required />
              </div>
              {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">⚠ {error}</div>}
              <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg transition-all mt-6">{loading ? 'Wird verarbeitet...' : 'Passwort zurücksetzen'}</button>
            </form>
            <div className="text-center mt-6">
              <Link to="/" className="text-blue-400 hover:text-blue-300">← Zurück zum Login</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔐</div>
            <h1 className="text-3xl font-bold text-white mb-2">Passwort vergessen?</h1>
            <p className="text-slate-400 text-sm">Gib deine Email ein</p>
          </div>
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="deine@email.de" className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm">⚠ {error}</div>}
            <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg transition-all mt-6">{loading ? 'Wird gesendet...' : 'Reset-Link anfordern'}</button>
          </form>
          <div className="text-center mt-6">
            <Link to="/" className="text-blue-400 hover:text-blue-300">← Zurück zum Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
