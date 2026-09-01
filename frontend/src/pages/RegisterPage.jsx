import React, { useState } from 'react';

import { useNavigate, Link } from 'react-router-dom';

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

<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">

<div className="w-full max-w-md">

<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-xl">

<h2 className="text-3xl font-bold text-white mb-2 text-center">Mach dich bereit zum Lernen</h2>

<p className="text-slate-400 text-center mb-6">Erstelle dein Lernapp-Konto</p>

{error && <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-2 rounded-lg mb-4">{error}</div>}

<form onSubmit={handleSubmit} className="space-y-4">

<input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} className="w-full bg-slate-700/50 text-white placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" />

<select name="grade_level" value={formData.grade_level} onChange={handleChange} className="w-full bg-slate-700/50 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition">

<option value="">Klasse wählen</option>

{[5, 6, 7, 8, 9, 10, 11, 12, 13].map(g => <option key={g} value={g}>Klasse {g}</option>)}

</select>

<input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="w-full bg-slate-700/50 text-white placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" />

<input type="password" name="password" placeholder="Passwort" value={formData.password} onChange={handleChange} className="w-full bg-slate-700/50 text-white placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" />

<input type="password" name="confirmPassword" placeholder="Passwort wiederholen" value={formData.confirmPassword} onChange={handleChange} className="w-full bg-slate-700/50 text-white placeholder-slate-400 px-4 py-3 rounded-lg border border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" />

<button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-3 rounded-lg transition">{loading ? 'Wird registriert...' : 'Registrieren'}</button>

</form>

<p className="text-slate-400 text-center mt-6">Bereits registriert? <Link to="/" className="text-blue-400 hover:text-blue-300">Login →</Link></p>

</div>

</div>

</div>

);

}
