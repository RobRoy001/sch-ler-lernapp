const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const { getParentTokenFromCookies } = require('../utils/cookies');

// Eltern-Board (2026-09-03): eigene Middleware für Eltern-Sessions, analog
// zu authCheck.js für Kind-Konten, aber bewusst als eigene Datei statt
// Wiederverwendung derselben Funktion - Eltern- und Kind-Token kommen aus
// unterschiedlichen Cookies ("parent_token" vs. "token", siehe
// utils/cookies.js) und tragen unterschiedliche Payloads (parentId statt
// userId). Die Nutzeridentität wird auch hier ausschließlich aus dem
// signierten Token abgeleitet, nie aus einem vom Client frei wählbaren
// Parameter (gleiches Prinzip wie Sicherheitsaudit Kritisch #3).
function parentAuthCheck(req, res, next) {
  const token = getParentTokenFromCookies(req);
  if (!token) {
    return res.status(401).json({ error: 'Anmeldung als Elternteil erforderlich' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'parent') {
      return res.status(401).json({ error: 'Ungültiger Token-Typ' });
    }
    req.parent = { id: decoded.parentId, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token ungültig oder abgelaufen' });
  }
}

module.exports = parentAuthCheck;
