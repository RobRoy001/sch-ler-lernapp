import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Settings, LogOut, Upload, CheckCircle, XCircle, Clock } from 'lucide-react';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../config/api';

export default function DashboardPage({ user, onLogout }) {
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all', '7days', '30days', 'month'

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/processing/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Submissions konnte nicht geladen werden');
      }

      const data = await response.json();
      // Backend liefert testTitle/correctCount/totalQuestions/accuracy -
      // hier auf die im UI verwendeten Feldnamen gemappt.
      const mapped = (data.submissions || []).map((s) => ({
        id: s.id,
        question_text: s.testTitle || 'Test',
        created_at: s.submittedAt,
        score: s.accuracy,
        is_correct: (s.accuracy || 0) >= 50
      }));
      setSubmissions(mapped);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterSubmissionsByDate = () => {
    if (dateFilter === 'all') return submissions;

    const now = new Date();
    let cutoffDate = new Date();

    if (dateFilter === '7days') {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (dateFilter === '30days') {
      cutoffDate.setDate(now.getDate() - 30);
    } else if (dateFilter === 'month') {
      cutoffDate.setMonth(now.getMonth() - 1);
    }

    return submissions.filter(sub => new Date(sub.created_at) >= cutoffDate);
  };

  const filteredSubmissions = filterSubmissionsByDate();

  const stats = {
    total: submissions.length,
    correct: submissions.filter(s => s.is_correct).length,
    accuracy: submissions.length > 0
      ? Math.round((submissions.filter(s => s.is_correct).length / submissions.length) * 100)
      : 0
  };

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-cream border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <div>
              <h1 className="font-display text-lg font-bold text-gray-900">Kapiert</h1>
              <p className="text-xs text-gray-500">Lernportal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Einstellungen"
            >
              <Settings size={20} className="text-gray-700" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Abmelden"
            >
              <LogOut size={20} className="text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-1">
            Willkommen, {user?.name || 'Nutzer'}!
          </h2>
          <p className="text-gray-600">
            {user?.grade_level && `Klasse ${user.grade_level} • `}
            {user?.email}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
              Bearbeitete Aufgaben
            </p>
            <p className="font-display text-4xl font-bold text-primary">{stats.total}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
              Richtig gelöst
            </p>
            <p className="font-display text-4xl font-bold text-success">{stats.correct}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
              Erfolgsquote
            </p>
            <p className="font-display text-4xl font-bold text-primary">{stats.accuracy}%</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link
            to="/upload"
            className="flex items-center gap-3 bg-primary hover:bg-primary-dark text-white px-6 py-4 rounded-lg font-semibold transition shadow-sm"
          >
            <Upload size={20} />
            Neue Aufgabe hochladen
          </Link>
          <Link
            to="/tasks"
            className="flex items-center gap-3 bg-white border border-primary hover:bg-primary-light text-primary px-6 py-4 rounded-lg font-semibold transition"
          >
            <Clock size={20} />
            Zu bearbeitende Aufgaben
          </Link>
        </div>

        {/* Submissions Section */}
        <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl font-bold text-gray-900">Meine Ergebnisse</h3>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">Alle</option>
              <option value="7days">Letzte 7 Tage</option>
              <option value="30days">Letzte 30 Tage</option>
              <option value="month">Letzter Monat</option>
            </select>
          </div>

          {error && (
            <div className="bg-error-light border border-error/20 rounded-md p-4 mb-4 text-error-dark text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <Clock size={32} className="mx-auto mb-2 animate-spin" />
              <p>Wird geladen…</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Noch keine Ergebnisse vorhanden.</p>
              <Link to="/upload" className="text-primary hover:underline text-sm font-semibold mt-2">
                Jetzt eine Aufgabe hochladen
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {submission.is_correct ? (
                      <CheckCircle size={20} className="text-success flex-shrink-0" />
                    ) : (
                      <XCircle size={20} className="text-error flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {submission.question_text || 'Frage'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(submission.created_at).toLocaleDateString('de-DE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-lg text-gray-900">
                      {submission.score !== null ? `${submission.score}%` : '—'}
                    </p>
                    {submission.is_correct && (
                      <p className="text-xs text-success font-semibold">Richtig</p>
                    )}
                    {!submission.is_correct && (
                      <p className="text-xs text-error font-semibold">Falsch</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
