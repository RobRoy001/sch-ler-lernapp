// Echte Datenbankverbindung (Supabase/Postgres) - Sicherheitsaudit Befund 10.
//
// Vorher: mockStore.js hielt alles nur in einer In-Memory-Map. Das ist bei
// JEDEM Server-Neustart (z.B. jedem Deploy auf Railway) komplett weg -
// Konten, hochgeladene Inhalte, Testergebnisse, alles. Ab jetzt läuft alles
// über eine echte Postgres-Datenbank bei Supabase, siehe store.js.
//
// DATABASE_URL kommt aus der .env-Datei und wird NIE hier hardcodiert
// (gleiches Prinzip wie schon bei JWT_SECRET, siehe config/jwt.js). Man
// findet die Verbindungs-URL im Supabase-Dashboard unter
// Project Settings -> Database -> Connection string. Empfohlen ist die
// "Connection pooling" Variante (Port 6543, enthält "pooler" im Hostnamen) -
// die funktioniert zuverlässiger aus Umgebungen wie Railway heraus als die
// direkte Verbindung.
//
// Es gibt hier bewusst KEINEN Mock-Fallback mehr: sobald DATABASE_URL fehlt
// oder falsch ist, schlagen DB-Zugriffe mit einem klaren Fehler fehl, statt
// still im Hintergrund wieder Daten zu verlieren.

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn(
    '⚠️  DATABASE_URL ist nicht gesetzt. Ohne diese Umgebungsvariable ' +
    '(z.B. in backend/.env) kann sich der Server nicht mit der Datenbank ' +
    'verbinden - Login, Registrierung, Uploads etc. schlagen dann fehl.'
  );
}

// Supabase verlangt eine TLS-Verbindung. Das von Supabase ausgestellte
// Zertifikat ist zwar echt, aber node-postgres kennt die Zertifikatskette
// standardmäßig nicht -> rejectUnauthorized:false ist hier vertretbar, weil
// wir uns ausschließlich mit der von Supabase selbst vergebenen, festen
// Adresse verbinden (kein vom Nutzer beeinflussbarer Host). Für eine rein
// lokale Postgres-Instanz (z.B. "localhost" beim lokalen Testen ohne
// Supabase) wird TLS dagegen ausgeschaltet, weil ein lokaler Postgres-Server
// normalerweise gar kein SSL anbietet.
const connectionString = process.env.DATABASE_URL;
const isLocal = connectionString && /localhost|127\.0\.0\.1/.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

// Ein einzelner Fehler auf einer einzelnen (idle) Verbindung im Pool soll
// nicht den ganzen Server abschießen (das machte die alte, unbenutzte
// Version dieser Datei über process.exit(-1) - hier nur noch loggen).
pool.on('error', (err) => {
  console.error('[DB] Unerwarteter Fehler am Postgres-Pool:', err.message);
});

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };