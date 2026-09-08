import React from 'react';
import { Footprints, Droplets, Eye } from 'lucide-react';

// ✅ Healthy-Break-Warnung (2026-09-08, siehe claude/LernApp-UI-UX-Design-
// Mockups.md, Abschnitt "UX PATTERNS & MODALS"). Bewusst KEIN erzwungener
// Stopp - "Weitermachen" bleibt immer möglich (siehe dortige Usability-
// Notiz "Respekt für User-Autonomie"), das Modal ist eine Erinnerung, keine
// Sperre. Im echten, hellen App-Design umgesetzt statt im abweichenden
// dunklen Mockup-Look (gleiche Begründung wie bei OnboardingPage.jsx).
const TIPS = [
  { icon: Footprints, text: 'Kurz aufstehen und ein paar Schritte gehen' },
  { icon: Droplets, text: 'Ein Glas Wasser trinken' },
  { icon: Eye, text: 'Für 20 Sekunden auf etwas Entferntes schauen' }
];

function formatDuration(ms) {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} Min.`;
  return `${hours} Std. ${minutes} Min.`;
}

export default function HealthyBreakModal({ stats, onTakeBreak, onKeepGoing, onRemindLater }) {
  return (
    <div
      className="fixed inset-0 bg-gray-900/40 flex items-center justify-center px-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="healthy-break-title"
    >
      <div className="w-full max-w-sm bg-cream border border-gray-100 rounded-lg p-8 shadow-xl text-center animate-fadeInUp">
        <div className="text-4xl mb-3" aria-hidden="true">
          😴
        </div>
        <h2 id="healthy-break-title" className="font-display text-xl font-bold text-gray-900 mb-1">
          Gute Arbeit!
        </h2>
        <p className="text-gray-500 text-sm mb-5">
          Du lernst schon eine Weile durchgehend - Zeit für eine kurze Pause?
        </p>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="border border-gray-100 rounded-md py-2.5">
            <span className="block font-display font-bold text-gray-900 text-sm">
              {formatDuration(stats.activeMs)}
            </span>
            <span className="block text-gray-400 text-[11px]">gelernt</span>
          </div>
          <div className="border border-gray-100 rounded-md py-2.5">
            <span className="block font-display font-bold text-gray-900 text-sm">
              {stats.submissions}
            </span>
            <span className="block text-gray-400 text-[11px]">
              {stats.submissions === 1 ? 'Test' : 'Tests'}
            </span>
          </div>
          <div className="border border-gray-100 rounded-md py-2.5">
            <span className="block font-display font-bold text-gray-900 text-sm">
              {stats.avgAccuracy !== null ? `${stats.avgAccuracy}%` : '–'}
            </span>
            <span className="block text-gray-400 text-[11px]">Erfolg</span>
          </div>
        </div>

        <div className="space-y-2 mb-6 text-left">
          {TIPS.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-gray-600">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary shrink-0">
                <Icon size={14} />
              </span>
              {text}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onTakeBreak}
          className="w-full bg-primary hover:bg-primary-dark text-white font-semibold rounded-md py-2.5 transition mb-2"
        >
          Pause machen
        </button>
        <button
          type="button"
          onClick={onKeepGoing}
          className="w-full border border-gray-200 text-gray-500 hover:bg-gray-50 font-medium rounded-md py-2.5 transition mb-2 text-sm"
        >
          Weitermachen
        </button>
        <button
          type="button"
          onClick={onRemindLater}
          className="text-gray-400 hover:text-gray-600 text-xs font-medium"
        >
          Später erinnern
        </button>
      </div>
    </div>
  );
}
