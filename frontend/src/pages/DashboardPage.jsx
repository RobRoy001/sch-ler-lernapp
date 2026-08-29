import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Upload } from 'lucide-react';

export default function DashboardPage({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📚</span>
            <h1 className="text-2xl font-bold text-white">Lernapp</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white font-semibold">{user?.name}</p>
              <p className="text-slate-400 text-sm">{user?.grade_level}</p>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg transition"
            >
              <LogOut size={18} />
              Abmelden
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-white mb-2">
            Hallo, {user?.name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-slate-400 text-lg">Du packst das heute!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Tests Card */}
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-600/5 border border-blue-600/30 rounded-2xl p-6 hover:border-blue-500/50 transition">
            <div className="text-5xl mb-3">📋</div>
            <h3 className="text-slate-300 text-sm font-semibold mb-1">Tests</h3>
            <p className="text-4xl font-bold text-blue-400">0</p>
            <p className="text-slate-500 text-xs mt-2">Noch keine Tests erstellt</p>
          </div>

          {/* Success Rate Card */}
          <div className="bg-gradient-to-br from-green-600/20 to-green-600/5 border border-green-600/30 rounded-2xl p-6 hover:border-green-500/50 transition">
            <div className="text-5xl mb-3">📈</div>
            <h3 className="text-slate-300 text-sm font-semibold mb-1">Erfolgsquote</h3>
            <p className="text-4xl font-bold text-green-400">0%</p>
            <p className="text-slate-500 text-xs mt-2">Starte mit einem Test!</p>
          </div>

          {/* Learning Streak Card */}
          <div className="bg-gradient-to-br from-amber-600/20 to-amber-600/5 border border-amber-600/30 rounded-2xl p-6 hover:border-amber-500/50 transition">
            <div className="text-5xl mb-3">🔥</div>
            <h3 className="text-slate-300 text-sm font-semibold mb-1">Lern-Serie</h3>
            <p className="text-4xl font-bold text-amber-400">0</p>
            <p className="text-slate-500 text-xs mt-2">Tage am Stück</p>
          </div>

          {/* Topics Card */}
          <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/5 border border-purple-600/30 rounded-2xl p-6 hover:border-purple-500/50 transition">
            <div className="text-5xl mb-3">🎯</div>
            <h3 className="text-slate-300 text-sm font-semibold mb-1">Themen</h3>
            <p className="text-4xl font-bold text-purple-400">0</p>
            <p className="text-slate-500 text-xs mt-2">Noch keine Inhalte</p>
          </div>
        </div>

        {/* Weekly Progress Chart */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 mb-12">
          <h3 className="text-xl font-semibold text-white mb-6">Wöchentlicher Fortschritt</h3>
          <div className="flex items-end gap-4 h-48">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, i) => (
              <div key={day} className="flex-1 text-center">
                <div
                  className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg mx-auto"
                  style={{ width: '100%', height: `${Math.random() * 80}px` }}
                />
                <p className="text-slate-400 text-sm mt-3">{day}</p>
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-sm mt-6 text-center">
            Noch keine Testaktivitäten. Starte jetzt mit neuen Inhalten! 🚀
          </p>
        </div>

        {/* Goals Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 mb-12">
          <h3 className="text-xl font-semibold text-white mb-6">🎯 Deine Ziele</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
              <p className="text-slate-300 font-semibold">Diese Woche</p>
              <p className="text-slate-500 text-sm mt-1">3 Tests absolvieren</p>
              <div className="mt-3 bg-slate-600 rounded-full h-2">
                <div className="bg-blue-500 rounded-full h-2" style={{ width: '0%' }} />
              </div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
              <p className="text-slate-300 font-semibold">Diesen Monat</p>
              <p className="text-slate-500 text-sm mt-1">10 Tests absolvieren</p>
              <div className="mt-3 bg-slate-600 rounded-full h-2">
                <div className="bg-green-500 rounded-full h-2" style={{ width: '0%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 mb-12">
          <h3 className="text-xl font-semibold text-white mb-4">💡 Tipp des Tages</h3>
          <p className="text-slate-300">
            Regelmäßiges Lernen hilft besser! Versuche täglich 15 Minuten zu lernen.
          </p>
        </div>

        {/* Upload Button */}
        <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-2xl p-8">
          <div className="flex items-center justify-between flex-col md:flex-row gap-6">
            <div>
              <h3 className="text-2xl font-semibold text-white mb-2">
                Starte jetzt mit neuen Inhalten
              </h3>
              <p className="text-slate-300">
                Lade Bücher oder Materialien hoch und lasse Tests automatisch generieren
              </p>
            </div>
            
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-semibold transition whitespace-nowrap"
            >
              <Upload size={20} />
              Neue Inhalte hochladen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}