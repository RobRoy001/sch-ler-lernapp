import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Upload, Settings, ClipboardList, TrendingUp, Flame, Target } from 'lucide-react';
import Logo from '../components/Logo';

export default function DashboardPage({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const firstName = user?.name?.split(' ')[0] || 'Lerner';

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-cream/90 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <h1 className="font-display text-xl font-extrabold text-gray-900">
              Kapiert<span className="text-primary">?</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-gray-900 font-semibold text-sm">{user?.name}</p>
              <p className="text-gray-500 text-xs">{user?.grade_level ? `Klasse ${user.grade_level}` : ''}</p>
            </div>

            <button
              onClick={() => navigate('/settings')}
              aria-label="Einstellungen"
              className="p-2 rounded-md text-gray-500 hover:text-primary hover:bg-primary-light/40 transition"
            >
              <Settings size={20} />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-error-light hover:bg-error/20 text-error-dark px-3 py-2 rounded-md text-sm font-medium transition"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Welcome Section */}
        <div className="mb-10">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-gray-900 mb-1">
            Hallo, {firstName}! 👋
          </h2>
          <p className="text-gray-500 text-lg">Du packst das heute!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-cream border border-gray-100 rounded-lg p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <ClipboardList className="text-primary mb-3" size={28} />
            <h3 className="text-gray-500 text-sm font-semibold mb-1">Tests</h3>
            <p className="text-3xl font-display font-bold text-primary">0</p>
            <p className="text-gray-400 text-xs mt-1">Noch keine Tests erstellt</p>
          </div>

          <div className="bg-cream border border-gray-100 rounded-lg p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <TrendingUp className="text-success mb-3" size={28} />
            <h3 className="text-gray-500 text-sm font-semibold mb-1">Erfolgsquote</h3>
            <p className="text-3xl font-display font-bold text-success">0%</p>
            <p className="text-gray-400 text-xs mt-1">Starte mit einem Test!</p>
          </div>

          <div className="bg-cream border border-gray-100 rounded-lg p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <Flame className="text-accent mb-3" size={28} />
            <h3 className="text-gray-500 text-sm font-semibold mb-1">Lern-Serie</h3>
            <p className="text-3xl font-display font-bold text-accent">0</p>
            <p className="text-gray-400 text-xs mt-1">Tage am Stück</p>
          </div>

          <div className="bg-cream border border-gray-100 rounded-lg p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <Target className="text-gray-700 mb-3" size={28} />
            <h3 className="text-gray-500 text-sm font-semibold mb-1">Themen</h3>
            <p className="text-3xl font-display font-bold text-gray-900">0</p>
            <p className="text-gray-400 text-xs mt-1">Noch keine Inhalte</p>
          </div>
        </div>

        {/* Weekly Progress Chart */}
        <div className="bg-cream border border-gray-100 rounded-lg p-6 md:p-8 mb-8 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-gray-900 mb-6">Wöchentlicher Fortschritt</h3>
          <div className="flex items-end gap-3 md:gap-4 h-40">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
              <div key={day} className="flex-1 text-center">
                <div className="bg-gray-100 rounded-t-md mx-auto h-4" />
                <p className="text-gray-400 text-xs mt-2">{day}</p>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm mt-6 text-center">
            Noch keine Testaktivitäten. Starte jetzt mit neuen Inhalten! 🚀
          </p>
        </div>

        {/* Goals Section */}
        <div className="bg-cream border border-gray-100 rounded-lg p-6 md:p-8 mb-8 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-gray-900 mb-6">🎯 Deine Ziele</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-md p-4 border border-gray-100">
              <p className="text-gray-800 font-semibold text-sm">Diese Woche</p>
              <p className="text-gray-400 text-xs mt-1">3 Tests absolvieren</p>
              <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-primary rounded-full h-2 transition-all duration-400" style={{ width: '0%' }} />
              </div>
            </div>
            <div className="bg-white rounded-md p-4 border border-gray-100">
              <p className="text-gray-800 font-semibold text-sm">Diesen Monat</p>
              <p className="text-gray-400 text-xs mt-1">10 Tests absolvieren</p>
              <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-success rounded-full h-2 transition-all duration-400" style={{ width: '0%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-cream border border-gray-100 rounded-lg p-6 md:p-8 mb-8 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-gray-900 mb-3">💡 Tipp des Tages</h3>
          <p className="text-gray-600">
            Regelmäßiges Lernen hilft besser! Versuche täglich 15 Minuten zu lernen.
          </p>
        </div>

        {/* Upload CTA */}
        <div className="bg-gradient-to-r from-accent to-accent-dark rounded-lg p-6 md:p-8 shadow-md">
          <div className="flex items-center justify-between flex-col md:flex-row gap-6 text-center md:text-left">
            <div>
              <h3 className="font-display text-xl md:text-2xl font-semibold text-white mb-1">
                Starte jetzt mit neuen Inhalten
              </h3>
              <p className="text-white/90 text-sm">
                Lade Bücher oder Materialien hoch und lasse Tests automatisch generieren
              </p>
            </div>

            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-2 bg-white text-accent-dark px-6 py-3 rounded-md font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all whitespace-nowrap"
            >
              <Upload size={18} />
              Neue Inhalte hochladen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
