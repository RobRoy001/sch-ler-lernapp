import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalTests: 0,
    averageAccuracy: 0,
    bestScore: 0,
    totalCorrect: 0
  });

  // ✅ FIX #3: Alle eingereichten Tests vom Backend laden
  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(
          'https://web-production-adfb70.up.railway.app/api/processing/submissions',
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            navigate('/login');
            return;
          }
          throw new Error('Fehler beim Laden der Test-Einreichungen');
        }

        const data = await response.json();
        const loadedSubmissions = data.submissions || [];

        setSubmissions(loadedSubmissions);

        // Statistiken berechnen
        if (loadedSubmissions.length > 0) {
          const totalTests = loadedSubmissions.length;
          const totalCorrect = loadedSubmissions.reduce(
            (sum, sub) => sum + sub.correctCount,
            0
          );
          const averageAccuracy = Math.round(
            loadedSubmissions.reduce((sum, sub) => sum + sub.accuracy, 0) /
              totalTests
          );
          const bestScore = Math.max(...loadedSubmissions.map(s => s.accuracy));

          setStats({
            totalTests,
            averageAccuracy,
            bestScore,
            totalCorrect
          });
        }

        setLoading(false);
      } catch (err) {
        setError(err.message || 'Fehler beim Laden der Daten');
        setLoading(false);
      }
    };

    loadSubmissions();
  }, [navigate]);

  // Formatierungshilfsfunktion für Datum
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} um ${hours}:${minutes}`;
  };

  // Farbe basierend auf Genauigkeit
  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 90) return '#22c55e'; // Grün
    if (accuracy >= 70) return '#eab308'; // Gelb
    if (accuracy >= 50) return '#f97316'; // Orange
    return '#ef4444'; // Rot
  };

  // Bestanden/Nicht bestanden Status
  const getPassStatus = (accuracy) => {
    return accuracy >= 70 ? 'Bestanden' : 'Nicht bestanden';
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">
          <p>Dashboard wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Mein Dashboard</h1>
        <p className="subtitle">Deine Test-Ergebnisse und Fortschritt</p>
      </div>

      {/* Fehler-Nachricht */}
      {error && (
        <div className="error-banner">
          <p>⚠️ Fehler: {error}</p>
        </div>
      )}

      {/* Statistiken-Karten */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Tests gesamt</div>
          <div className="stat-value">{stats.totalTests}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Ø Genauigkeit</div>
          <div className="stat-value">{stats.averageAccuracy}%</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Beste Punktzahl</div>
          <div className="stat-value">{stats.bestScore}%</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Fragen richtig</div>
          <div className="stat-value">{stats.totalCorrect}</div>
        </div>
      </div>

      {/* Test-Verlauf */}
      <div className="submissions-section">
        <h2>Test-Verlauf</h2>

        {submissions.length === 0 ? (
          <div className="empty-state">
            <p>📚 Du hast noch keine Tests absolviert.</p>
            <Link to="/tests" className="btn-primary">
              Zum Test wechseln
            </Link>
          </div>
        ) : (
          <div className="submissions-list">
            {submissions.map((submission, index) => (
              <div key={submission.id} className="submission-card">
                {/* Nummer */}
                <div className="submission-number">#{index + 1}</div>

                {/* Haupt-Inhalt */}
                <div className="submission-content">
                  <div className="submission-title">
                    <h3>{submission.testTitle}</h3>
                    {submission.testDescription && (
                      <p className="submission-description">
                        {submission.testDescription}
                      </p>
                    )}
                  </div>

                  <div className="submission-stats">
                    <div className="stat">
                      <span className="label">Ergebnis:</span>
                      <span className="value">
                        {submission.correctCount} / {submission.totalQuestions}
                      </span>
                    </div>

                    <div className="stat">
                      <span className="label">Genauigkeit:</span>
                      <span
                        className="value accuracy"
                        style={{
                          color: getAccuracyColor(submission.accuracy)
                        }}
                      >
                        {submission.accuracy}%
                      </span>
                    </div>

                    <div className="stat">
                      <span className="label">Status:</span>
                      <span
                        className="value status"
                        style={{
                          color: submission.accuracy >= 70 ? '#22c55e' : '#ef4444'
                        }}
                      >
                        {getPassStatus(submission.accuracy)}
                      </span>
                    </div>
                  </div>

                  <div className="submission-date">
                    📅 {formatDate(submission.submittedAt)}
                  </div>
                </div>

                {/* Fortschrittsanzeige */}
                <div className="accuracy-bar">
                  <div
                    className="accuracy-fill"
                    style={{
                      width: `${submission.accuracy}%`,
                      backgroundColor: getAccuracyColor(submission.accuracy)
                    }}
                  ></div>
                </div>

                {/* Details-Link */}
                <Link
                  to={`/submission/${submission.id}`}
                  className="btn-details"
                  title="Details anschauen"
                >
                  Details →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer mit Links */}
      <div className="dashboard-footer">
        <Link to="/tests" className="btn-secondary">
          ← Zu Tests
        </Link>
      </div>
    </div>
  );
}
