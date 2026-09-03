import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Users, FileText, Plus, X } from 'lucide-react';
import Logo from '../../components/Logo';
import { API_BASE_URL } from '../../config/api';

// Lehrer-Portal Klassen-Detail (Phase 1, siehe claude/Lehrer-Portal-Konzept-2026-09-03.md
// Abschnitt 3+4): Klassencode zum Weitergeben, Mitgliederliste, eigene
// Klassenarbeits-Uploads (Mock-Testgenerierung, synchron) und die
// Kernzahlen-Fortschrittsansicht pro Klassenarbeit. Der Ownership-Check
// (gehört diese Klasse dieser Lehrkraft?) passiert serverseitig in jeder
// Route in backend/src/routes/teacher.js - hier wird nur die ID aus der URL
// gelesen, nie zur Autorisierung selbst benutzt.
export default function LehrerKlassePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [cls, setCls] = useState(null);
  const [members, setMembers] = useState([]);
  const [sources, setSources] = useState([]);
  const [error, setError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const detailResponse = await fetch(`${API_BASE_URL}/teacher/classes/${id}`, {
        credentials: 'include'
      });
      if (detailResponse.status === 401) {
        navigate('/lehrer/login');
        return;
      }
      const detailData = await detailResponse.json();
      if (!detailResponse.ok) {
        throw new Error(detailData.error || 'Klasse konnte nicht geladen werden');
      }
      setCls(detailData.class);
      setMembers(detailData.members || []);

      const progressResponse = await fetch(`${API_BASE_URL}/teacher/classes/${id}/progress`, {
        credentials: 'include'
      });
      const progressData = await progressResponse.json();
      if (!progressResponse.ok) {
        throw new Error(progressData.error || 'Fortschritt konnte nicht geladen werden');
      }
      setSources(progressData.sources || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!cls?.classCode) return;
    navigator.clipboard.writeText(cls.classCode).catch(() => {});
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadError('');
    if (!newTitle.trim()) {
      setUploadError('Titel/Thema erforderlich');
      return;
    }

    setUploadLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/teacher/classes/${id}/sources`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Klassenarbeit konnte nicht angelegt werden');

      setNewTitle('');
      setShowUploadForm(false);
      await loadData();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadLoading(false);
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
        <button
          onClick={() => navigate('/lehrer')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm font-medium"
        >
          <ArrowLeft size={18} /> Zurück zu meinen Klassen
        </button>

        {error && (
          <div className="bg-error-light border border-error text-error-dark text-sm p-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {cls && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <Logo size={32} />
              <h1 className="font-display text-2xl font-bold text-gray-900">{cls.name}</h1>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                  Beitritts-Code für deine Schüler
                </p>
                <p className="font-display text-2xl font-bold text-primary font-mono">
                  {cls.classCode}
                </p>
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-2 bg-white border border-primary/30 hover:bg-primary-light text-primary px-4 py-2 rounded-md font-semibold text-sm transition"
              >
                {codeCopied ? <Check size={16} /> : <Copy size={16} />}
                {codeCopied ? 'Kopiert!' : 'Kopieren'}
              </button>
            </div>

            <div className="bg-cream border border-gray-100 rounded-lg p-5 shadow-sm mb-6">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">
                <Users size={14} /> Mitglieder ({members.length})
              </h2>
              {members.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  Noch kein Schüler beigetreten. Gib den Code oben an deine Klasse weiter.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <span
                      key={m.id}
                      className="bg-white border border-gray-100 rounded-full px-3 py-1 text-sm text-gray-700"
                    >
                      {m.name}
                      {m.gradeLevel && <span className="text-gray-400"> · Klasse {m.gradeLevel}</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-gray-900">Klassenarbeiten</h2>
              <button
                onClick={() => setShowUploadForm((v) => !v)}
                className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md font-semibold text-sm transition"
              >
                {showUploadForm ? <X size={16} /> : <Plus size={16} />}
                {showUploadForm ? 'Abbrechen' : 'Neue Klassenarbeit'}
              </button>
            </div>

            {showUploadForm && (
              <form
                onSubmit={handleUpload}
                className="bg-cream border border-gray-100 rounded-lg p-5 shadow-sm mb-6"
              >
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
                  Titel / Thema
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="z.B. Bruchrechnung Kapitel 3"
                    className="flex-1 h-11 px-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                  <button
                    type="submit"
                    disabled={uploadLoading}
                    className="bg-primary hover:bg-primary-dark text-white font-semibold rounded-md px-5 transition disabled:opacity-60"
                  >
                    {uploadLoading ? 'Wird erstellt…' : 'Erstellen'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Testfragen werden aktuell automatisch als Platzhalter erstellt (echte
                  KI-Generierung folgt später) und sind sofort für die Klasse sichtbar.
                </p>
                {uploadError && <p className="text-error-dark text-sm mt-3">{uploadError}</p>}
              </form>
            )}

            {sources.length === 0 ? (
              <div className="bg-cream border border-gray-100 rounded-lg p-8 text-center">
                <FileText size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm">
                  Noch keine Klassenarbeit angelegt.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{source.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {source.questionCount} Fragen
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {source.completedCount}/{source.memberCount} bearbeitet
                      </span>
                    </div>

                    {source.avgAccuracy !== null && (
                      <p className="text-sm text-primary font-semibold mb-3">
                        Durchschnitt: {source.avgAccuracy}%
                      </p>
                    )}

                    {source.submissions.length > 0 && (
                      <div className="border-t border-gray-100 pt-3 space-y-1.5">
                        {source.submissions.map((s) => (
                          <div
                            key={s.studentId}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-gray-700">{s.studentName}</span>
                            <span className="text-gray-500">
                              {s.correctCount}/{s.totalQuestions} · {s.accuracy}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
