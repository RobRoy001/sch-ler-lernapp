const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

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
function authCheck(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
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