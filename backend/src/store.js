// Ersetzt mockStore.js: exakt dieselben Funktionsnamen und Rückgabeformen
// wie vorher, aber nicht mehr In-Memory, sondern über echtes Postgres
// (Supabase) - siehe Sicherheitsaudit Befund 10 "Echte Datenbank".
//
// WICHTIG: alle Funktionen hier sind jetzt async (liefern ein Promise).
// Jeder Aufruf an anderer Stelle (server.js, routes/content.js,
// routes/processing.js) braucht deshalb ein "await" davor.
//
// Das SQL-Schema für die hier verwendeten Tabellen (users, sources,
// test_submissions) liegt in backend/database/schema.sql - das muss einmal
// im Supabase SQL-Editor ausgeführt werden, bevor das hier funktioniert.

const { query } = require('./database/connection');

// ---- Nutzer ----

function mapUserRow(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    grade_level: row.grade_level,
    dateOfBirth: row.date_of_birth,
    parentEmail: row.parent_email,
    ageVerified: row.age_verified,
    parentConsentToken: row.parent_consent_token,
    parentConsentExpires: row.parent_consent_expires,
    parentConsentAt: row.parent_consent_at,
    accountStatus: row.account_status,
    createdAt: row.created_at
  };
}

async function createUser({
  email,
  passwordHash,
  name,
  grade_level,
  dateOfBirth = null,
  parentEmail = null,
  ageVerified = true,
  parentConsentToken = null,
  parentConsentExpires = null,
  accountStatus = 'active'
}) {
  const result = await query(
    `INSERT INTO users
       (email, password_hash, name, grade_level, date_of_birth, parent_email,
        age_verified, parent_consent_token, parent_consent_expires, account_status)
     VALUES (LOWER($1), $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      email,
      passwordHash,
      name,
      grade_level || null,
      dateOfBirth,
      parentEmail,
      ageVerified,
      parentConsentToken,
      parentConsentExpires,
      accountStatus
    ]
  );
  return mapUserRow(result.rows[0]);
}

async function findUserByEmail(email) {
  if (!email) return undefined;
  const result = await query('SELECT * FROM users WHERE email = LOWER($1)', [email]);
  return mapUserRow(result.rows[0]);
}

async function findUserById(id) {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return mapUserRow(result.rows[0]);
}

async function findUserByConsentToken(token) {
  if (!token) return undefined;
  const result = await query('SELECT * FROM users WHERE parent_consent_token = $1', [token]);
  return mapUserRow(result.rows[0]);
}

// Whitelist: nur diese Felder dürfen über updateUser() geändert werden,
// gemappt von den camelCase-Namen (wie sie server.js benutzt) auf die
// tatsächlichen snake_case-Spaltennamen.
const USER_COLUMN_MAP = {
  email: 'email',
  passwordHash: 'password_hash',
  name: 'name',
  grade_level: 'grade_level',
  dateOfBirth: 'date_of_birth',
  parentEmail: 'parent_email',
  ageVerified: 'age_verified',
  parentConsentToken: 'parent_consent_token',
  parentConsentExpires: 'parent_consent_expires',
  parentConsentAt: 'parent_consent_at',
  accountStatus: 'account_status'
};

async function updateUser(id, updates) {
  const setClauses = [];
  const values = [];
  let i = 1;

  for (const [key, value] of Object.entries(updates)) {
    const column = USER_COLUMN_MAP[key];
    if (!column) continue;
    setClauses.push(`${column} = $${i}`);
    values.push(value);
    i++;
  }

  if (setClauses.length === 0) {
    return findUserById(id);
  }

  values.push(id);
  const result = await query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return mapUserRow(result.rows[0]);
}

// ---- Content Sources (hochgeladener/gewählter Inhalt + generierter Test) ----

function mapSourceRow(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    userId: row.user_id,
    content_type: row.content_type,
    reference_id: row.reference_id,
    reference_book_id: row.reference_book_id,
    status: row.status,
    progress: row.progress,
    test: row.test,
    createdAt: row.created_at
  };
}

async function createSource({ userId, content_type, reference_id, reference_book_id }) {
  const result = await query(
    `INSERT INTO sources (user_id, content_type, reference_id, reference_book_id, status, progress)
     VALUES ($1, $2, $3, $4, 'pending', 0)
     RETURNING *`,
    [userId, content_type, reference_id || null, reference_book_id || null]
  );
  return mapSourceRow(result.rows[0]);
}

async function findSourceById(id) {
  const result = await query('SELECT * FROM sources WHERE id = $1', [id]);
  return mapSourceRow(result.rows[0]);
}

const SOURCE_COLUMN_MAP = {
  status: 'status',
  progress: 'progress',
  test: 'test'
};

async function updateSource(id, updates) {
  const setClauses = [];
  const values = [];
  let i = 1;

  for (const [key, value] of Object.entries(updates)) {
    const column = SOURCE_COLUMN_MAP[key];
    if (!column) continue;
    setClauses.push(`${column} = $${i}`);
    // "test" ist eine JSONB-Spalte und bekommt ein verschachteltes Objekt -
    // das muss explizit als JSON-String übergeben werden.
    values.push(key === 'test' ? JSON.stringify(value) : value);
    i++;
  }

  if (setClauses.length === 0) {
    return findSourceById(id);
  }

  values.push(id);
  const result = await query(
    `UPDATE sources SET ${setClauses.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return mapSourceRow(result.rows[0]);
}

// ---- Datei-Upload-Handle ----
// Die eigentlichen Datei-Bytes werden weiterhin NICHT gespeichert (siehe
// routes/content.js - multer läuft im memoryStorage-Modus und die Datei
// wird nach dem Upload direkt wieder verworfen). Das ist ein bewusst
// getrennter, noch offener Punkt (bräuchte z.B. Supabase Storage für echte
// Dateiablage) und nicht Teil dieser Datenbank-Migration. Eine einfache
// In-Memory-Zahl reicht hier weiterhin, weil nichts Persistentes davon
// abhängt - die Id wird nur kurzzeitig für die Upload-Antwort gebraucht.
let nextFileIdCounter = 1;
function nextFileId() {
  return nextFileIdCounter++;
}

// ---- Test-Einreichungen ----

function mapSubmissionRow(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    user_id: row.user_id,
    test_id: row.test_id,
    correct_count: row.correct_count,
    total_questions: row.total_questions,
    accuracy: row.accuracy,
    answers_json: row.answers_json,
    time_taken: row.time_taken,
    submitted_at: row.submitted_at,
    test_title: row.test_title || null
  };
}

async function createSubmission({ userId, testId, correctCount, totalQuestions, accuracy, answersJson, timeTaken }) {
  const result = await query(
    `INSERT INTO test_submissions
       (user_id, test_id, correct_count, total_questions, accuracy, answers_json, time_taken)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, testId, correctCount, totalQuestions, accuracy, JSON.stringify(answersJson), timeTaken || 0]
  );
  return mapSubmissionRow(result.rows[0]);
}

// Holt den Titel des zugehörigen generierten Tests gleich mit dazu (aus
// sources.test->>'title'), damit die Übersicht nicht mehr wie im alten
// Mock-Modus einen festen Platzhaltertext anzeigen muss.
async function findSubmissionsByUser(userId) {
  const result = await query(
    `SELECT ts.*, s.test->>'title' AS test_title
     FROM test_submissions ts
     LEFT JOIN sources s ON s.id = ts.test_id
     WHERE ts.user_id = $1
     ORDER BY ts.submitted_at DESC
     LIMIT 100`,
    [userId]
  );
  return result.rows.map(mapSubmissionRow);
}

// Für die Ergebnis-Detailseite wird zusätzlich der komplette generierte Test
// gebraucht (Fragen mit Text/Optionen), damit angezeigt werden kann, welche
// Antwort bei welcher Frage richtig/falsch war.
async function findSubmissionById(id, userId) {
  const result = await query(
    `SELECT ts.*, s.test AS test_data
     FROM test_submissions ts
     LEFT JOIN sources s ON s.id = ts.test_id
     WHERE ts.id = $1 AND ts.user_id = $2`,
    [id, userId]
  );
  const row = result.rows[0];
  if (!row) return undefined;

  const submission = mapSubmissionRow(row);
  submission.testTitle = row.test_data?.title || null;
  submission.questions = row.test_data?.questions || [];
  return submission;
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByConsentToken,
  updateUser,
  createSource,
  findSourceById,
  updateSource,
  nextFileId,
  createSubmission,
  findSubmissionsByUser,
  findSubmissionById
};