// Zentrale API-Basis-URL für das gesamte Frontend.
//
// Lokal (npm run dev) zeigt das automatisch auf den lokalen Backend-Server
// (localhost:5000) - genau das, was zum Testen der Befund-1-Fixes nötig ist.
// Vorher war die Produktions-URL (Railway) in >10 Dateien fest verdrahtet,
// wodurch der lokale Frontend-Server IMMER gegen die Live-Produktion lief,
// egal ob der lokale Backend-Server lief oder nicht - das war die Ursache
// des "NetworkError when attempting to fetch resource"-Fehlers beim Login
// (die Railway-CORS-Konfiguration lässt nur die Vercel-Produktions-URL als
// Origin zu, nicht http://localhost:5173, wodurch der Browser den Request
// blockiert und Firefox das als generischen NetworkError anzeigt).
//
// Für den Produktions-Build (Vercel) wird VITE_API_URL über
// frontend/.env.production gesetzt, damit dieselbe Codebasis ohne
// Codeänderung weiterhin gegen Railway läuft.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';