import React from 'react';

// Zentrale Button-Komponente — extrahiert aus den wiederholten Inline-Klassen
// in LehrerKlassePage.jsx, KlassePage.jsx und KlassenAboPage.jsx.
// Ziel: ein Ort für Farbe/Radius/Hover-Verhalten statt N Kopien.
//
// Varianten entsprechen 1:1 dem, was im Code bereits benutzt wurde,
// nur jetzt an einer Stelle:
//   primary   -> "Klassenarbeit erstellen", "Test starten", Checkout-CTA
//   secondary -> "Zurückziehen", "Nochmal ansehen" (weißer Button mit Border)
//   outline   -> "Kopieren"-Buttons (Klassencode, Abo-Link)
//   success   -> "Klassenarbeit abschicken"
//   danger    -> für Lösch-/Abbrechen-Aktionen (noch ungenutzt, aber im
//                Design-System als Error-Rot definiert)

const VARIANTS = {
  primary: 'bg-primary hover:bg-primary-dark text-white',
  secondary: 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700',
  outline: 'bg-white border border-primary/30 hover:bg-primary-light text-primary',
  outlineAccent: 'bg-white border border-accent/30 hover:bg-accent/10 text-accent-dark',
  success: 'bg-success hover:bg-success-dark text-white',
  danger: 'bg-error hover:bg-error-dark text-white',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-sm h-11',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  loadingText = 'Wird geladen…',
  icon: Icon,
  iconClassName = '',
  disabled = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading ? loadingText : (
        <>
          {Icon && <Icon size={size === 'sm' ? 14 : 16} className={iconClassName} />}
          {children}
        </>
      )}
    </button>
  );
}
