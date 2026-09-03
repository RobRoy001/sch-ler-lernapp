// Eltern-Board API-Routen (Phase 1, siehe claude/Eltern-Board-Konzept-*.md).
//
// Eigene Login-Identität für Erziehungsberechtigte, komplett getrennt vom
// Kind-Konto: eigenes Cookie ("parent_token", siehe utils/cookies.js),
// eigene Middleware (parentAuthCheck.js), eigene Tabelle (parents). Ein
// Elternteil hat KEIN normales users-Konto und keinen Zugriff auf
// Kind-Funktionen (Upload, Tests etc.) - nur Lesezugriff auf die
// verknüpften Kinder über parent_child_links.
//
// Ein Eltern-Konto entsteht in Phase 1 ausschließlich beim Bestätigen der
// Elternzustimmung (POST /api/auth/parent-consent/confirm in server.js) -
// es gibt hier bewusst KEINE eigenständige Registrierungs-Route.

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/jwt');
const parentAuthCheck = require('../middleware/parentAuthCheck');
const { setParentAuthCookie, clearParentAuthCookie } = require('../utils/cookies');
const {
  findParentByEmail,
  findParentById,
  findChildrenByParent,
  findParentChildLink,
  findSubmissionsByUser,
  findSourcesByUser
} = require('../store');

const router = express.Router();

const generateParentToken = (parent) =>
  jwt.sign({ parentId: parent.id, email: parent.email, type: 'parent' }, JWT_SECRET, { expiresIn: '7d' });

const publicParent = (parent) => ({ id: parent.id, email: parent.email, name: parent.name });

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Passwort erforderlich' });
    }

    const parent = await findParentByEmail(email);
    if (!parent) {
      return res.status(401).json({ error: 'Email oder Passwort falsch' });
    }

    const validPassword = await bcrypt.compare(password, parent.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email oder Passwort falsch' });
    }

    const token = generateParentToken(parent);
    setParentAuthCookie(res, token);

    return res.json({ success: true, parent: publicParent(parent) });
  } catch (error) {
    console.error('Parent Login Error:', error);
    return res.status(500).json({ error: 'Login fehlgeschlagen' });
  }
});

router.post('/logout', (req, res) => {
  clearParentAuthCookie(res);
  res.json({ message: 'Logout erfolgreich' });
});

router.get('/me', parentAuthCheck, async (req, res) => {
  const parent = await findParentById(req.parent.id);
  if (!parent) {
    return res.status(404).json({ error: 'Elternkonto nicht gefunden' });
  }
  return res.json(publicParent(parent));
});

router.get('/children', parentAuthCheck, async (req, res) => {
  try {
    const children = await findChildrenByParent(req.parent.id);
    return res.json({ children });
  } catch (error) {
    console.error('Parent Children Error:', error);
    return res.status(500).json({ error: 'Kinder konnten nicht geladen werden' });
  }
});

// Fortschritt eines einzelnen Kindes - mit Ownership-Check (siehe
// findParentChildLink in store.js): ohne diesen Check könnte ein Elternteil
// per URL (/children/999/progress) die Ergebnisse fremder Kinder sehen.
router.get('/children/:childId/progress', parentAuthCheck, async (req, res) => {
  try {
    const childId = parseInt(req.params.childId, 10);
    if (!childId) {
      return res.status(400).json({ error: 'Ungültige Kind-ID' });
    }

    const link = await findParentChildLink(req.parent.id, childId);
    if (!link) {
      return res.status(403).json({ error: 'Kein Zugriff auf dieses Kind' });
    }

    const submissions = await findSubmissionsByUser(childId);
    const sources = await findSourcesByUser(childId);

    return res.json({ submissions, sources });
  } catch (error) {
    console.error('Parent Child Progress Error:', error);
    return res.status(500).json({ error: 'Fortschritt konnte nicht geladen werden' });
  }
});

module.exports = router;
