import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Upload, Settings, ClipboardList, TrendingUp, Flame, Target } from 'lucide-react';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../config/api';

export default function DashboardPage({ user, onLogout }) {
  const navigate = useNavigate();

  // Vorher war diese Seite komplett statisch (alle Werte hart auf 0 codiert,
  // kein einziger API-Aufruf) - die echte Lade-Logik existierte nur in
  // components/Dashboard.jsx, das aber von App.jsx nie gerendert wird.
  // Deshalb wurden abgeschickte Tests nie im Dashboard angezeigt, obwohl sie
  // im Backend korrekt gespeichert wurden.
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [stats, setStats] = useState({
    totalTests: 0,
    averageAccuracy: 0,
    bestScore: 0,
    testsThisWeek: 0,
    testsThisMonth: 0
  });

  // Montag 00:00 der aktuellen Woche
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sonntag, 1 = Montag, ...
    const diffToMonday = day === 0 ? 6 : day - 1;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - diffToMonday);
    return d;
  };

  // 1. des aktuellen Monats, 00:00
  const getMonthStart = (date) => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  };

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/processing/submissions`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Fehler beim Laden der Test-Einreichungen');
        }

        const data = await response.json();
        const loaded = data.submissions || [];
        setSubmissions(loaded);

        if (loaded.length > 0) {
          const totalTests = loaded.length;
          const averageAccuracy = Math.round(
            loaded.reduce((sum, s) => sum + s.accuracy, 0) / totalTests
          );
          const bestScore = Math.max(...loaded.map(s => s.accuracy));

          // Vorher zeigten "Diese Woche" und "Diesen Monat" beide einfach
          // die Gesamtzahl aller je gemachten Tests (stats.totalTests) an,
          // ganz ohne Datumsfilter - die Balken hatten also nichts mit
          // "diese Woche"/"diesen Monat" zu tun, sondern liefen bei jedem
          // weiteren Test insgesamt einfach immer weiter auf, unabhängig
          // davon, wann er gemacht wurde.
          const now = new Date();
          const weekStart = getWeekStart(now);
          const monthStart = getMonthStart(now);
          const testsThisWeek = loaded.filter(
            (s) => new Date(s.submittedAt) >= weekStart
          ).length;
          const testsThisMonth = loaded.filter(
            (s) => new Date(s.submittedAt) >= monthStart
          ).length;

          setStats({ totalTests, averageAccuracy, bestScore, testsThisWeek, testsThisMonth });
        }
      } catch (err) {
        console.error('[Dashboard] Fehler beim Laden der Submissions:', err);
      } finally {
        setLoadingSubmissions(false);
      }
    };

    loadSubmissions();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${date.getFullYear()}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} Uhr`;
  };

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
            <p className="text-3xl font-display font-bold text-primary">{stats.totalTests}</p>
            <p className="text-gray-400 text-xs mt-1">
              {stats.totalTests === 0 ? 'Noch keine Tests erstellt' : 'Absolviert'}
            </p>
          </div>

          <div className="bg-cream border border-gray-100 rounded-lg p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <TrendingUp className="text-success mb-3" size={28} />
            <h3 className="text-gray-500 text-sm font-semibold mb-1">Erfolgsquote</h3>
            <p className="text-3xl font-display font-bold text-success">{stats.averageAccuracy}%</p>
            <p className="text-gray-400 text-xs mt-1">
              {stats.totalTests === 0 ? 'Starte mit einem Test!' : 'Durchschnitt'}
            </p>
          </div>

          <div className="bg-cream border border-gray-100 rounded-lg p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <Flame className="text-accent mb-3" size={28} />
            <h3 className="text-gray-500 text-sm font-semibold mb-1">Beste Punktzahl</h3>
            <p className="text-3xl font-display font-bold text-accent">{stats.bestScore}%</p>
            <p className="text-gray-400 text-xs mt-1">Persönlicher Bestwert</p>
          </div>

          <div className="bg-cream border border-gray-100 rounded-lg p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <Target className="text-gray-700 mb-3" size={28} />
            <h3 className="text-gray-500 text-sm font-semibold mb-1">Themen</h3>
            <p className="text-3xl font-display font-bold text-gray-900">0</p>
            <p className="text-gray-400 text-xs mt-1">Noch keine Inhalte</p>
          </div>
        </div>

        {/* Letzte Tests */}
        <div className="bg-cream border border-gray-100 rounded-lg p-6 md:p-8 mb-8 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-gray-900 mb-6">Deine letzten Tests</h3>

          {loadingSubmissions ? (
            <p className="text-gray-400 text-sm">Wird geladen…</p>
          ) : submissions.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              Noch keine Testaktivitäten. Starte jetzt mit neuen Inhalten! 🚀
            </p>
          ) : (
            <div className="space-y-3">
              {submissions
                .slice()
                .reverse()
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-md"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{s.testTitle}</p>
                      <p className="text-gray-400 text-xs mt-1">{formatDate(s.submittedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-primary">
                        {s.correctCount} / {s.totalQuestions}
                      </p>
                      <p className="text-gray-500 text-xs">{s.accuracy}% richtig</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Goals Section */}
        <div className="bg-cream border border-gray-100 rounded-lg p-6 md:p-8 mb-8 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-gray-900 mb-6">🎯 Deine Ziele</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-md p-4 border border-gray-100">
              <p className="text-gray-800 font-semibold text-sm">Diese Woche</p>
              <p className="text-gray-400 text-xs mt-1">
                {stats.testsThisWeek} von 3 Tests absolviert
              </p>
              <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary rounded-full h-2 transition-all duration-400"
                  style={{ width: `${Math.min(100, Math.round((stats.testsThisWeek / 3) * 100))}%` }}
                />
              </div>
            </div>
            <div className="bg-white rounded-md p-4 border border-gray-100">
              <p className="text-gray-800 font-semibold text-sm">Diesen Monat</p>
              <p className="text-gray-400 text-xs mt-1">
                {stats.testsThisMonth} von 10 Tests absolviert
              </p>
              <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-success rounded-full h-2 transition-all duration-400"
                  style={{ width: `${Math.min(100, Math.round((stats.testsThisMonth / 10) * 100))}%` }}
                />
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