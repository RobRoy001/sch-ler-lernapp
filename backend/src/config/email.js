// Email-Versand für den Elternzustimmungs-Link (Art. 8 DSGVO).
//
// Läuft über Resend (https://resend.com) via deren HTTP-API - bewusst ohne
// zusätzliches npm-Paket, ein einfacher fetch()-Aufruf reicht (Node 18+
// bringt fetch schon eingebaut mit).
//
// Ohne gesetzten RESEND_API_KEY (z.B. lokal in der Entwicklung) fällt die
// Funktion automatisch auf den alten Mock-Modus zurück (Link nur in die
// Konsole schreiben) - so bleibt lokales Arbeiten ohne eigenen API-Key
// möglich, und ein fehlender Key in einer Umgebung führt nicht zu einem
// Absturz.
//
// WICHTIG (Stand 2026-09-03): ohne eine bei Resend verifizierte eigene
// Domain akzeptiert Resend nur Test-Mails an die eigene, bei Resend
// registrierte Account-Email - an andere Adressen (also an echte Eltern)
// schlägt der Versand mit einem 403 fehl. Für den echten Betrieb muss dafür
// erst eine eigene Domain verifiziert werden (siehe RESEND_FROM_EMAIL unten).
// Bis dahin wird ein Fehlschlag hier abgefangen und wie im Mock-Modus
// zusätzlich in die Konsole geloggt, damit der Link trotzdem nutzbar bleibt
// (server.js fängt einen Fehler aus sendParentConsentEmail ohnehin schon ab
// und lässt die Registrierung trotzdem durchlaufen).

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Ohne verifizierte eigene Domain MUSS die Absenderadresse exakt
// "onboarding@resend.dev" sein - das ist Resends fester Test-Absender.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Kapiert? <onboarding@resend.dev>';

function logMockEmail(parentEmail, consentUrl, childName, reason) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📧 ELTERN-ZUSTIMMUNGS-EMAIL ${reason ? `(${reason})` : '(Mock Mode - kein echter Versand)'}
╠══════════════════════════════════════════════════════════════╣
║ An:      ${parentEmail}
║ Betreff: Zustimmung zur Registrierung von ${childName} bei Kapiert?
║
║ Link zum Bestätigen (7 Tage gültig):
║ ${consentUrl}
╚══════════════════════════════════════════════════════════════╝
`);
}

async function sendParentConsentEmail(parentEmail, consentUrl, childName) {
  // Kein API-Key gesetzt (z.B. lokale Entwicklung) → wie bisher nur loggen.
  if (!RESEND_API_KEY) {
    logMockEmail(parentEmail, consentUrl, childName);
    return { mocked: true };
  }

  const html = `
    <p>Hallo,</p>
    <p><strong>${childName}</strong> hat sich bei <strong>Kapiert?</strong> registriert.
    Da ${childName} unter 16 Jahre alt ist, benötigen wir gemäß Art. 8 DSGVO deine
    Zustimmung als Erziehungsberechtigte(r), bevor das Konto genutzt werden kann.</p>
    <p><a href="${consentUrl}">Zustimmung erteilen</a></p>
    <p>Der Link ist 7 Tage gültig. Falls du diese Registrierung nicht erwartet hast,
    kannst du diese Email einfach ignorieren.</p>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [parentEmail],
        subject: `Zustimmung zur Registrierung von ${childName} bei Kapiert?`,
        html
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Resend antwortete mit ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    console.log(`✅ Eltern-Zustimmungs-Email an ${parentEmail} verschickt (Resend-ID: ${data.id})`);
    return { mocked: false, id: data.id };
  } catch (error) {
    // Häufigster Fall aktuell: keine verifizierte Domain → Resend lehnt
    // Empfänger ab, die nicht die eigene Account-Email sind (403). Damit
    // der Consent-Link trotzdem nutzbar bleibt (z.B. für weitere Tests),
    // hier zusätzlich wie im Mock-Modus loggen statt nur den Fehler zu werfen.
    console.error('⚠️  Echter Email-Versand über Resend fehlgeschlagen:', error.message);
    logMockEmail(parentEmail, consentUrl, childName, 'Fallback nach Resend-Fehler, siehe Log oberhalb');
    return { mocked: true, error: error.message };
  }
}

module.exports = { sendParentConsentEmail };
