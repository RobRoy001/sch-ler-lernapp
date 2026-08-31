import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

export default function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { testId } = useParams();
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ergebnisse aus useLocation
    if (location.state) {
      setResults(location.state);
      setLoading(false);
    } else {
      // Fallback
      setResults({
        score: 3,
        totalPoints: 5,
        accuracy: 60,
        message: '💪 Gute Anstrengung!'
      });
      setLoading(false);
    }
  }, [location]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div>Lädt Ergebnisse...</div>
      </div>
    );
  }

  const accuracy = results?.accuracy || 0;
  
  const getMotivation = (acc) => {
    if (acc >= 90) return '🏆 Outstanding! Du bist ein Meister!';
    if (acc >= 80) return '🌟 Sehr gut! Weiter so!';
    if (acc >= 70) return '👍 Gut gemacht! Du machst Fortschritte!';
    if (acc >= 60) return '💪 Gute Anstrengung! Nächstes Mal wird\'s besser!';
    return '📚 Weiter üben! Du schaffst das!';
  };

  const getColor = (acc) => {
    if (acc >= 90) return '#10b981';
    if (acc >= 80) return '#3b82f6';
    if (acc >= 70) return '#f59e0b';
    if (acc >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const color = getColor(accuracy);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center'
      }}>
        {/* Celebration */}
        <div style={{
          fontSize: '100px',
          marginBottom: '24px',
          animation: 'bounce 0.6s ease-in-out'
        }}>
          {accuracy >= 70 ? '🎉' : '📚'}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '36px',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '16px'
        }}>
          {accuracy >= 70 ? 'Glückwunsch!' : 'Test abgeschlossen!'}
        </h1>

        {/* Motivation */}
        <p style={{
          fontSize: '20px',
          color: color,
          marginBottom: '32px',
          fontWeight: '600'
        }}>
          {getMotivation(accuracy)}
        </p>

        {/* Score Card */}
        <div style={{
          backgroundColor: '#1e293b',
          border: `2px solid ${color}`,
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px'
        }}>
          {/* Accuracy Circle */}
          <div style={{
            position: 'relative',
            width: '150px',
            height: '150px',
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="150" height="150" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="75" cy="75" r="65" fill="none" stroke="#334155" strokeWidth="8" />
              <circle
                cx="75"
                cy="75"
                r="65"
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeDasharray={`${(accuracy / 100) * 408.4} 408.4`}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: color }}>
                {accuracy}%
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Genauigkeit</div>
            </div>
          </div>

          {/* Score Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginTop: '24px'
          }}>
            <div style={{
              padding: '16px',
              backgroundColor: '#0f172a',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px' }}>
                {results?.score || 0}/{results?.totalPoints || 5}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Richtig beantwortet</div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: '#0f172a',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: color, marginBottom: '4px' }}>
                {results?.totalPoints || 5}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Fragen insgesamt</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexDirection: 'column'
        }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '16px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            🏠 Zum Dashboard
          </button>

          <button
            onClick={() => navigate('/upload')}
            style={{
              padding: '16px 24px',
              backgroundColor: '#475569',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#64748b'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#475569'}
          >
            📚 Neuen Test starten
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}