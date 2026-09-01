import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

export default function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { testId } = useParams();

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (location.state) {
      setResults(location.state);
      setLoading(false);
    } else {
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
      <div className="min-h-screen bg-canvas flex items-center justify-center text-gray-500">
        Lädt Ergebnisse…
      </div>
    );
  }

  const accuracy = results?.accuracy || 0;
  const isPerfect = accuracy >= 100;

  const getMotivation = (acc) => {
    if (acc >= 90) return '🏆 Outstanding! Du bist ein Meister!';
    if (acc >= 80) return '🌟 Sehr gut! Weiter so!';
    if (acc >= 70) return '👍 Gut gemacht! Du machst Fortschritte!';
    if (acc >= 60) return '💪 Gute Anstrengung! Nächstes Mal wird\'s besser!';
    return '📚 Weiter üben! Du schaffst das!';
  };

  // Tailwind-safe color tokens (defined in tailwind.config.js)
  const getColorClasses = (acc) => {
    if (acc >= 90) return { text: 'text-success', ring: '#10B981', border: 'border-success' };
    if (acc >= 70) return { text: 'text-primary', ring: '#2563EB', border: 'border-primary' };
    if (acc >= 60) return { text: 'text-accent', ring: '#F97316', border: 'border-accent' };
    return { text: 'text-error', ring: '#DC2626', border: 'border-error' };
  };

  const color = getColorClasses(accuracy);
  const circumference = 408.4;

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-5 py-10">
      <div className="max-w-lg w-full text-center">
        {/* Celebration */}
        <div className={`text-8xl mb-6 ${isPerfect ? 'animate-bounceIn' : ''}`}>
          {isPerfect ? '🏆' : accuracy >= 70 ? '🎉' : '📚'}
        </div>

        {/* Title */}
        <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          {isPerfect ? 'Perfekt gelöst!' : accuracy >= 70 ? 'Glückwunsch!' : 'Test abgeschlossen!'}
        </h1>

        {/* Motivation */}
        <p className={`text-lg font-semibold mb-8 ${color.text}`}>
          {getMotivation(accuracy)}
        </p>

        {/* Score Card */}
        <div className={`bg-cream border-2 ${color.border} rounded-lg p-8 mb-8 shadow-md`}>
          {/* Accuracy Circle */}
          <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
            <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90">
              <circle cx="75" cy="75" r="65" fill="none" stroke="#E5E7EB" strokeWidth="8" />
              <circle
                cx="75"
                cy="75"
                r="65"
                fill="none"
                stroke={color.ring}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(accuracy / 100) * circumference} ${circumference}`}
                style={{ transition: 'stroke-dasharray 0.6s ease-out' }}
              />
            </svg>
            <div className="absolute text-center">
              <div className={`text-3xl font-display font-bold ${color.text}`}>
                {accuracy}%
              </div>
              <div className="text-xs text-gray-400">Genauigkeit</div>
            </div>
          </div>

          {/* Score Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-md">
              <div className="text-2xl font-display font-bold text-primary mb-1">
                {results?.score || 0}/{results?.totalPoints || 5}
              </div>
              <div className="text-xs text-gray-400">Richtig beantwortet</div>
            </div>

            <div className="p-4 bg-white rounded-md">
              <div className={`text-2xl font-display font-bold mb-1 ${color.text}`}>
                {results?.totalPoints || 5}
              </div>
              <div className="text-xs text-gray-400">Fragen insgesamt</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/')}
            className="py-3.5 px-6 bg-primary hover:bg-primary-dark text-white rounded-md font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            🏠 Zum Dashboard
          </button>

          <button
            onClick={() => navigate('/upload')}
            className="py-3.5 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-semibold transition"
          >
            📚 Neuen Test starten
          </button>
        </div>
      </div>
    </div>
  );
}
