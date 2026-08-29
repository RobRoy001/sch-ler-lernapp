import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage({ user, onLogout }) {
  const [stats] = useState({ testsCreated: 0, successRate: 0, streak: 0, topicsCount: 0 });
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950">
      <nav className="bg-slate-800/40 backdrop-blur-xl border-b border-slate-700/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">📚</div>
            <h1 className="text-xl font-bold text-white">Lernapp</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-sm">
              <p className="text-white font-medium">{user?.name || 'Schüler'}</p>
              <p className="text-slate-400 text-xs">Klasse {user?.grade_level || '-'}</p>
            </div>
            <button onClick={handleLogout} className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 text-white rounded-lg text-sm">Abmelden</button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-white mb-2">Hallo, {user?.name || 'Schüler'}! 👋</h2>
          <p className="text-slate-400">Du packst das heute!</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-2 border-blue-500/30 rounded-xl p-6">
            <div className="text-4xl mb-4">📚</div>
            <p className="text-slate-400 text-sm mb-2">Tests</p>
            <p className="text-4xl font-bold text-blue-400">{stats.testsCreated}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-2 border-green-500/30 rounded-xl p-6">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-slate-400 text-sm mb-2">Erfolgsquote</p>
            <p className="text-4xl font-bold text-green-400">{stats.successRate}%</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-2 border-amber-500/30 rounded-xl p-6">
            <div className="text-4xl mb-4">🔥</div>
            <p className="text-slate-400 text-sm mb-2">Lern-Serie</p>
            <p className="text-4xl font-bold text-amber-400">{stats.streak}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-2 border-purple-500/30 rounded-xl p-6">
            <div className="text-4xl mb-4">🎯</div>
            <p className="text-slate-400 text-sm mb-2">Themen</p>
            <p className="text-4xl font-bold text-purple-400">{stats.topicsCount}</p>
          </div>
        </div>
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/30 rounded-xl p-8">
          <h3 className="text-lg font-bold text-white mb-6">💡 Tipp des Tages</h3>
          <p className="text-slate-300 text-sm">Regelmäßiges Lernen hilft besser! Versuche täglich 15 Minuten zu lernen.</p>
        </div>
      </main>
    </div>
  );
}
