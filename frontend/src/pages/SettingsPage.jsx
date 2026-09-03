import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, LogOut, User, Download, Trash2, AlertTriangle } from 'lucide-react';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../config/api';

export default function SettingsPage({ user, onLogout }) {
  const navigate = useNavigate();

  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');

  const [deleteMode, setDeleteMode] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  // ✅ Fix (2026-09-03): nutzt jetzt wie der Rest der App das httpOnly-
  // Cookie ("credentials: 'include'") statt eines localStorage-Tokens, den
  // seit der Umstellung auf Cookies (Sicherheitsaudit Mittel #16) niemand
  // mehr befüllt hat - dadurch schlug der Export vorher immer mit "Token
  // ungültig oder abgelaufen" fehl, obwohl die Session gültig war.
  const handleExport = async () => {
    setExportLoading(true);
    setExportError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/export-data`, {
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Export fehlgeschlagen');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kapiert-meine-daten-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExportLoading(false);
    }
  };

  // ✅ Fix (2026-09-03): siehe handleExport oben - gleiche Umstellung von
  // localStorage-Token auf Cookie-basierte Auth.
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('Bitte gib dein Passwort ein');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/account`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: deletePassword })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Konto konnte nicht gelöscht werden');
      }

      onLogout();
      navigate('/');
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
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

        <div className="bg-cream border border-gray-100 rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Datenschutz</h2>
          <p className="text-gray-600 text-sm mb-4">
            Deine Daten werden ausschließlich zur Erstellung deiner Lerninhalte verwendet.
            Weitere Infos findest du in unserer{' '}
            <Link to="/datenschutz" className="underline hover:text-gray-900">
              Datenschutzerklärung
            </Link>{' '}
            und im{' '}
            <Link to="/impressum" className="underline hover:text-gray-900">
              Impressum
            </Link>
            .
          </p>

          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-5 py-2.5 rounded-md font-semibold text-sm transition disabled:opacity-60"
          >
            <Download size={16} />
            {exportLoading ? 'Wird vorbereitet…' : 'Meine Daten exportieren'}
          </button>

          {exportError && (
            <p className="text-error-dark text-sm mt-3">{exportError}</p>
          )}
        </div>

        <div className="bg-error-light border border-error/20 rounded-lg p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-error-dark mb-4">Konto</h2>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-error hover:bg-error-dark text-white px-5 py-2.5 rounded-md font-semibold text-sm transition mb-4"
          >
            <LogOut size={16} />
            Abmelden
          </button>

          <div className="h-px bg-error/20 mb-4" />

          {!deleteMode ? (
            <button
              onClick={() => setDeleteMode(true)}
              className="flex items-center gap-2 bg-white border border-error text-error-dark hover:bg-error-light px-5 py-2.5 rounded-md font-semibold text-sm transition"
            >
              <Trash2 size={16} />
              Konto löschen
            </button>
          ) : (
            <div>
              <div className="flex items-start gap-2 text-error-dark text-sm mb-3">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                <p>
                  Dein Konto und alle zugehörigen Inhalte und Testergebnisse werden
                  unwiderruflich gelöscht. Gib zur Bestätigung dein Passwort ein.
                </p>
              </div>

              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Passwort"
                className="w-full h-11 px-4 border border-gray-200 rounded-md text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-error/40"
              />

              {deleteError && (
                <p className="text-error-dark text-sm mb-3">{deleteError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="bg-error hover:bg-error-dark text-white px-5 py-2.5 rounded-md font-semibold text-sm transition disabled:opacity-60"
                >
                  {deleteLoading ? 'Wird gelöscht…' : 'Endgültig löschen'}
                </button>
                <button
                  onClick={() => {
                    setDeleteMode(false);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-md font-semibold text-sm transition"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
