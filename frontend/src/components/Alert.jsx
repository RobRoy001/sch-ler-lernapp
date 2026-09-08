import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

// Bonus-Komponente, gleiche Motivation wie Button/Card/LoadingSpinner: die
// Erfolgs-/Fehler-Banner ("Zahlung erfolgreich!", "Bezahlvorgang
// abgebrochen", Fehlermeldungen) kommen in KlassePage.jsx und
// LehrerKlassePage.jsx mehrfach wortgleich vor, nur mit anderem Text.

const TONES = {
  error: {
    box: 'bg-error-light border-error/20 text-error-dark',
    icon: AlertTriangle,
  },
  success: {
    box: 'bg-success-light border-success/30 text-success-dark',
    icon: CheckCircle,
  },
  neutral: {
    box: 'bg-gray-100 border-gray-200 text-gray-600',
    icon: null,
  },
};

export default function Alert({ tone = 'error', onDismiss, children }) {
  const { box, icon: Icon } = TONES[tone];

  return (
    <div className={`flex items-start justify-between gap-3 border rounded-lg p-4 mb-6 ${box}`}>
      <div className="flex items-start gap-3">
        {Icon && <Icon size={18} className="flex-shrink-0 mt-0.5" />}
        <p className="text-sm">{children}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100 flex-shrink-0 transition">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
