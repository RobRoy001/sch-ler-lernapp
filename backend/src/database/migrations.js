// Idempotentes Schema-Bootstrap für neue Tabellen (Eltern-Board, 2026-09-03).
//
// Es gibt in diesem Projekt kein Migrations-Framework (siehe store.js-
// Kommentar zum bestehenden Schema) - bisherige Schema-Änderungen liefen
// über lose .sql-Dateien, die jemand manuell im Supabase-Dashboard ausführen
// musste. Für die neuen Eltern-Tabellen reicht das nicht: es gibt keinen
// direkten DB-Zugriff außerhalb dieses Node-Prozesses (nur er kennt die
// echte DATABASE_URL). Deshalb legt der Server beim Start selbst die
// fehlenden Tabellen an - CREATE TABLE IF NOT EXISTS ist sicher
// wiederholbar, bei jedem weiteren Deploy passiert einfach nichts, wenn die
// Tabellen schon existieren.

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

  console.log('✅ Eltern-Board Tabellen geprüft/angelegt (parents, parent_child_links).');
}

module.exports = { runMigrations };
