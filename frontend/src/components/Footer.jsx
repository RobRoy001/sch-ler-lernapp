import React from 'react';
import { Link } from 'react-router-dom';

// Bisher verlinkt keine der neuen Seiten (Lehrer-Portal, Klassen-Ansicht,
// Klassen-Abo) zu /datenschutz oder /impressum — beide Seiten existieren
// laut Vollaudit bereits (DRAFT_MODE, wartet auf echte Geschäftsdaten),
// sind von dort aus aber nicht erreichbar. Dieser Footer schließt die Lücke,
// ohne den bestehenden Seiten Kopfzeilen/Chrome aufzuzwingen — einfach am
// Ende von max-w-2xl mx-auto einfügen.

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="max-w-2xl mx-auto mt-12 pt-6 border-t border-gray-100">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-400">
        <Link to="/datenschutz" className="hover:text-gray-600 transition">
          Datenschutz
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/impressum" className="hover:text-gray-600 transition">
          Impressum
        </Link>
        <span aria-hidden="true">·</span>
        <Link to="/agb" className="hover:text-gray-600 transition">
          AGB
        </Link>
      </div>
      <p className="text-center text-[11px] text-gray-300 mt-3">
        © {year} Kapiert?
      </p>
    </footer>
  );
}
