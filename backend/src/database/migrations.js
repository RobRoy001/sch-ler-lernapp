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

  console.log('✅ Eltern-Board Tabellen geprüft/angelegt (parents, parent_child_links).');
  console.log('✅ Lehrer-Portal Tabellen geprüft/angelegt (teachers, classes, class_memberships, class_sources, class_source_submissions).');
}

module.exports = { runMigrations };
