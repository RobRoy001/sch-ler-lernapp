// Idempotentes Schema-Bootstrap für neue Tabellen (Eltern-Board 2026-09-03,
// Lehrer-Portal 2026-09-03).
//
// Es gibt in diesem Projekt kein Migrations-Framework (siehe store.js-
// Kommentar zum bestehenden Schema) - bisherige Schema-Änderungen liefen
// über lose .sql-Dateien, die jemand manuell im Supabase-Dashboard ausführen
// musste. Für neue Tabellen reicht das nicht: es gibt keinen direkten
// DB-Zugriff außerhalb dieses Node-Prozesses (nur er kennt die echte
// DATABASE_URL). Deshalb legt der Server beim Start selbst die fehlenden
// Tabellen an - CREATE TABLE IF NOT EXISTS ist sicher wiederholbar, bei
// jedem weiteren Deploy passiert einfach nichts, wenn die Tabellen schon
// existieren.

const { query } = require('./connection');

async function runMigrations() {
  await query(`
    CREATE TABLE IF NOT EXISTS parents (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // Eine aktive Verknüpfung Elternteil <-> Kind. "status" statt hartem
  // Löschen beim Entziehen (Sicherheitsaudit-Prinzip: nachvollziehbar statt
  // stillschweigend weg - siehe Settings "Verknüpfte Eltern" -> Entfernen).
  await query(`
    CREATE TABLE IF NOT EXISTS parent_child_links (
      id SERIAL PRIMARY KEY,
      parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
      child_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMP,
      UNIQUE (parent_id, child_id)
    )
  `);

  // ---- Lehrer-Portal (2026-09-03, siehe claude/Lehrer-Portal-Konzept) ----

  await query(`
    CREATE TABLE IF NOT EXISTS teachers (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // Eine Lehrkraft kann mehrere Klassen/Kurse anlegen, jede mit eigenem
  // teilbarem Code. subscription_status steht laut Konzept bewusst auf
  // 'free' - die eigentliche Zahlungsabwicklung (Sammel-Zahlungslink an die
  // Eltern) ist ein eigenständiges, späteres Projekt (siehe Konzept-Doku
  // Abschnitt 5), Phase 1 baut hier nur das Datenfeld vor.
  await query(`
    CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      class_code VARCHAR(20) UNIQUE NOT NULL,
      subscription_status VARCHAR(50) NOT NULL DEFAULT 'free',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // Join-Tabelle statt fixer class_id-Spalte auf users: eine Schülerin/ein
  // Schüler kann potenziell mehreren Klassencodes beitreten (z.B. nutzen
  // verschiedene Lehrkräfte für verschiedene Fächer Kapiert unabhängig
  // voneinander) - gleiche Begründung wie bei parent_child_links.
  await query(`
    CREATE TABLE IF NOT EXISTS class_memberships (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      student_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (class_id, student_user_id)
    )
  `);

  // Lehrer-eigene Uploads: eigenständige Tabelle statt Wiederverwendung von
  // "sources" (dort ist der Owner immer ein einzelner Schüler/user_id) -
  // hier ist der Owner eine Klasse, die Ergebnisse betreffen potenziell
  // viele Schüler:innen. "test" hat dieselbe JSON-Struktur wie sources.test.
  await query(`
    CREATE TABLE IF NOT EXISTS class_sources (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      teacher_id INTEGER NOT NULL REFERENCES teachers(id),
      title VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      progress INTEGER NOT NULL DEFAULT 0,
      test JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  // Trackt, wer aus der Klasse einen class_source-Test bereits gemacht hat
  // und wie - für die Fortschrittsansicht der Lehrkraft.
  await query(`
    CREATE TABLE IF NOT EXISTS class_source_submissions (
      id SERIAL PRIMARY KEY,
      class_source_id INTEGER NOT NULL REFERENCES class_sources(id) ON DELETE CASCADE,
      student_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      correct_count INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      accuracy INTEGER NOT NULL,
      submitted_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  // ✅ Fix (2026-09-06): Klassenarbeiten über den Klassencode-Pfad
  // (routes/classes.js) hatten bisher weder eine Fragen-Detailansicht noch
  // den Vertiefungsmodus - beides wurde nur für den individuellen
  // Schüler-Upload gebaut (routes/processing.js). "answers_json" trägt hier
  // dieselbe Form wie test_submissions.answers_json (siehe dortiger
  // Kommentar): je Frage question_id/answer/is_correct/topic/question_text/
  // correct_answer/explanation.
  await query(`
    ALTER TABLE class_source_submissions ADD COLUMN IF NOT EXISTS answers_json JSONB
  `);

  // ✅ Draft/Publish für Klassenarbeiten (2026-09-07, siehe LernApp-Vollaudit
  // Plan für nächste Woche Punkt 17): vorher war eine Klassenarbeit sofort
  // nach dem Anlegen für die ganze Klasse sichtbar, sobald die KI-
  // Generierung fertig war (status='completed') - die Lehrkraft konnte die
  // generierten Fragen nicht mehr vorher gegenprüfen. "visibility" ist
  // bewusst ein eigenes Feld statt "status" (mit)zubenutzen: "status"
  // beschreibt den Verarbeitungszustand (pending/completed), "visibility"
  // eine davon unabhängige redaktionelle Entscheidung der Lehrkraft
  // (draft/published) - ein fertig generierter Test kann bewusst als Draft
  // liegen bleiben, ein noch nicht fertiger ist nie sichtbar, unabhängig
  // vom visibility-Wert (siehe Sichtbarkeits-Check in routes/classes.js).
  // DEFAULT 'published' gilt nur für die Spalten-Befüllung bestehender
  // Zeilen bei diesem ALTER TABLE (Postgres füllt sie automatisch) - damit
  // bleiben bereits laufende Klassenarbeiten für Schüler:innen weiterhin
  // sichtbar. Neue Zeilen setzen "draft" explizit in createClassSource()
  // (store.js), der Spalten-Default greift für sie also nie.
  await query(`
    ALTER TABLE class_sources ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'published'
  `);

  // ---- Zahlungen/Stripe (2026-09-04, siehe LernApp-Vollaudit-2026-09-03.md,
  // Plan für nächste Woche) ----
  //
  // "users" ist eine der drei Legacy-Tabellen, die nicht über dieses
  // Migrations-System entstanden sind (siehe store.js-Kommentar am
  // Dateianfang) - ADD COLUMN IF NOT EXISTS funktioniert trotzdem genauso
  // sicher/wiederholbar wie CREATE TABLE IF NOT EXISTS oben, solange die
  // Tabelle selbst schon existiert.
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)
  `);
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) NOT NULL DEFAULT 'free'
  `);
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255)
  `);
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP
  `);
  // ✅ Fix (2026-09-06): Robert kündigte sein Test-Abo im Stripe-
  // Kundenportal - Stripe kündigt zum Periodenende (cancel_at_period_end),
  // der Status bleibt bis dahin "active". Ohne dieses Feld zeigte die App
  // weiterhin "Verlängert sich am ...", obwohl das Abo tatsächlich ausläuft
  // und sich NICHT automatisch verlängert - siehe routes/billing.js
  // applySubscriptionToUser() und frontend SettingsPage.jsx.
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT false
  `);

  // Eigene Tabelle statt Wiederverwendung von "sources": ein Kauf ist kein
  // Upload, sondern ein Zahlungsvorgang, der potenziell mehrfach pro Nutzer
  // vorkommt (jeder Vertiefungsmodus-Einzelkauf ist ein eigener Datensatz).
  // "topic" ist bewusst nullable - der Vertiefungsmodus selbst (Themen-Tags
  // pro Frage, siehe Preismodell-Dokument Abschnitt 4) ist noch nicht
  // gebaut, das Feld ist hier schon vorgesehen, um beim späteren Bau keine
  // weitere Schema-Änderung zu brauchen.
  await query(`
    CREATE TABLE IF NOT EXISTS purchases (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stripe_checkout_session_id VARCHAR(255) UNIQUE,
      stripe_payment_intent_id VARCHAR(255),
      product_type VARCHAR(50) NOT NULL,
      topic VARCHAR(255),
      amount_cents INTEGER,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP
    )
  `);
  // ✅ Fix (2026-09-06): Robert wollte den Vertiefungsmodus-Einzelkauf nicht
  // pro einzelnem Schwachthema abrechnen (das Preismodell-Dokument sah das
  // ursprünglich so vor), sondern EINMAL pro Test - ein Kauf schaltet dann
  // ALLE in diesem Test erkannten Schwachthemen frei. Der Kauf braucht dafür
  // einen Bezug zum Test statt zu einem einzelnen Themen-Text, siehe
  // routes/billing.js (createPurchase) und routes/processing.js
  // (computeWeakTopics/loadDeepeningAccess). "topic" bleibt als Spalte
  // erhalten (nur noch informativ, für die Kaufhistorie), ist aber nicht
  // mehr die Freischaltungs-Bedingung.
  await query(`
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS submission_id INTEGER REFERENCES test_submissions(id) ON DELETE SET NULL
  `);
  // ✅ Fix (2026-09-06): eigene, parallele Bezugsspalte für Käufe im
  // Klassen-Pfad (Klassenarbeit über Klassencode statt eigenem Upload) -
  // bewusst NICHT dieselbe Spalte wie submission_id, weil test_submissions
  // und class_source_submissions getrennte ID-Räume sind (dieselbe Zahl
  // könnte in beiden Tabellen vorkommen, aber eine andere Zeile meinen).
  await query(`
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS class_source_submission_id INTEGER REFERENCES class_source_submissions(id) ON DELETE SET NULL
  `);

  // ---- Vertiefungsmodus (2026-09-06, siehe LernApp-Preismodell-Nachhilfe-
  // Klassenmodell-2026-09-02.md Abschnitt 4) ----
  //
  // Ein Datensatz pro generierter Vertiefung zu einem Schwachthema:
  // KI-Erklärung + 3-5 neue Übungsfragen (dienen zugleich als Nachtest, siehe
  // routes/deepening.js-Kommentar für die bewusste Vereinfachung ggü. dem
  // Konzept-Dokument). "submission_id" verweist auf den Test, bei dem das
  // Thema als Schwäche erkannt wurde, ist aber NICHT die alleinige
  // Zugriffs-Bedingung: Freischaltung läuft über users.subscription_status
  // ('active' = Pro/Familie/Klassen-Abo, unbegrenzt) oder eine passende
  // completed-Zeile in purchases (product_type='vertiefung', topic-Text
  // exakt übereinstimmend, siehe Kommentar in deepening.js zu den Grenzen
  // dieses einfachen String-Abgleichs).
  await query(`
    CREATE TABLE IF NOT EXISTS deepenings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      submission_id INTEGER REFERENCES test_submissions(id) ON DELETE SET NULL,
      topic VARCHAR(255) NOT NULL,
      explanation TEXT NOT NULL,
      practice_questions JSONB NOT NULL,
      retest_correct_count INTEGER,
      retest_total INTEGER,
      retest_completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  // ✅ Fix (2026-09-06): Vertiefungsmodus jetzt auch für Klassenarbeiten
  // (Klassencode-Pfad) nutzbar - gleiche Begründung wie bei
  // purchases.class_source_submission_id oben, eigener Bezug statt
  // submission_id mitzubenutzen (getrennte ID-Räume).
  await query(`
    ALTER TABLE deepenings ADD COLUMN IF NOT EXISTS class_source_submission_id INTEGER REFERENCES class_source_submissions(id) ON DELETE SET NULL
  `);

  // ✅ Fix (2026-09-06): Robert gibt beim Hochladen einen eigenen Titel ein
  // ("z.B. Mathe Klausur - Kapitel 5"), der aber nirgends gespeichert wurde -
  // "sources" hatte keine title-Spalte, das Dashboard/Ergebnisse zeigten
  // deshalb immer nur den hartkodierten Platzhalter "Generierter Test" statt
  // dem, was Robert tatsächlich eingegeben hat.
  await query(`
    ALTER TABLE sources ADD COLUMN IF NOT EXISTS title VARCHAR(255)
  `);

  console.log('✅ Eltern-Board Tabellen geprüft/angelegt (parents, parent_child_links).');
  console.log('✅ Lehrer-Portal Tabellen geprüft/angelegt (teachers, classes, class_memberships, class_sources, class_source_submissions).');
  console.log('✅ Zahlungs-Spalten/Tabellen geprüft/angelegt (users.stripe_*, purchases).');
  console.log('✅ Vertiefungsmodus-Tabelle geprüft/angelegt (deepenings).');
  console.log('✅ sources.title Spalte geprüft/angelegt.');
  console.log('✅ Vertiefungsmodus/AnswerReview für Klassenarbeiten geprüft/angelegt (class_source_submissions.answers_json, purchases/deepenings.class_source_submission_id).');
  console.log('✅ Draft/Publish für Klassenarbeiten geprüft/angelegt (class_sources.visibility).');

  // ---- Klassen-Abo-Sammelzahlung (2026-09-07, siehe LernApp-Preismodell-
  // Nachhilfe-Klassenmodell-2026-09-02.md Abschnitt 3.2) ----
  //
  // WICHTIG (bereits im Konzept entschieden, hier nur umgesetzt): jede
  // Familie bezahlt für ihr eigenes Kind einzeln (Sammel-Zahlungslink an die
  // Eltern) - die Lehrkraft zahlt NICHT für die ganze Klasse vor. Rechtlich
  // nötig, weil Minderjährige selbst keinen Zahlungsvertrag eingehen können
  // (§§107/108 BGB) - jede Familie wird eigener Vertragspartner. Technisch
  // bedeutet das: derselbe kind-initiierte Checkout-Ablauf wie beim
  // bestehenden Einzel-Pro-Abo (routes/billing.js POST /checkout,
  // authCheck = Kind-Login, KEIN separates Eltern-Login/-Registrierung
  // nötig - siehe routes/parent.js, dort gibt es bewusst keine eigenständige
  // Registrierungs-Route), nur mit einem neuen product type 'klassenabo',
  // einem ermäßigten Stripe-Preis und einer zusätzlichen Mitgliedschafts-
  // Prüfung (die zahlende Person muss tatsächlich Mitglied dieser Klasse
  // sein).
  //
  // Eigene, parallele Bezugsspalte statt submission_id/
  // class_source_submission_id mitzubenutzen - ein Klassen-Abo-Kauf gehört
  // zu einer Klasse, nicht zu einer einzelnen Klassenarbeit/einem
  // Testergebnis.
  await query(`
    ALTER TABLE purchases ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL
  `);

  console.log('✅ Klassen-Abo-Sammelzahlung geprüft/angelegt (purchases.class_id).');
}

module.exports = { runMigrations };
