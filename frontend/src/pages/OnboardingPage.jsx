import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  BookOpen,
  Camera,
  Sparkles,
  BarChart3,
  ShieldCheck,
  Trophy,
  ArrowRight,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { LogoWithText } from '../components/Logo';
import { API_BASE_URL } from '../config/api';

// ✅ Onboarding-Flow (2026-09-08, siehe claude/LernApp-UI-UX-Design-Mockups.md
// Abschnitt "1. ONBOARDING FLOW"): fehlte im echten Code bisher komplett -
// das Mockup-Dokument beschreibt nur eine Design-Vorlage (in einer anderen,
// dunklen Glassmorphism-Optik), keine Implementierung. Hier bewusst im
// TATSÄCHLICH im Rest der App verwendeten hellen "cream/canvas"-Design
// (siehe RegisterPage.jsx/LoginPage.jsx) umgesetzt statt dem Mockup-Look 1:1
// zu folgen - ein zweiter, abweichender visueller Stil nur für diese fünf
// Screens wäre inkonsistenter gewesen als ein leichter Stilbruch zum
// älteren Mockup-Dokument.
//
// Zeigt sich genau einmal pro Konto: server.js setzt onboarding_completed
// bei der Registrierung auf false (Spalten-Default ist true, siehe
// migrations.js), App.jsx blendet diese Seite ein, solange das Flag false
// ist, und ruft nach Abschluss/Überspringen POST /api/auth/complete-onboarding.
//
// Bewusst KEIN neues KI-Nutzungs-Opt-in-System im Consent-Schritt: es gibt
// bereits eine Einwilligungs-Checkbox direkt beim Hochladen (siehe
// UploadPage.jsx "aiConsent") - der Schritt hier erklärt nur, was passiert,
// er ersetzt oder dupliziert diese Einwilligung nicht.
const TOTAL_STEPS = 5;

const FEATURES = [
  {
    icon: Upload,
    title: 'Hochladen',
    text: 'Arbeitsblatt oder Zusammenfassung als PDF hochladen'
  },
  {
    icon: Sparkles,
    title: 'KI erstellt Test',
    text: 'Automatisch passende Übungsfragen dazu'
  },
  {
    icon: BarChart3,
    title: 'Fortschritt sehen',
    text: 'Erkennt, wo noch Lücken sind'
  }
];

const PROCESS_STEPS = [
  { icon: Upload, title: 'Hochladen', text: 'PDF von deinem Arbeitsblatt oder deiner Zusammenfassung' },
  { icon: Sparkles, title: 'KI liest mit', text: 'Erstellt in ein bis zwei Minuten passende Fragen dazu' },
  { icon: CheckCircle2, title: 'Test machen', text: 'Multiple Choice, Lückentext oder Vokabeln - du entscheidest' },
  { icon: BarChart3, title: 'Auswerten', text: 'Zeigt genau, welches Thema noch wackelt' }
];

function StepDots({ step }) {
  return (
    <div className="flex justify-center gap-1.5 mb-6" aria-hidden="true">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === step ? 'w-6 bg-primary' : 'w-1.5 bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

function SkipLink({ onSkip }) {
  return (
    <button
      type="button"
      onClick={onSkip}
      className="text-gray-400 hover:text-gray-600 text-xs font-medium"
    >
      Überspringen
    </button>
  );
}

export default function OnboardingPage({ user, onComplete }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [firstAction, setFirstAction] = useState('pdf');
  const [privacyAck, setPrivacyAck] = useState(false);
  const [saving, setSaving] = useState(false);

  const finish = async (redirectTo) => {
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/auth/complete-onboarding`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      // Onboarding-Status ist rein kosmetisch (blendet nur diesen Flow aus) -
      // ein fehlgeschlagener Request soll den Nutzer nicht aufhalten. Im
      // schlimmsten Fall sieht er den Flow beim nächsten Login noch einmal.
      console.error('Onboarding-Abschluss konnte nicht gespeichert werden:', error);
    } finally {
      if (onComplete) onComplete();
      navigate(redirectTo, { replace: true });
    }
  };

  const cardClass = 'bg-cream border border-gray-100 rounded-lg p-8 shadow-lg';
  const primaryBtn =
    'w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-md py-2.5 transition disabled:opacity-40 disabled:cursor-not-allowed';
  const secondaryBtn =
    'flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm font-medium';

  return (
    <div className="min-h-screen bg-gradient-to-br from-canvas via-primary-light/20 to-canvas flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-fadeInUp">
        <div className="flex justify-center mb-6">
          <LogoWithText size={40} textClassName="text-2xl" />
        </div>

        {step > 0 && <StepDots step={step} />}

        {/* Schritt 1: Willkommen */}
        {step === 0 && (
          <div className={cardClass}>
            <h1 className="font-display text-2xl font-bold text-gray-900 mb-2 text-center">
              Willkommen{user?.name ? `, ${user.name}` : ''}!
            </h1>
            <p className="text-gray-500 text-center text-sm mb-6">
              Kapiert? macht aus deinen Unterlagen in Minuten einen Übungstest
              - und zeigt dir, was du noch üben solltest.
            </p>
            <div className="space-y-3 mb-6">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex items-start gap-3 border border-gray-100 rounded-md p-3">
                  <span className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary shrink-0">
                    <Icon size={18} />
                  </span>
                  <span>
                    <span className="block font-semibold text-gray-900 text-sm">{title}</span>
                    <span className="block text-gray-500 text-xs">{text}</span>
                  </span>
                </div>
              ))}
            </div>
            <button type="button" className={primaryBtn} onClick={() => setStep(1)}>
              Los geht's <ArrowRight size={16} />
            </button>
            <div className="flex justify-center mt-4">
              <SkipLink onSkip={() => finish('/')} />
            </div>
          </div>
        )}

        {/* Schritt 2: So funktioniert's */}
        {step === 1 && (
          <div className={cardClass}>
            <h2 className="font-display text-xl font-bold text-gray-900 mb-1 text-center">
              So funktioniert's
            </h2>
            <p className="text-gray-500 text-center text-sm mb-6">Vier Schritte, fertig</p>
            <div className="space-y-4 mb-6">
              {PROCESS_STEPS.map(({ icon: Icon, title, text }, i) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-semibold text-gray-900 text-sm">{title}</span>
                    <span className="block text-gray-500 text-xs">{text}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button type="button" className={secondaryBtn} onClick={() => setStep(0)}>
                <ArrowLeft size={16} /> Zurück
              </button>
              <SkipLink onSkip={() => finish('/')} />
            </div>
            <button type="button" className={`${primaryBtn} mt-4`} onClick={() => setStep(2)}>
              Weiter <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Schritt 3: Erste Aktion wählen */}
        {step === 2 && (
          <div className={cardClass}>
            <h2 className="font-display text-xl font-bold text-gray-900 mb-1 text-center">
              Womit willst du starten?
            </h2>
            <p className="text-gray-500 text-center text-sm mb-6">
              Kannst du später jederzeit ändern
            </p>
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() => setFirstAction('pdf')}
                className={`w-full flex items-center gap-4 text-left border rounded-md p-4 transition ${
                  firstAction === 'pdf'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-primary hover:bg-primary/5'
                }`}
              >
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                  <Upload size={20} />
                </span>
                <span>
                  <span className="block font-semibold text-gray-900">Eigenes PDF hochladen</span>
                  <span className="block text-gray-500 text-sm">Arbeitsblatt oder Zusammenfassung</span>
                </span>
              </button>

              <div className="w-full flex items-center gap-4 text-left border border-gray-100 rounded-md p-4 opacity-50 cursor-not-allowed">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-400 shrink-0">
                  <BookOpen size={20} />
                </span>
                <span>
                  <span className="block font-semibold text-gray-500">Buchkatalog</span>
                  <span className="block text-gray-400 text-sm">Bald verfügbar</span>
                </span>
              </div>

              <div className="w-full flex items-center gap-4 text-left border border-gray-100 rounded-md p-4 opacity-50 cursor-not-allowed">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-400 shrink-0">
                  <Camera size={20} />
                </span>
                <span>
                  <span className="block font-semibold text-gray-500">Foto machen</span>
                  <span className="block text-gray-400 text-sm">In Vorbereitung</span>
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button type="button" className={secondaryBtn} onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Zurück
              </button>
              <SkipLink onSkip={() => finish('/')} />
            </div>
            <button type="button" className={`${primaryBtn} mt-4`} onClick={() => setStep(3)}>
              Weiter <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Schritt 4: Datenschutz-Hinweis */}
        {step === 3 && (
          <div className={cardClass}>
            <h2 className="font-display text-xl font-bold text-gray-900 mb-1 text-center">
              Kurz zum Datenschutz
            </h2>
            <p className="text-gray-500 text-center text-sm mb-6">
              Ehrlich und ohne Kleingedrucktes
            </p>
            <div className="border border-gray-100 rounded-md p-4 mb-4 flex items-start gap-3">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary shrink-0">
                <ShieldCheck size={18} />
              </span>
              <p className="text-gray-600 text-sm">
                Ein hochgeladenes Dokument wird zur Testerstellung an eine
                KI (OpenAI) geschickt. Vor jedem einzelnen Upload fragen wir
                das noch einmal konkret ab - hier geht es nur darum, dass du
                das vorher schon einmal gelesen hast.
              </p>
            </div>
            <p className="text-gray-500 text-xs text-center mb-4">
              Details stehen in der{' '}
              <a
                href="/datenschutz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Datenschutzerklärung
              </a>
              .
            </p>
            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyAck}
                onChange={(e) => setPrivacyAck(e.target.checked)}
                className="mt-1 w-4 h-4 accent-primary shrink-0"
              />
              <span className="text-gray-700 text-sm">
                Ich habe das gelesen und verstanden.
              </span>
            </label>
            <div className="flex items-center justify-between">
              <button type="button" className={secondaryBtn} onClick={() => setStep(2)}>
                <ArrowLeft size={16} /> Zurück
              </button>
            </div>
            <button
              type="button"
              className={`${primaryBtn} mt-4`}
              disabled={!privacyAck}
              onClick={() => setStep(4)}
            >
              Weiter <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Schritt 5: Fertig */}
        {step === 4 && (
          <div className={`${cardClass} text-center`}>
            <div className="flex justify-center mb-4">
              <span className="flex items-center justify-center w-16 h-16 rounded-full bg-success/10 text-success animate-bounceIn">
                <Trophy size={32} />
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Fertig!
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              {firstAction === 'pdf'
                ? 'Lade dein erstes Dokument hoch, dann geht der Rest von allein.'
                : 'Ab zum Dashboard - von dort aus kommst du überall hin.'}
            </p>
            <button
              type="button"
              className={primaryBtn}
              disabled={saving}
              onClick={() => finish(firstAction === 'pdf' ? '/upload' : '/')}
            >
              {saving ? 'Einen Moment…' : firstAction === 'pdf' ? 'Jetzt PDF hochladen' : 'Zum Dashboard'}
              <ArrowRight size={16} />
            </button>
            {firstAction === 'pdf' && (
              <button
                type="button"
                disabled={saving}
                className="text-gray-400 hover:text-gray-600 text-xs font-medium mt-4"
                onClick={() => finish('/')}
              >
                Später - erstmal zum Dashboard
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
