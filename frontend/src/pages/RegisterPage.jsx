import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ name: '', classLevel: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name || !formData.classLevel || !formData.email || !formData.password) {
      setError('Alle Felder ausfüllen.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Min. 6 Zeichen.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, class_level: parseInt(formData.classLevel), email: formData.email, password: formData.password })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/'), 2000);
      } else {
        setError(data.error || 'Registrierung fehlgeschlagen.');
      }
    } catch (err) {
      setError('Verbindungsfehler.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (<div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center"><div className="text-center"><div className="text-6xl mb-4">✅</div><h1 className="text-3xl font-bold text-white mb-2">Willkommen!</h1><p className="text-slate-400">Konto erstellt!</p></div></div>);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/30 rounded-2xl p-10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎓</div>
            <h1 className="text-3xl font-bold text-white mb-2">Willkommen!</h1>
            <p className="text-slate-400 text-sm">Mach dich bereit zum Lernen</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-300 mb-2">Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="z.B. Lisa" className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" /></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-2">Klasse</label><select name="classLevel" value={formData.classLevel} onChange={handleChange} className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white"><option value="">Wähle Klasse</option>{Array.from({length:9},(_, i)=>(<option key={i} value={5+i}>Klasse {5+i}</option>))}</select></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-2">Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="deine@email.de" className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" /></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-2">Passwort</label><input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Min. 6 Zeichen" className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" /></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-2">Wiederholen</label><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Passwort nochmal" className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" /></div>
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300 text-sm"><span>{error}</span></div>}
            <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg transition-all mt-6">{loading ? 'Wird registriert...' : 'Registrieren'}</button>
          </form>
          <div className="text-center mt-6"><p className="text-slate-400 text-sm mb-2">Bereits registriert?</p><Link to="/" className="text-blue-400 hover:text-blue-300">Login →</Link></div>
        </div>
      </div>
    </div>
  );
}
