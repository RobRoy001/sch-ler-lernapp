const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const { getTokenFromCookies } = require('../utils/cookies');

// Verifiziert den JWT und leitet die Nutzeridentität AUSSCHLIESSLICH aus dem
// signierten Token ab - nie aus einem vom Client frei wählbaren Parameter.
//
// Vorher (Sicherheitsaudit Kritisch #3): req.user = { id: req.query.userId
// || 1 } - jeder konnte per ?userId=<beliebig> fremde (Mock-)Daten fremder
// Nutzer abrufen, ganz ohne gültige Anmeldedaten. Das war ein vollständiger
// Autorisierungs-Bypass by design.
//
// Diese Middleware wird jetzt von content.js UND processing.js gemeinsam
// genutzt statt in beiden Dateien separat (und leicht abweichend) definiert
// zu sein (siehe Befund 20: Code-Duplikation als Fehlerquelle).
//
// ✅ Sicherheitsaudit Mittel #16 (JWT in localStorage): das Token kommt
// jetzt primär aus einem httpOnly-Cookie (siehe utils/cookies.js) statt aus
// einem vom Frontend mitgeschickten Authorization-Header - das Frontend
// liest/speichert das Token gar nicht mehr selbst. Der Authorization-Header
// bleibt als Fallback bestehen (bewusst, keine Sicherheitsverschlechterung
// - das Frontend nutzt ihn nicht mehr), damit die API weiterhin einfach mit
// Tools wie curl/Postman getestet werden kann, ohne einen echten Browser-
// Cookie-Flow nachzubauen.

function authCheck(req, res, next) {
  const token = getTokenFromCookies(req) || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentifizierung erforderlich' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token ungültig oder abgelaufen' });
  }
}

module.exports = authCheck;
