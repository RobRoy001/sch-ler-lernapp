import React from 'react';
import { Loader2 } from 'lucide-react';

// Zentraler Loading-State — extrahiert aus dem Block, der wortwörtlich in
// LehrerKlassePage.jsx, KlassePage.jsx und KlassenAboPage.jsx stand:
//
//   <div className="min-h-screen bg-canvas flex items-center justify-center">
//     <p className="text-gray-500 font-body">Wird geladen…</p>
//   </div>
//
// fullScreen=true  -> exakt dieser Seiten-Ladezustand (Standard)
// fullScreen=false -> kompakte Inline-Variante für z.B. innerhalb einer Card
//                      (ersetzt den Clock-Spinner aus KlassePage.jsx bei
//                      testLoading)

export default function LoadingSpinner({
  fullScreen = true,
  text = 'Wird geladen…',
  className = '',
}) {
  if (fullScreen) {
    return (
      <div className={`min-h-screen bg-canvas flex items-center justify-center ${className}`}>
        <p className="text-gray-500 font-body">{text}</p>
      </div>
    );
  }

  return (
    <div className={`text-center py-12 text-gray-500 ${className}`}>
      <Loader2 size={32} className="mx-auto mb-2 animate-spin" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
