const rateLimit = require('express-rate-limit');

// Sicherheitsaudit Hoch #7: Rate Limiting wurde bereits einmal als
// "Week 1 Complete" committed - der Code in server.js verlangte damals
// require('../middleware/rateLimiter') und require('../middleware/
// rateLimitLogger'), aber diese Dateien wurden nie tatsächlich erstellt.
// Ein Folgecommit hat server.js komplett neu geschrieben und dabei Rate
// Limiting stillschweigend wieder entfernt - im zuletzt deployten Code gab
// es also nie funktionierendes Rate Limiting, trotz gegenteiliger
// Commit-Historie. Diese Datei existiert jetzt wirklich.

// Allgemeiner Basisschutz für alle /api-Routen gegen groben DoS/Missbrauch.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 200,
  standardHeaders: true, // sendet RateLimit-* Header
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte versuche es in ein paar Minuten erneut.' }
});

// Deutlich strengerer Schutz speziell für Login/Registrierung gegen
// Brute-Force-Angriffe auf Passwörter bzw. automatisiertes Massen-Anlegen
// von Konten (Audit-Empfehlung: 5 Versuche / 15 Minuten).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anmeldeversuche. Bitte warte 15 Minuten und versuche es erneut.' }
});

module.exports = { apiLimiter, authLimiter };