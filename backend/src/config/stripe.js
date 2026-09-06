// Zentrale Stripe-Konfiguration (siehe claude/LernApp-Vollaudit-2026-09-03.md,
// Plan für nächste Woche, Punkt "Vertiefungsmodus/Zahlungsanbieter").
//
// Genauso wie bei JWT_SECRET (config/jwt.js) und RESEND_API_KEY
// (config/email.js) wird hier NICHTS hartcodiert - alles kommt aus
// process.env. Ohne gesetzten STRIPE_SECRET_KEY ist Stripe schlicht
// deaktiviert (isConfigured: false), die Billing-Routen antworten dann mit
// einer klaren Fehlermeldung statt mit einem kryptischen Absturz - so kann
// der Rest der App auch ohne fertig eingerichtetes Stripe-Konto laufen.
//
// Robert muss vor dem Live-Test in Stripe (Dashboard -> Produkte) zwei
// Produkte anlegen und deren Price-IDs hier als Env-Vars eintragen:
//   1. "Kapiert Pro" - wiederkehrend/jährlich -> STRIPE_PRICE_PRO
//   2. "Vertiefungsmodus" - einmalig, 2,49 € -> STRIPE_PRICE_VERTIEFUNG
// Siehe Kommentar in routes/billing.js für den genauen Ablauf inkl.
// Webhook-Einrichtung.

const Stripe = require('stripe');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO;
const STRIPE_PRICE_VERTIEFUNG = process.env.STRIPE_PRICE_VERTIEFUNG;

const isConfigured = Boolean(STRIPE_SECRET_KEY);

if (!isConfigured) {
  console.warn(
    '⚠️  STRIPE_SECRET_KEY ist nicht gesetzt - Zahlungen (Pro-Abo, ' +
    'Vertiefungsmodus) sind deaktiviert. Betrifft nicht den Rest der App.'
  );
}

// Stripe-SDK-Instanz nur erzeugen, wenn ein Key da ist - ein leerer String
// würde die SDK selbst crashen lassen, nicht erst beim ersten API-Aufruf.
const stripe = isConfigured ? new Stripe(STRIPE_SECRET_KEY) : null;

module.exports = {
  stripe,
  isConfigured,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_PRO,
  STRIPE_PRICE_VERTIEFUNG
};
