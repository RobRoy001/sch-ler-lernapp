import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, User } from 'lucide-react';
import Logo from '../components/Logo';

export default function SettingsPage({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm font-medium"
        >
          <ArrowLeft size={18} /> Zurück zum Dashboard
        </button>

        <div className="flex items-center gap-3 mb-8">
          <Logo size={32} />
          <h1 className="font-display text-2xl font-bold text-gray-900">Einstellungen</h1>
        </div>

        {/* Profile */}
        <div className="bg-cream border border-gray-100 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">Profil</h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center text-primary flex-shrink-0">
              <User size={26} />
            </div>
            <div>
              <p className="text-gray-900 font-semibold">{user?.name || '—'}</p>
              <p className="text-gray-500 text-sm">{user?.email || '—'}</p>
              {user?.grade_level && (
                <p className="text-gray-400 text-xs mt-0.5">Klasse {user.grade_level}</p>
              )}
            </div>
          </div>
        </div>

        {/* Privacy note */}
        <div className="bg-cream border border-gray-100 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Datenschutz</h2>
          <p className="text-gray-600 text-sm">
            Deine Daten werden ausschließlich zur Erstellung deiner Lerninhalte verwendet.
            Weitere Infos findest du in unserer Datenschutzerklärung.
          </p>
        </div>

        {/* Danger zone */}
        <div className="bg-error-light border border-error/20 rounded-lg p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-error-dark mb-4">Konto</h2>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-error hover:bg-error-dark text-white px-5 py-2.5 rounded-md font-semibold text-sm transition"
          >
            <LogOut size={16} />
            Abmelden
          </button>
        </div>
      </div>
    </div>
  );
}
