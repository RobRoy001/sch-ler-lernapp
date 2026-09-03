const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const { getTeacherTokenFromCookies } = require('../utils/cookies');

// Lehrer-Portal (2026-09-03): eigene Middleware für Lehrer-Sessions, analog
// zu authCheck.js (Kind) und parentAuthCheck.js (Eltern). Eigenes Cookie
// ("teacher_token", siehe utils/cookies.js), eigene Payload (teacherId
// statt userId/parentId). Die Identität wird ausschließlich aus dem
// signierten Token abgeleitet, nie aus einem vom Client frei wählbaren
// Parameter (gleiches Prinzip wie Sicherheitsaudit Kritisch #3).
function teacherAuthCheck(req, res, next) {
  const token = getTeacherTokenFromCookies(req);
  if (!token) {
    return res.status(401).json({ error: 'Anmeldung als Lehrkraft erforderlich' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'teacher') {
      return res.status(401).json({ error: 'Ungültiger Token-Typ' });
    }
    req.teacher = { id: decoded.teacherId, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token ungültig oder abgelaufen' });
  }
}

module.exports = teacherAuthCheck;
