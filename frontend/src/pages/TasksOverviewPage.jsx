import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, FileText, AlertTriangle, Play } from 'lucide-react';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../config/api';

export default function TasksOverviewPage({ user }) {
  const navigate = useNavigate();

  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'processing', 'ready'

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/content/sources`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Aufgaben konnten nicht geladen werden');
      }

      const data = await response.json();
      setSources(data.sources || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterSources = () => {
    if (filterStatus === 'all') return sources;
    return sources.filter(source => source.status === filterStatus);
  };

  const filteredSources = filterSources();

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
            <Clock size={14} /> Ausstehend
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Clock size={14} className="animate-spin" /> Wird verarbeitet
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-semibold">
            <FileText size={14} /> Bereit
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm font-medium"
        >
          <ArrowLeft size={18} /> Zurück zum Dashboard
        </button>

        <div className="flex items-center gap-3 mb-8">
          <Logo size={32} />
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Aufgaben verarbeiten
          </h1>
        </div>

        {/* Info Box */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700">
            Hier siehst du den Status deiner hochgeladenen Aufgaben. Sobald die Verarbeitung
            abgeschlossen ist, kannst du die Testfragen beantworten.
          </p>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
              filterStatus === 'all'
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Alle ({sources.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
              filterStatus === 'pending'
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Ausstehend
          </button>
          <button
            onClick={() => setFilterStatus('processing')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
              filterStatus === 'processing'
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Wird verarbeitet
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
              filterStatus === 'completed'
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Bereit
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-error-light border border-error/20 rounded-lg mb-6">
            <AlertTriangle size={18} className="text-error-dark flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error-dark">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <Clock size={32} className="mx-auto mb-2 animate-spin" />
            <p>Wird geladen…</p>
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-lg p-12 text-center shadow-sm">
            <FileText size={32} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 font-semibold mb-2">Noch keine Aufgaben</p>
            <p className="text-sm text-gray-500 mb-4">
              {filterStatus === 'all'
                ? 'Lade deine erste Aufgabe hoch und beginne zu lernen.'
                : `Keine Aufgaben mit Status "${filterStatus}".`}
            </p>
            <Link
              to="/upload"
              className="inline-block bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-md font-semibold transition"
            >
              Aufgabe hochladen
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSources.map((source) => (
              <div
                key={source.id}
                className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">
                      {source.title}
                    </h3>
                    {source.description && (
                      <p className="text-sm text-gray-600 mb-2">{source.description}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Hochgeladen:{' '}
                      {new Date(source.created_at).toLocaleDateString('de-DE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    {getStatusBadge(source.status)}
                  </div>
                </div>

                {/* Status Message */}
                {source.status === 'pending' && (
                  <div className="p-3 bg-gray-50 rounded-md border border-gray-200 mb-4">
                    <p className="text-xs text-gray-600">
                      Deine Aufgabe wartet darauf, verarbeitet zu werden. Dies kann einige Minuten
                      dauern.
                    </p>
                  </div>
                )}

                {source.status === 'processing' && (
                  <div className="p-3 bg-primary/5 rounded-md border border-primary/20 mb-4">
                    <p className="text-xs text-primary">
                      Wir lesen deine Aufgabe und erstellen automatisch Testfragen. Bitte warten…
                    </p>
                  </div>
                )}

                {source.status === 'completed' && (
                  <div className="p-3 bg-success/10 rounded-md border border-success/20 mb-4">
                    <p className="text-xs text-success font-semibold">
                      ✓ Verarbeitung abgeschlossen! {source.question_count || 0} Fragen bereit.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {source.status === 'completed' ? (
                    <Link
                      to={`/test/${source.id}`}
                      className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md font-semibold text-sm transition"
                    >
                      <Play size={16} />
                      Test starten
                    </Link>
                  ) : (
                    <Link
                      to={`/processing/${source.id}`}
                      className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md font-semibold text-sm transition"
                    >
                      Fortschritt ansehen
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
