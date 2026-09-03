// Wraps async route handlers to catch unhandled Promise rejections
// and pass them to Express's error handler (Sicherheitsaudit Befund #9)
//
// Vorher: ein einzelner unbehandelter Fehler in einem async Endpoint
// würde den kompletten Server crashen, weil Express nichts vom abgelehnteten
// Promise erfährt - nur wenn das Promise explizit in einem .catch() oder
// try/catch landet, kann Express es intercepten.
//
// Mit dieser Wrapper-Funktion wird jeder Fehler aus dem async Handler
// automatisch an next(err) weitergeleitet - das ist der Standard-Weg,
// wie Express Fehler an seinen globalen Error Handler schickt.

function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
