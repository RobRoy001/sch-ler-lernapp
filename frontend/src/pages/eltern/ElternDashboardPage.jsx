import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, ChevronRight, Users } from 'lucide-react';
import Logo from '../../components/Logo';
import { API_BASE_URL } from '../../config/api';

// Eltern-Board Dashboard (Phase 1) - Übersicht aller verknüpften Kinder.
// Lädt die Eltern-Session selbst (GET /api/parent/me) statt sich auf einen
// App.jsx-weiten Auth-State zu verlassen, da Eltern- und Kind-Session
// unabhängig voneinander laufen (getrennte Cookies, siehe
// backend/src/utils/cookies.js) - ein Elternteil kann diese Seite öffnen,
// während auf demselben Gerät parallel ein Kind eingeloggt ist.
export default function ElternDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [parent, setParent] = useState(null);
  const [children, setChildren] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const meResponse = await fetch(`${API_BASE_URL}/parent/me`, { credentials: 'include' });
        if (!meResponse.ok) {
          navigate('/eltern/login');
          return;
        }
        const meData = await meResponse.json();
        setParent(meData);

        const childrenResponse = await fetch(`${API_BASE_URL}/parent/children`, {
          credentials: 'include'
        });
        const childrenData = await childrenResponse.json();
        if (!childrenResponse.ok) {
          throw new Error(childrenData.error || 'Kinder konnten nicht geladen werden');
        }
        setChildren(childrenData.children || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/parent/logout`, { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Logout fehlgeschlagen:', err);
    }
    navigate('/eltern/login');
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
              <h1 className="font-display text-2xl font-bold text-gray-900">Eltern-Board</h1>
              {parent?.email && <p className="text-gray-500 text-sm">{parent.email}</p>}
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

        {children.length === 0 ? (
          <div className="bg-cream border border-gray-100 rounded-lg p-8 text-center">
            <Users size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">
              Es sind noch keine Kinder mit deinem Eltern-Konto verknüpft.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {children.map((child) => (
              <Link
                key={child.id}
                to={`/eltern/kind/${child.id}`}
                className="flex items-center justify-between bg-cream border border-gray-100 rounded-lg p-5 shadow-sm hover:border-primary/40 transition"
              >
                <div>
                  <p className="text-gray-900 font-semibold">{child.name}</p>
                  {child.grade_level && (
                    <p className="text-gray-400 text-xs mt-0.5">Klasse {child.grade_level}</p>
                  )}
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
