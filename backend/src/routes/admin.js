// ⚠️ TEMPORÄRER Wartungs-Endpoint (2026-09-03) — ausschließlich zum
// einmaligen Aufräumen der Test-Konten aus der Entwicklungsphase (siehe
// claude/SECURITY-AUDIT-IMPLEMENTATION-COMPLETE.md, "Noch offen" Punkt 8).
//
// Es gibt in diesem Projekt keinen direkten Datenbankzugriff außerhalb
// dieses Node-Prozesses (nur er kennt die echte DATABASE_URL, siehe
// database/migrations.js-Kommentar) — deshalb läuft das Aufräumen über
// zwei geschützte HTTP-Routen statt über ein direktes SQL-Skript:
//   1. GET  /api/admin/accounts        - alle Konten auflisten (IDs sichtbar
//                                          machen, damit nichts erraten wird)
//   2. POST /api/admin/delete-accounts - gezielt per ID löschen
//
// Schutz: ein Secret-Header (X-Admin-Secret), verglichen mit der Railway-
// Umgebungsvariable ADMIN_CLEANUP_SECRET. Ohne oder mit falschem Header
// liefert die Route bewusst 404 statt 401/403 (verrät nicht einmal, dass es
// sie gibt). WICHTIG: Diese Datei ist nur als Übergangslösung gedacht - nach
// dem Aufräumen sollte sie inkl. der Route in server.js und der Railway-
// Variable ADMIN_CLEANUP_SECRET wieder entfernt werden, damit keine
// dauerhafte zusätzliche Angriffsfläche bestehen bleibt.

const express = require('express');
const {
  listAllUsersForAdmin,
  listAllParentsForAdmin,
  listAllTeachersForAdmin,
  deleteUser,
  deleteParent,
  deleteTeacher
} = require('../store');

const router = express.Router();

function checkSecret(req, res) {
  const provided = req.headers['x-admin-secret'];
  const expected = process.env.ADMIN_CLEANUP_SECRET;
  if (!expected || !provided || provided !== expected) {
    // Bewusst 404 statt 401/403 - die Route soll für alle ohne Secret so
    // aussehen, als gäbe es sie nicht.
    res.status(404).json({ error: 'Not found' });
    return false;
  }
  return true;
}

router.get('/accounts', async (req, res) => {
  if (!checkSecret(req, res)) return;
  try {
    const [users, parents, teachers] = await Promise.all([
      listAllUsersForAdmin(),
      listAllParentsForAdmin(),
      listAllTeachersForAdmin()
    ]);
    return res.json({ users, parents, teachers });
  } catch (error) {
    console.error('Admin List Accounts Error:', error);
    return res.status(500).json({ error: 'Konnte Konten nicht laden' });
  }
});

// Body: { userIds?: number[], parentIds?: number[], teacherIds?: number[] }
// Löscht ausschließlich die explizit übergebenen IDs - bewusst kein
// "alles mit 'test' im Namen löschen" o.ä., um jedes Risiko eines
// versehentlichen Treffers auf ein echtes Konto auszuschließen.
router.post('/delete-accounts', async (req, res) => {
  if (!checkSecret(req, res)) return;
  try {
    const { userIds = [], parentIds = [], teacherIds = [] } = req.body || {};

    const deletedUsers = [];
    for (const id of userIds) {
      const result = await deleteUser(id);
      if (result) deletedUsers.push(result.id);
    }

    const deletedParents = [];
    for (const id of parentIds) {
      const result = await deleteParent(id);
      if (result) deletedParents.push(result.id);
    }

    const deletedTeachers = [];
    for (const id of teacherIds) {
      const result = await deleteTeacher(id);
      if (result) deletedTeachers.push(result.id);
    }

    return res.json({
      success: true,
      deleted: { users: deletedUsers, parents: deletedParents, teachers: deletedTeachers }
    });
  } catch (error) {
    console.error('Admin Delete Accounts Error:', error);
    return res.status(500).json({ error: 'Löschen fehlgeschlagen' });
  }
});

module.exports = router;
