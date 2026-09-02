// Zentrales JWT-Secret für den gesamten Backend-Prozess. Wird ausschließlich
// aus process.env.JWT_SECRET gelesen (siehe Sicherheitsaudit Befund 13 -
// niemals ein Secret im Code hartcodieren, wie es die tote Datei
// backend/src/middleware/auth.js vorher tat).
//
// Falls in backend/.env kein JWT_SECRET gesetzt ist, wird für diesen
// Prozess-Lauf einmalig ein zufälliges Secret erzeugt (nie in eine Datei
// geschrieben). Das reicht für lokale Entwicklung, macht aber alle
// bestehenden Logins beim nächsten Server-Neustart ungültig - für stabile
// Logins JWT_SECRET in backend/.env setzen, z. B. mit:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const crypto = require('crypto');

let secret = process.env.JWT_SECRET;
if (!secret) {
  secret = crypto.randomBytes(32).toString('hex');
  console.warn(
    '⚠️  JWT_SECRET ist nicht in backend/.env gesetzt. Es wird ein zufälliges ' +
    'Secret nur für diesen Prozess-Lauf verwendet - alle Logins werden beim ' +
    'nächsten Server-Neustart ungültig. Für stabile Logins JWT_SECRET in ' +
    'backend/.env setzen.'
  );
}

module.exports = { JWT_SECRET: secret };