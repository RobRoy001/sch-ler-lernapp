import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, ChevronRight, Users, Plus, X } from 'lucide-react';
import Logo from '../../components/Logo';
import { API_BASE_URL } from '../../config/api';

// Lehrer-Portal Dashboard (Phase 1) - Übersicht aller eigenen Klassen plus
// "Neue Klasse anlegen". Lädt die Lehrer-Session selbst (GET /api/teacher/me),
// gleiches Muster wie ElternDashboardPage.jsx - eigenes Cookie, eigener
// unabhängiger Session-Check statt eines App.jsx-weiten Auth-State.
export default function LehrerKlassenPage() {
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState(null);
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const meResponse = await fetch(`${API_BASE_URL}/teacher/me`, { credentials: 'include' });
      if (!meResponse.ok) {
        navigate('/lehrer/login');
        return;
      }
      const meData = await meResponse.json();
      setTeacher(meData);

      const classesResponse = await fetch(`${API_BASE_URL}/teacher/classes`, {
        credentials: 'include'
      });
      const classesData = await classesResponse.json();
      if (!classesResponse.ok) {
        throw new Error(classesData.error || 'Klassen konnten nicht geladen werden');
      }
      setClasses(classesData.classes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/teacher/logout`, { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Logout fehlgeschlagen:', err);
    }
    navigate('/lehrer/login');
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!newClassName.trim()) {
      setCreateError('Klassenname erforderlich');
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/teacher/classes`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClassName.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Klasse konnte nicht angelegt werden');

      setClasses((prev) => [data.class, ...prev]);
      setNewClassName('');
      setShowCreateForm(false);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="text-gray-500 font-body">Wird geladen…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900">Lehrer-Portal</h1>
              {teacher?.name && <p className="text-gray-500 text-sm">{teacher.name}</p>}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium"
          >
            <LogOut size={16} /> Abmelden
          </button>
        </div>

        {error && (
          <div className="bg-error-light border border-error text-error-dark text-sm p-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-gray-900">Meine Klassen</h2>
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md font-semibold text-sm transition"
          >
            {showCreateForm ? <X size={16} /> : <Plus size={16} />}
            {showCreateForm ? 'Abbrechen' : 'Neue Klasse'}
          </button>
        </div>

        {showCreateForm && (
          <form
            onSubmit={handleCreateClass}
            className="bg-cream border border-gray-100 rounded-lg p-5 shadow-sm mb-6"
          >
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
              Klassenname
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="z.B. 8b Mathematik"
                className="flex-1 h-11 px-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
              <button
                type="submit"
                disabled={createLoading}
                className="bg-primary hover:bg-primary-dark text-white font-semibold rounded-md px-5 transition disabled:opacity-60"
              >
                {createLoading ? 'Wird angelegt…' : 'Anlegen'}
              </button>
            </div>
            {createError && <p className="text-error-dark text-sm mt-3">{createError}</p>}
          </form>
        )}

        {classes.length === 0 ? (
          <div className="bg-cream border border-gray-100 rounded-lg p-8 text-center">
            <Users size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">
              Du hast noch keine Klasse angelegt. Leg deine erste Klasse an, um einen
              Beitritts-Code an deine Schüler zu geben.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => (
              <Link
                key={cls.id}
                to={`/lehrer/klassen/${cls.id}`}
                className="flex items-center justify-between bg-cream border border-gray-100 rounded-lg p-5 shadow-sm hover:border-primary/40 transition"
              >
                <div>
                  <p className="text-gray-900 font-semibold">{cls.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Code: <span className="font-mono">{cls.classCode}</span> ·{' '}
                    {cls.memberCount} {cls.memberCount === 1 ? 'Schüler' : 'Schüler'}
                  </p>
                </div>
                <ChevronRight size={20} className="text-gray-300" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
