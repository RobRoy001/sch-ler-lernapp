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
//   teachers: id, email, password_hash, name, created_at (Lehrer-Portal,
//             2026-09-03 - siehe database/migrations.js)
//   classes: id, teacher_id, name, class_code, subscription_status, created_at
//   class_memberships: id, class_id, student_user_id, joined_at
//   class_sources: id, class_id, teacher_id, title, status, progress,
//                  test (jsonb), created_at
//   class_source_submissions: id, class_source_id, student_user_id,
//                              correct_count, total_questions, accuracy,
//                              submitted_at

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
// TEACHERS / LEHRER-PORTAL (2026-09-03)
//
// Eine Lehrkraft ist wie ein Elternteil bewusst KEIN "users"-Eintrag -
// eigene Tabelle, eigenes Login (siehe routes/teacher.js), eigenes Cookie
// (teacher_token). Siehe claude/Lehrer-Portal-Konzept-2026-09-03.md.
// ============================================================================

async function createTeacher({ email, password, name }) {
  const result = await query(
    `INSERT INTO teachers (email, password_hash, name, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, email, name, created_at`,
    [email, password, name]
  );
  return result.rows[0];
}

async function findTeacherByEmail(email) {
  const result = await query('SELECT * FROM teachers WHERE email = $1', [email]);
  return result.rows[0];
}

async function findTeacherById(teacherId) {
  const result = await query(
    'SELECT id, email, name, created_at FROM teachers WHERE id = $1',
    [teacherId]
  );
  return result.rows[0];
}

// Kurzer, gut vorlesbarer/abtippbarer Code ohne verwechselbare Zeichen
// (kein 0/O, kein 1/I) - Schüler:innen tippen den im Klassenzimmer ab.
function generateClassCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `KL-${code}`;
}

// Erzeugt bei einer Kollision (UNIQUE-Constraint auf class_code) einfach
// einen neuen Code und versucht es erneut - bei einem 6-stelligen Code aus
// 33 Zeichen (33^6 ≈ 1,3 Milliarden Kombinationen) praktisch nie nötig,
// aber sauberer als eine ungeprüfte Annahme.
async function createClass({ teacherId, name }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const classCode = generateClassCode();
    try {
      const result = await query(
        `INSERT INTO classes (teacher_id, name, class_code, subscription_status, created_at)
         VALUES ($1, $2, $3, 'free', NOW())
         RETURNING *`,
        [teacherId, name, classCode]
      );
      return result.rows[0];
    } catch (err) {
      const isUniqueViolation = err && err.code === '23505';
      if (isUniqueViolation && attempt < 4) continue;
      throw err;
    }
  }
}

async function findClassesByTeacher(teacherId) {
  const result = await query(
    `SELECT c.*, COUNT(cm.id)::int AS member_count
     FROM classes c
     LEFT JOIN class_memberships cm ON cm.class_id = c.id
     WHERE c.teacher_id = $1
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [teacherId]
  );
  return result.rows;
}

async function findClassById(classId) {
  const result = await query('SELECT * FROM classes WHERE id = $1', [classId]);
  return result.rows[0];
}

async function findClassByCode(classCode) {
  const result = await query('SELECT * FROM classes WHERE class_code = $1', [classCode]);
  return result.rows[0];
}

async function findMembersByClass(classId) {
  const result = await query(
    `SELECT u.id, u.name, u.grade_level
     FROM class_memberships cm
     JOIN users u ON u.id = cm.student_user_id
     WHERE cm.class_id = $1
     ORDER BY u.name ASC`,
    [classId]
  );
  return result.rows;
}

// ON CONFLICT: erneutes Beitreten mit demselben Code ist kein Fehler,
// sondern ein No-Op (z.B. wenn ein Schüler den Code zweimal eingibt).
async function createClassMembership(classId, studentUserId) {
  const result = await query(
    `INSERT INTO class_memberships (class_id, student_user_id, joined_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (class_id, student_user_id)
     DO UPDATE SET joined_at = class_memberships.joined_at
     RETURNING *`,
    [classId, studentUserId]
  );
  return result.rows[0];
}

async function findClassMembership(classId, studentUserId) {
  const result = await query(
    'SELECT * FROM class_memberships WHERE class_id = $1 AND student_user_id = $2',
    [classId, studentUserId]
  );
  return result.rows[0];
}

// Vom Kind-Konto aus genutzt (Einstellungen -> "Meine Klassen").
async function findClassesByStudent(studentUserId) {
  const result = await query(
    `SELECT c.id, c.name, c.class_code, cm.joined_at
     FROM class_memberships cm
     JOIN classes c ON c.id = cm.class_id
     WHERE cm.student_user_id = $1
     ORDER BY cm.joined_at DESC`,
    [studentUserId]
  );
  return result.rows;
}

// Lehrer-eigene Uploads (class_sources). Phase 1 nutzt wie der Rest der App
// (siehe routes/processing.js generateMockTest) noch die Mock-Testgenerierung
// - hier bewusst SYNCHRON statt der Polling-Simulation aus processing.js,
// weil es keinen echten Verarbeitungsschritt gibt, der Zeit bräuchte
// (Kritisch #6: echte KI-Generierung ist ein eigenständiges, noch offenes
// Projekt). status steht deshalb direkt auf 'completed'.
async function createClassSource({ classId, teacherId, title, test }) {
  const result = await query(
    `INSERT INTO class_sources (class_id, teacher_id, title, status, progress, test, created_at)
     VALUES ($1, $2, $3, 'completed', 100, $4, NOW())
     RETURNING *`,
    [classId, teacherId, title, JSON.stringify(test)]
  );
  return result.rows[0];
}

async function findClassSourcesByClass(classId) {
  const result = await query(
    'SELECT * FROM class_sources WHERE class_id = $1 ORDER BY created_at DESC',
    [classId]
  );
  return result.rows;
}

async function findClassSourceById(sourceId) {
  const result = await query('SELECT * FROM class_sources WHERE id = $1', [sourceId]);
  return result.rows[0];
}

async function createClassSourceSubmission({
  classSourceId,
  studentUserId,
  correctCount,
  totalQuestions,
  accuracy
}) {
  const result = await query(
    `INSERT INTO class_source_submissions (
       class_source_id, student_user_id, correct_count, total_questions, accuracy, submitted_at
     ) VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [classSourceId, studentUserId, correctCount, totalQuestions, accuracy]
  );
  return result.rows[0];
}

// Für die Lehrer-Fortschrittsansicht: wer aus der Klasse hat diesen Test
// gemacht und wie? Namen kommen per JOIN mit, damit die Lehrkraft nicht
// selbst Nutzer-IDs auflösen muss.
async function findSubmissionsByClassSource(classSourceId) {
  const result = await query(
    `SELECT css.id, css.correct_count, css.total_questions, css.accuracy, css.submitted_at,
            u.id AS student_id, u.name AS student_name
     FROM class_source_submissions css
     JOIN users u ON u.id = css.student_user_id
     WHERE css.class_source_id = $1
     ORDER BY css.submitted_at DESC`,
    [classSourceId]
  );
  return result.rows;
}

// Für die Schüler-Ansicht: hat DIESER Schüler diesen Test schon gemacht?
// (steuert "Test starten" vs. "Bereits erledigt" in der Klassen-Ansicht)
async function findClassSourceSubmissionByStudent(classSourceId, studentUserId) {
  const result = await query(
    `SELECT * FROM class_source_submissions
     WHERE class_source_id = $1 AND student_user_id = $2
     ORDER BY submitted_at DESC LIMIT 1`,
    [classSourceId, studentUserId]
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
  revokeParentChildLink,

  // Teachers / Lehrer-Portal
  createTeacher,
  findTeacherByEmail,
  findTeacherById,
  createClass,
  findClassesByTeacher,
  findClassById,
  findClassByCode,
  findMembersByClass,
  createClassMembership,
  findClassMembership,
  findClassesByStudent,
  createClassSource,
  findClassSourcesByClass,
  findClassSourceById,
  createClassSourceSubmission,
  findSubmissionsByClassSource,
  findClassSourceSubmissionByStudent
};
