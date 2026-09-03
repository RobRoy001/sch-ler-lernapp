// Database abstraction layer (Postgres/Supabase)
//
// Angepasst an das ECHTE, tatsächlich verwendete DB-Schema (geprüft über
// information_schema.columns via /api/debug-schema):
//   users: id (integer), email, password_hash, name, grade_level (varchar),
//          date_of_birth, parent_email, age_verified, parent_consent_token,
//          parent_consent_expires, parent_consent_at, account_status, created_at
//   sources: id, user_id, content_type, reference_id, reference_book_id,
//            status, progress, test (jsonb), created_at
//   test_submissions: id, user_id, test_id, correct_count, total_questions,
//                      accuracy, answers_json, time_taken, submitted_at
//   parents: id, email, password_hash, name, created_at (Eltern-Board,
//            2026-09-03 - siehe database/migrations.js)
//   parent_child_links: id, parent_id, child_id, status, created_at,
//                        revoked_at (Eltern-Board, 2026-09-03)

const { query } = require('./database/connection');

// ============================================================================
// USER OPERATIONS (Auth, Befund #2, #3, #5, #11, #16)
// ============================================================================

async function createUser({
  email,
  password, // bereits gehashtes Passwort (bcrypt) -> Spalte password_hash
  name,
  grade_level,
  dateOfBirth,
  parentEmail,
  ageVerified,
  parentConsentToken,
  parentConsentExpires,
  accountStatus
}) {
  const result = await query(
    `INSERT INTO users (
       email, password_hash, name, grade_level, date_of_birth,
       parent_email, age_verified, parent_consent_token,
       parent_consent_expires, account_status, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     RETURNING id, email, name, grade_level, account_status, age_verified`,
    [
      email,
      password,
      name,
      grade_level || null,
      dateOfBirth || null,
      parentEmail || null,
      ageVerified !== undefined ? ageVerified : true,
      parentConsentToken || null,
      parentConsentExpires || null,
      accountStatus || 'active'
    ]
  );
  return result.rows[0];
}

async function findUserByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

async function findUserById(userId) {
  const result = await query(
    'SELECT id, email, name, grade_level, account_status, age_verified FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0];
}

// Mit Passwort-Hash - für die Konto-Löschung (Passwort-Bestätigung nötig)
async function findUserWithPasswordById(userId) {
  const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
  return result.rows[0];
}

async function findUserByConsentToken(token) {
  const result = await query(
    'SELECT * FROM users WHERE parent_consent_token = $1',
    [token]
  );
  return result.rows[0];
}

async function updateUser(userId, updates) {
  const updateMap = {
    accountStatus: 'account_status',
    ageVerified: 'age_verified',
    parentConsentToken: 'parent_consent_token',
    parentConsentExpires: 'parent_consent_expires',
    parentConsentAt: 'parent_consent_at'
  };

  const fields = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    const dbColumn = updateMap[key] || key;
    fields.push(`${dbColumn} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  }

  if (fields.length === 0) return null;

  values.push(userId);
  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0];
}

// ============================================================================
// GDPR ART. 20 - DATA EXPORT
// ============================================================================

async function exportUserData(userId) {
  const userResult = await query(
    'SELECT id, email, name, grade_level, date_of_birth, created_at FROM users WHERE id = $1',
    [userId]
  );
  if (!userResult.rows.length) return null;
  const user = userResult.rows[0];

  const submissionsResult = await query(
    `SELECT id, test_id, correct_count, total_questions, accuracy, time_taken, submitted_at
     FROM test_submissions WHERE user_id = $1 ORDER BY submitted_at DESC`,
    [userId]
  );

  const sourcesResult = await query(
    'SELECT id, content_type, status, created_at FROM sources WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );

  return {
    user,
    submissions: submissionsResult.rows,
    uploaded_content: sourcesResult.rows
  };
}

// ============================================================================
// GDPR ART. 17 - RIGHT TO DELETION
// (setzt voraus, dass sources.user_id und test_submissions.user_id mit
// ON DELETE CASCADE auf users(id) verweisen)
// ============================================================================

async function deleteUser(userId) {
  const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
  return result.rows[0];
}

// ============================================================================
// SOURCES (von content.js / processing.js genutzt)
// ============================================================================

function nextFileId() {
  // Einfache monoton steigende ID für Datei-Uploads (kein eigenes DB-Feld
  // nötig - Datei-Metadaten selbst werden aktuell nicht persistiert).
  // Bewusst synchron, da content.js sie ohne await aufruft.
  return Date.now();
}

async function createSource({ userId, content_type, reference_id, reference_book_id }) {
  const result = await query(
    `INSERT INTO sources (user_id, content_type, reference_id, reference_book_id, status, progress, created_at)
     VALUES ($1, $2, $3, $4, 'pending', 0, NOW())
     RETURNING *`,
    [userId, content_type, reference_id || null, reference_book_id || null]
  );
  return result.rows[0];
}

async function findSourcesByUser(userId) {
  const result = await query(
    'SELECT * FROM sources WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

async function findSourceById(sourceId) {
  const result = await query('SELECT * FROM sources WHERE id = $1', [sourceId]);
  return result.rows[0];
}

async function updateSource(sourceId, updates) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    const dbValue = key === 'test' ? JSON.stringify(value) : value;
    fields.push(`${key} = $${paramIndex}`);
    values.push(dbValue);
    paramIndex++;
  }

  if (fields.length === 0) return null;

  values.push(sourceId);
  const result = await query(
    `UPDATE sources SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0];
}

// ============================================================================
// TEST SUBMISSIONS (von processing.js genutzt)
// ============================================================================

async function createSubmission({
  userId,
  testId,
  correctCount,
  totalQuestions,
  accuracy,
  answersJson,
  timeTaken
}) {
  const result = await query(
    `INSERT INTO test_submissions (
       user_id, test_id, correct_count, total_questions, accuracy,
       answers_json, time_taken, submitted_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING *`,
    [
      userId,
      testId,
      correctCount,
      totalQuestions,
      accuracy,
      JSON.stringify(answersJson || []),
      timeTaken || 0
    ]
  );
  return result.rows[0];
}

async function findSubmissionsByUser(userId) {
  const result = await query(
    `SELECT id, test_id, correct_count, total_questions, accuracy, submitted_at
     FROM test_submissions WHERE user_id = $1 ORDER BY submitted_at DESC`,
    [userId]
  );
  return result.rows;
}

async function findSubmissionById(submissionId, userId) {
  const result = await query(
    'SELECT * FROM test_submissions WHERE id = $1 AND user_id = $2',
    [submissionId, userId]
  );
  return result.rows[0];
}

// ============================================================================
// PARENTS / ELTERN-BOARD (2026-09-03)
//
// Ein Elternteil ist bewusst KEIN "users"-Eintrag: eigene Tabelle, eigenes
// Login (siehe routes/parent.js), eigenes Cookie (parent_token). Die
// Verknüpfung zu Kindern läuft über parent_child_links, damit ein
// Elternteil künftig auch mehrere Kinder verwalten kann (Geschwister).
// ============================================================================

async function createParent({ email, password, name }) {
  const result = await query(
    `INSERT INTO parents (email, password_hash, name, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, email, name, created_at`,
    [email, password, name || null]
  );
  return result.rows[0];
}

async function findParentByEmail(email) {
  const result = await query('SELECT * FROM parents WHERE email = $1', [email]);
  return result.rows[0];
}

async function findParentById(parentId) {
  const result = await query(
    'SELECT id, email, name, created_at FROM parents WHERE id = $1',
    [parentId]
  );
  return result.rows[0];
}

// ON CONFLICT: falls der Link schon existiert (z.B. Elternteil bestätigt den
// Consent-Link versehentlich zweimal), einfach wieder auf 'active' setzen
// statt mit einem Datenbank-Fehler abzubrechen.
async function createParentChildLink(parentId, childId) {
  const result = await query(
    `INSERT INTO parent_child_links (parent_id, child_id, status, created_at)
     VALUES ($1, $2, 'active', NOW())
     ON CONFLICT (parent_id, child_id)
     DO UPDATE SET status = 'active', revoked_at = NULL
     RETURNING *`,
    [parentId, childId]
  );
  return result.rows[0];
}

async function findChildrenByParent(parentId) {
  const result = await query(
    `SELECT u.id, u.name, u.grade_level, u.email
     FROM parent_child_links pcl
     JOIN users u ON u.id = pcl.child_id
     WHERE pcl.parent_id = $1 AND pcl.status = 'active'
     ORDER BY u.name ASC`,
    [parentId]
  );
  return result.rows;
}

// Ownership-Check: darf dieser Elternteil auf dieses Kind zugreifen? Ohne
// diesen Check könnte ein Elternteil per URL-Manipulation
// (/api/parent/children/:childId/progress) die Testergebnisse fremder
// Kinder abrufen (gleiches Muster wie Sicherheitsaudit Kritisch #3 -
// Autorisierung nie aus einem frei wählbaren Parameter ableiten, sondern
// immer serverseitig gegen die tatsächliche Verknüpfung prüfen).
async function findParentChildLink(parentId, childId) {
  const result = await query(
    `SELECT * FROM parent_child_links
     WHERE parent_id = $1 AND child_id = $2 AND status = 'active'`,
    [parentId, childId]
  );
  return result.rows[0];
}

// Vom Kind-Konto aus genutzt (Einstellungen -> "Verknüpfte Eltern").
async function findParentsByChild(childId) {
  const result = await query(
    `SELECT p.id, p.email, p.name, pcl.created_at AS linked_at
     FROM parent_child_links pcl
     JOIN parents p ON p.id = pcl.parent_id
     WHERE pcl.child_id = $1 AND pcl.status = 'active'
     ORDER BY pcl.created_at ASC`,
    [childId]
  );
  return result.rows;
}

// Vom Kind aus aufgerufen (Einstellungen -> "Verknüpfte Eltern" -> Entfernen).
async function revokeParentChildLink(parentId, childId) {
  const result = await query(
    `UPDATE parent_child_links
     SET status = 'revoked', revoked_at = NOW()
     WHERE parent_id = $1 AND child_id = $2
     RETURNING *`,
    [parentId, childId]
  );
  return result.rows[0];
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Users / Auth
  createUser,
  findUserByEmail,
  findUserById,
  findUserWithPasswordById,
  findUserByConsentToken,
  updateUser,

  // GDPR
  exportUserData,
  deleteUser,

  // Sources
  nextFileId,
  createSource,
  findSourcesByUser,
  findSourceById,
  updateSource,

  // Test Submissions
  createSubmission,
  findSubmissionsByUser,
  findSubmissionById,

  // Parents / Eltern-Board
  createParent,
  findParentByEmail,
  findParentById,
  createParentChildLink,
  findChildrenByParent,
  findParentChildLink,
  findParentsByChild,
  revokeParentChildLink
};
