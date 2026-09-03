// httpOnly Cookie-Handling für JWT-Tokens (Sicherheitsaudit Mittel #16)
//
// Vorher: Token wurde im Frontend per localStorage gespeichert - anfällig
// für XSS-Attacken (jedes JavaScript mit Zugriff auf die Seite konnte das
// Token lesen und missbrauchen).
//
// Neu: Das Token wird per httpOnly-Cookie vom Server gesetzt. JavaScript
// kann das Cookie nicht lesen (httpOnly), aber der Browser schickt es
// automatisch mit jedem Request mit (wenn credentials: 'include' gesetzt
// ist). Das ist deutlich sicherer gegen XSS.
//
// SameSite:
// - local dev (localhost): SameSite=Lax erlaubt, weil alles auf einer Domain
// - production (cross-domain): SameSite=None;Secure erforderlich, damit
//   Browser das Cookie auch bei Cross-Origin-Requests mitschickt

const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 Tage, wie JWT expiresIn

function isProdEnv() {
  return process.env.NODE_ENV === 'production';
}

function setAuthCookie(res, token) {
  const sameSite = isProdEnv() ? 'None' : 'Lax';
  const secure = isProdEnv(); // Secure flag nur in production (https erforderlich)

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: COOKIE_MAX_AGE_SECONDS * 1000, // in Millisekunden
    path: '/',
    domain: undefined // Browser default: aktuelle Domain
  });
}

function clearAuthCookie(res) {
  res.cookie(COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProdEnv(),
    sameSite: isProdEnv() ? 'None' : 'Lax',
    maxAge: 0,
    path: '/'
  });
}

function getTokenFromCookies(req) {
  // Cookie-Header format: "name1=value1; name2=value2; ..."
  // Einfacher Parser ohne 'cookie-parser' dependency
  if (!req.headers.cookie) return undefined;

  const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    acc[name] = value;
    return acc;
  }, {});

  return cookies[COOKIE_NAME];
}

module.exports = {
  setAuthCookie,
  clearAuthCookie,
  getTokenFromCookies
};
