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
//
// Erweiterung (Eltern-Board, 2026-09-03): Ein Elternteil hat eine eigene
// Login-Identität, komplett getrennt vom Kind-Konto. Damit ein Elternteil
// und ein Kind gleichzeitig auf demselben Gerät eingeloggt sein können
// (z.B. Eltern schauen sich das Eltern-Board an, während das Kind auf
// demselben Rechner sein eigenes Konto offen hat), bekommt der Elternteil
// ein EIGENES Cookie ("parent_token") statt das bestehende "token"-Cookie
// zu überschreiben.
//
// Erweiterung (Lehrer-Portal, 2026-09-03): gleiches Muster für Lehrkräfte -
// eigenes Cookie ("teacher_token"), damit z.B. ein Lehrer-Laptop im
// Klassenzimmer parallel zu einer Schüler-Session genutzt werden kann. Alle
// drei Cookies teilen sich dieselben Sicherheits-Einstellungen
// (httpOnly/secure/sameSite) - nur der Name unterscheidet sie.

const COOKIE_NAME = 'token';
const PARENT_COOKIE_NAME = 'parent_token';
const TEACHER_COOKIE_NAME = 'teacher_token';
const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 Tage, wie JWT expiresIn

function isProdEnv() {
  return process.env.NODE_ENV === 'production';
}

function buildCookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: isProdEnv(), // Secure flag nur in production (https erforderlich)
    sameSite: isProdEnv() ? 'None' : 'Lax',
    maxAge: maxAgeMs, // in Millisekunden
    path: '/',
    domain: undefined // Browser default: aktuelle Domain
  };
}

function setCookie(res, name, token) {
  res.cookie(name, token, buildCookieOptions(COOKIE_MAX_AGE_SECONDS * 1000));
}

function clearCookie(res, name) {
  res.cookie(name, '', buildCookieOptions(0));
}

function getCookieValue(req, name) {
  // Cookie-Header format: "name1=value1; name2=value2; ..."
  // Einfacher Parser ohne 'cookie-parser' dependency
  if (!req.headers.cookie) return undefined;

  const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
    const [cname, value] = cookie.trim().split('=');
    acc[cname] = value;
    return acc;
  }, {});

  return cookies[name];
}

// Kind-Konto (unverändert seit Sicherheitsaudit Mittel #16)
function setAuthCookie(res, token) {
  setCookie(res, COOKIE_NAME, token);
}

function clearAuthCookie(res) {
  clearCookie(res, COOKIE_NAME);
}

function getTokenFromCookies(req) {
  return getCookieValue(req, COOKIE_NAME);
}

// Eltern-Konto (Eltern-Board, 2026-09-03)
function setParentAuthCookie(res, token) {
  setCookie(res, PARENT_COOKIE_NAME, token);
}

function clearParentAuthCookie(res) {
  clearCookie(res, PARENT_COOKIE_NAME);
}

function getParentTokenFromCookies(req) {
  return getCookieValue(req, PARENT_COOKIE_NAME);
}

// Lehrer-Konto (Lehrer-Portal, 2026-09-03)
function setTeacherAuthCookie(res, token) {
  setCookie(res, TEACHER_COOKIE_NAME, token);
}

function clearTeacherAuthCookie(res) {
  clearCookie(res, TEACHER_COOKIE_NAME);
}

function getTeacherTokenFromCookies(req) {
  return getCookieValue(req, TEACHER_COOKIE_NAME);
}

module.exports = {
  setAuthCookie,
  clearAuthCookie,
  getTokenFromCookies,
  setParentAuthCookie,
  clearParentAuthCookie,
  getParentTokenFromCookies,
  setTeacherAuthCookie,
  clearTeacherAuthCookie,
  getTeacherTokenFromCookies
};
