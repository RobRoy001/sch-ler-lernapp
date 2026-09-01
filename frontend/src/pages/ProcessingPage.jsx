import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function ProcessingPage() {
  const navigate = useNavigate();
  const { sourceId } = useParams();
  
  const [status, setStatus] = useState('processing');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Wird verarbeitet...');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!sourceId) {
      navigate('/');
      return;
    }

    // STEP 1: START PROCESSING
    const startProcessing = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('Kein Token!');
          setStatus('error');
          return;
        }

        console.log(`📝 Starte POST /process für Source ${sourceId}`);
        
        const response = await fetch(
          `https://web-production-adfb70.up.railway.app/api/processing/sources/${sourceId}/process`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Processing started:', data);
        setStarted(true);
      } catch (error) {
        console.error('❌ Start Error:', error);
        setStatus('error');
        setMessage(error.message);
      }
    };

    // STEP 2: CHECK STATUS EVERY 2 SECONDS
    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(
          `https://web-production-adfb70.up.railway.app/api/processing/sources/${sourceId}/status`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Status:', data.status, 'Progress:', data.progress);

        setStatus(data.status || 'processing');
        setProgress(data.progress || 0);
        setMessage(data.current_job || 'Wird verarbeitet...');

        // Wenn fertig - redirect
        if (data.status === 'completed') {
          console.log('✅ DONE! Redirect zu /test/' + sourceId);
          setTimeout(() => {
            navigate(`/test/${sourceId}`);
          }, 1000);
        }
      } catch (error) {
        console.error('❌ Status Error:', error);
      }
    };

    // Start processing sofort
    startProcessing();

    // Status checken alle 2 Sekunden (nach starten)
    const interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, [sourceId, navigate]);

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
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%'
      }}>
        {(status === 'processing' || status === 'pending') && (
          <div>
            <div style={{
              marginBottom: '40px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                border: '4px solid #334155',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
            </div>

            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '16px'
            }}>
              🔄 Verarbeitung läuft...
            </h1>

            <p style={{
              fontSize: '16px',
              color: '#cbd5e1',
              marginBottom: '32px'
            }}>
              Dein Test wird mit KI vorbereitet...
            </p>

            <div style={{
              backgroundColor: '#334155',
              borderRadius: '12px',
              overflow: 'hidden',
              height: '24px',
              marginBottom: '16px',
              border: '1px solid #475569'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#3b82f6',
                transition: 'width 0.3s ease',
                borderRadius: '12px'
              }}></div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: '#94a3b8',
              fontSize: '14px',
              marginBottom: '24px'
            }}>
              <span>{progress}%</span>
              <span>{message}</span>
            </div>

            <div style={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              padding: '16px',
              color: '#cbd5e1'
            }}>
              <p style={{ margin: '0', fontSize: '14px' }}>
                💡 Dies kann einige Minuten dauern - bitte nicht schließen!
              </p>
            </div>
          </div>
        )}

        {status === 'completed' && (
          <div>
            <div style={{ marginBottom: '40px', fontSize: '80px' }}>✅</div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '16px'
            }}>Fertig! 🎉</h1>
            <p style={{
              fontSize: '16px',
              color: '#cbd5e1',
              marginBottom: '24px'
            }}>Dein Test ist bereit - wird geladen...</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{ marginBottom: '40px', fontSize: '80px' }}>❌</div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '16px'
            }}>Fehler!</h1>
            <p style={{
              fontSize: '16px',
              color: '#fca5a5',
              marginBottom: '24px'
            }}>{message}</p>
            <button
              onClick={() => navigate('/upload')}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Zurück zum Upload
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}