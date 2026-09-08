import React from 'react';

// Zentrale Card-Komponente — extrahiert aus:
//   "bg-white border border-gray-100 rounded-lg p-5 shadow-sm"   (weiße Cards)
//   "bg-cream border border-gray-100 rounded-lg p-5 shadow-sm"   (Cream-Cards,
//     z.B. Mitgliederliste, Upload-Formular)
//
// tone="accent" deckt die farbigen Info-Boxen ab (Klassencode-Box,
// Abo-Hinweis-Box), die im bestehenden Code mit z.B. "bg-primary/5
// border border-primary/20" gebaut wurden.

const TONES = {
  default: 'bg-white border border-gray-100',
  muted: 'bg-cream border border-gray-100',
  accent: 'bg-primary/5 border border-primary/20',
  accentWarm: 'bg-accent/5 border border-accent/20',
};

export default function Card({
  tone = 'default',
  padding = 'p-5',
  shadow = true,
  className = '',
  children,
  ...props
}) {
  return (
    <div
      className={[
        'rounded-lg',
        TONES[tone],
        padding,
        shadow ? 'shadow-sm' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
