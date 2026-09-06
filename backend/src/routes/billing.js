// Zahlungen über Stripe (2026-09-04, siehe claude/LernApp-Vollaudit-2026-09-03.md,
// Plan für nächste Woche). Erster Baustein: reine Zahlungs-Abwicklung
// (Checkout, Webhook, Status, Kundenportal). Der eigentliche Vertiefungs-
// modus (Themen-Tags pro Frage, Schwachstellen-Erkennung, Vertiefungs-
// Erklärung + Nachtest, siehe claude/LernApp-Preismodell-Nachhilfe-
// Klassenmodell-2026-09-02.md Abschnitt 4) ist noch NICHT gebaut - dieser
// Router schafft nur die Bezahlschranke selbst, damit beides unabhängig
// voneinander entwickelt werden kann.
//
// ---- Was Robert im Stripe-Dashboard einmalig einrichten muss ----
// 1. Stripe-Konto erstellen (nur er selbst, nicht per Tool automatisierbar).
// 2. Zwei Produkte anlegen (Dashboard -> Produktkatalog):
//    a) "Kapiert Pro" - wiederkehrend, jährlich, ca. 40 € -> Price-ID als
//       STRIPE_PRICE_PRO in Railway setzen.
//    b) "Vertiefungsmodus" - einmalig, 2,49 € -> Price-ID als
//       STRIPE_PRICE_VERTIEFUNG in Railway setzen.
// 3. STRIPE_SECRET_KEY (Dashboard -> Entwickler -> API-Schlüssel) als
//    Railway-Variable setzen.
// 4. Webhook-Endpoint im Stripe-Dashboard anlegen, Ziel-URL:
//    https://web-production-adfb70.up.railway.app/api/billing/webhook
//    Events: checkout.session.completed, customer.subscription.updated,
//    customer.subscription.deleted. Das dabei angezeigte Signing Secret
//    (beginnt mit "whsec_") als STRIPE_WEBHOOK_SECRET in Railway setzen.
//
// Ohne diese vier Schritte bleibt /api/billing/* mit 503 deaktiviert (siehe
// config/stripe.js, isConfigured) - der Rest der App läuft unabhängig davon
// normal weiter.

const express = require('express');
const router = express.Router();
const authCheck = require('../middleware/authCheck');
const asyncHandler = require('../utils/asyncHandler');
const {
  stripe,
  isConfigured,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_PRO,
  STRIPE_PRICE_VERTIEFUNG
} = require('../config/stripe');
const {
  updateUser,
  findUserBillingStatus,
  findUserByStripeCustomerId,
  createPurchase,
  findPurchaseBySessionId,
  completePurchase,
  findPurchasesByUser
} = require('../store');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Kleine Zwischenschicht vor jeder Billing-Route: ohne Stripe-Konfiguration
// gibt es hier nichts sinnvoll zu tun, lieber eine klare Fehlermeldung als
// einen kryptischen Absturz beim ersten stripe.*-Aufruf weiter unten.
function requireStripeConfigured(req, res, next) {
  if (!isConfigured) {
    return res.status(503).json({ error: 'Zahlungen sind aktuell nicht verfügbar (Stripe nicht konfiguriert).' });
  }
  next();
}

// Holt die Stripe-Customer-ID des Nutzers, legt bei Bedarf einen neuen
// Stripe-Kunden an. Erst bei der ersten tatsächlichen Zahlung nötig - vorher
// hat kein Nutzer eine stripe_customer_id, das ist normal.
async function getOrCreateStripeCustomerId(userId, email) {
  const billing = await findUserBillingStatus(userId);
  if (billing?.stripe_customer_id) {
    return billing.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { userId: String(userId) }
  });
  await updateUser(userId, { stripe_customer_id: customer.id });
  return customer.id;
}

// ✅ POST /api/billing/checkout - Checkout-Session für Pro-Abo oder
// Vertiefungsmodus-Einzelkauf erstellen, gibt die Stripe-Checkout-URL
// zurück, zu der das Frontend weiterleitet.
router.post('/checkout', authCheck, requireStripeConfigured, asyncHandler(async (req, res) => {
  const { type, topic, submissionId } = req.body;

  if (type !== 'pro' && type !== 'vertiefung') {
    return res.status(400).json({ error: 'type muss "pro" oder "vertiefung" sein' });
  }
  if (type === 'vertiefung' && !topic) {
    return res.status(400).json({ error: 'topic ist für den Vertiefungsmodus-Einzelkauf erforderlich' });
  }

  const priceId = type === 'pro' ? STRIPE_PRICE_PRO : STRIPE_PRICE_VERTIEFUNG;
  if (!priceId) {
    // Robert hat Stripe zwar konfiguriert (Secret Key gesetzt), aber die
    // Price-ID für dieses Produkt noch nicht angelegt/eingetragen.
    return res.status(503).json({ error: `Produkt "${type}" ist noch nicht eingerichtet (fehlende Price-ID).` });
  }

  const customerId = await getOrCreateStripeCustomerId(req.user.id, req.user.email);

  // ✅ Vertiefungsmodus (2026-09-06): nach der Zahlung soll der Nutzer direkt
  // wieder auf der Ergebnisseite landen, bei der er das Thema freischalten
  // wollte, statt generisch in den Einstellungen - deshalb eigene
  // success_url für type "vertiefung", inkl. Thema als Query-Parameter,
  // damit die Ergebnisseite die Vertiefung direkt automatisch anstößt
  // (siehe frontend DeepeningPanel.jsx).
  const successUrl =
    type === 'vertiefung' && submissionId
      ? `${FRONTEND_URL}/results/${submissionId}?billing=success&topic=${encodeURIComponent(topic)}`
      : `${FRONTEND_URL}/settings?billing=success`;
  const cancelUrl =
    type === 'vertiefung' && submissionId
      ? `${FRONTEND_URL}/results/${submissionId}?billing=cancel`
      : `${FRONTEND_URL}/settings?billing=cancel`;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: type === 'pro' ? 'subscription' : 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: String(req.user.id),
      productType: type,
      topic: topic || ''
    }
  });

  // Für den Einzelkauf legen wir schon jetzt einen "pending"-Datensatz an,
  // damit der Webhook (siehe handleStripeWebhook unten) ihn per Session-ID
  // wiederfindet und auf "completed" setzt - beim Abo braucht es das nicht,
  // dessen Status steht direkt auf users.subscription_status.
  if (type === 'vertiefung') {
    await createPurchase({
      userId: req.user.id,
      stripeCheckoutSessionId: session.id,
      productType: 'vertiefung',
      topic: topic || null,
      amountCents: session.amount_total ?? null
    });
  }

  res.json({ url: session.url });
}));

// ✅ GET /api/billing/status - aktueller Abo-Status + abgeschlossene
// Einzelkäufe des eingeloggten Nutzers.
router.get('/status', authCheck, asyncHandler(async (req, res) => {
  let billing = await findUserBillingStatus(req.user.id);

  // ✅ Fix (2026-09-06): nicht blind auf die zuletzt per Webhook gespeicherten
  // Werte verlassen - Webhooks können (selten) verloren gehen, und das Feld
  // subscription_cancel_at_period_end existierte bei Roberts Test-Kündigung
  // noch gar nicht. Ein aktives Abo wird deshalb bei jedem Status-Abruf kurz
  // live bei Stripe nachgefragt und die DB direkt aufgefrischt - kein
  // zusätzlicher Zustand, der stillschweigend veralten kann. Nur EIN
  // zusätzlicher Stripe-Aufruf, ausschließlich beim Öffnen der
  // Einstellungen, kein spürbarer Mehraufwand.
  if (isConfigured && billing?.subscription_id) {
    try {
      const subscription = await stripe.subscriptions.retrieve(billing.subscription_id);
      await applySubscriptionToUser(req.user.id, subscription);
      billing = await findUserBillingStatus(req.user.id);
    } catch (err) {
      console.error('Konnte Abo-Status nicht live bei Stripe abgleichen, nutze zwischengespeicherten Stand:', err.message);
    }
  }

  const purchases = await findPurchasesByUser(req.user.id);

  res.json({
    subscriptionStatus: billing?.subscription_status || 'free',
    subscriptionCurrentPeriodEnd: billing?.subscription_current_period_end || null,
    // "active" bedeutet allein noch nicht "verlängert sich automatisch",
    // solange eine Kündigung zum Periodenende vorliegt - siehe
    // applySubscriptionToUser() unten und SettingsPage.jsx.
    subscriptionCancelAtPeriodEnd: billing?.subscription_cancel_at_period_end || false,
    purchases
  });
}));

// ✅ POST /api/billing/portal - Stripe-Kundenportal-Link (Abo verwalten/
// kündigen, Rechnungen einsehen) - nur nutzbar, wenn schon mindestens einmal
// bezahlt wurde (sonst gibt es keine stripe_customer_id).
router.post('/portal', authCheck, requireStripeConfigured, asyncHandler(async (req, res) => {
  const billing = await findUserBillingStatus(req.user.id);
  if (!billing?.stripe_customer_id) {
    return res.status(404).json({ error: 'Kein Stripe-Kundenkonto vorhanden (noch nichts gekauft).' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: billing.stripe_customer_id,
    return_url: `${FRONTEND_URL}/settings`
  });

  res.json({ url: session.url });
}));

// ---- Webhook-Handler ----
//
// WICHTIG: wird NICHT über den normalen express.json()-Parser aufgerufen,
// sondern in server.js mit express.raw() VOR dem globalen JSON-Parser
// registriert (siehe Kommentar dort). stripe.webhooks.constructEvent()
// braucht den unveränderten Roh-Body, um die Signatur zu prüfen - ein schon
// geparstes JSON-Objekt würde die Prüfung fehlschlagen lassen.
async function handleStripeWebhook(req, res) {
  if (!isConfigured || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send('Stripe-Webhook nicht konfiguriert');
  }

  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe-Webhook: ungültige Signatur -', err.message);
    return res.status(400).send(`Webhook-Signaturprüfung fehlgeschlagen: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        if (session.mode === 'payment') {
          // Vertiefungsmodus-Einzelkauf abschließen.
          const purchase = await findPurchaseBySessionId(session.id);
          if (purchase) {
            await completePurchase(purchase.id, session.payment_intent);
          } else {
            console.warn(`Stripe-Webhook: keine passende Purchase zu Session ${session.id} gefunden.`);
          }
        } else if (session.mode === 'subscription') {
          const userId = session.metadata?.userId ? parseInt(session.metadata.userId, 10) : null;
          if (userId) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            await applySubscriptionToUser(userId, subscription);
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const user = await findUserByStripeCustomerId(subscription.customer);
        if (user) {
          await applySubscriptionToUser(
            user.id,
            subscription,
            event.type === 'customer.subscription.deleted' ? 'canceled' : null
          );
        } else {
          console.warn(`Stripe-Webhook: kein Nutzer zu Stripe-Customer ${subscription.customer} gefunden.`);
        }
        break;
      }

      default:
        // Andere Events (z.B. invoice.payment_failed) bewusst noch nicht
        // ausgewertet - Phase-2-Arbeit, sobald der Vertiefungsmodus selbst
        // steht. Trotzdem 200 zurückgeben (siehe unten), sonst wiederholt
        // Stripe den Versand unnötig.
        break;
    }
  } catch (err) {
    console.error(`Stripe-Webhook: Fehler beim Verarbeiten von "${event.type}":`, err);
    // Bewusst NICHT 200 - bei einem echten Verarbeitungsfehler soll Stripe
    // automatisch erneut zustellen (Stripe wiederholt bei Nicht-2xx-Antwort).
    return res.status(500).send('Webhook-Verarbeitung fehlgeschlagen');
  }

  res.json({ received: true });
}

// Kleine Helper-Funktion, weil dieselbe Logik (Subscription-Felder auf den
// Nutzer schreiben) an zwei Stellen oben gebraucht wird. "current_period_end"
// liegt seit Stripes API-Version 2025-03-31 ("Basil") nicht mehr direkt auf
// dem Subscription-Objekt, sondern auf dem ersten Subscription-Item (siehe
// Stripe-Changelog "deprecate-subscription-current-period-start-and-end") -
// ein neu angelegtes Stripe-Konto 2026 nutzt standardmäßig diese oder eine
// neuere API-Version.
async function applySubscriptionToUser(userId, subscription, statusOverride) {
  const firstItem = subscription.items?.data?.[0];
  const periodEndUnix = firstItem?.current_period_end;

  await updateUser(userId, {
    subscription_status: statusOverride || subscription.status,
    subscription_id: subscription.id,
    subscription_current_period_end: periodEndUnix
      ? new Date(periodEndUnix * 1000).toISOString()
      : null,
    // ✅ Fix (2026-09-06): eine Kündigung im Stripe-Kundenportal setzt
    // "cancel_at_period_end" auf true, der subscription.status bleibt aber
    // bis zum Periodenende "active" - ohne dieses eigene Feld zeigte die
    // App fälschlich "Verlängert sich am ..." für ein bereits gekündigtes
    // Abo an (siehe GET /status oben, SettingsPage.jsx).
    subscription_cancel_at_period_end: Boolean(subscription.cancel_at_period_end)
  });
}

module.exports = { router, handleStripeWebhook };
