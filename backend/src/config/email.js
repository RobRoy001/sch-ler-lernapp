// Mock Mode für Email-Versand (gleiche Idee wie config/jwt.js für den
// JWT-Secret): es ist noch kein echter Email-Anbieter (SMTP, SendGrid,
// Resend, ...) angebunden. Diese Datei ist die EINZIGE Stelle im Code, die
// später auf einen echten Versand umgestellt werden müsste - der Rest der
// App ruft nur sendParentConsentEmail(...) auf und muss sich um das "wie"
// nicht kümmern.
//
// Bis dahin wird nichts wirklich verschickt, sondern der Inhalt inkl. Link
// deutlich sichtbar in die Server-Konsole geschrieben. Zum lokalen Testen:
// Link aus dem Terminal kopieren und im Browser öffnen.
//
// WICHTIG für den echten Betrieb: ohne echten Email-Versand bekommen Eltern
// den Zustimmungs-Link NIE zugestellt. Das ist dann kein Nice-to-have mehr,
// sondern macht die Altersverifizierung nach Art. 8 DSGVO wirkungslos.

async function sendParentConsentEmail(parentEmail, consentUrl, childName) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📧 ELTERN-ZUSTIMMUNGS-EMAIL (Mock Mode - kein echter Versand) ║
╠══════════════════════════════════════════════════════════════╣
║ An:      ${parentEmail}
║ Betreff: Zustimmung zur Registrierung von ${childName} bei Kapiert?
║
║ Link zum Bestätigen (7 Tage gültig):
║ ${consentUrl}
╚══════════════════════════════════════════════════════════════╝
`);
  return { mocked: true };
}

module.exports = { sendParentConsentEmail };