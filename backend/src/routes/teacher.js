// Lehrer-Portal API-Routen (Phase 1, siehe claude/Lehrer-Portal-Konzept-2026-09-03.md).
//
// Eigene Login-Identität für Lehrkräfte, komplett getrennt von Kind- und
// Eltern-Konten: eigenes Cookie ("teacher_token", siehe utils/cookies.js),
// eigene Middleware (teacherAuthCheck.js), eigene Tabelle (teachers). Im
// Gegensatz zum Eltern-Board/Kind-Register gibt es hier bewusst KEINEN
// Alters-/Consent-Check - Lehrkräfte sind Erwachsene, das Register ist
// strukturell einfacher.

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config/jwt');
const teacherAuthCheck = require('../middleware/teacherAuthCheck');
const { setTeacherAuthCookie, clearTeacherAuthCookie } = require('../utils/cookies');
const {
  createTeacher,
  findTeacherByEmail,
  findTeacherById,
  createClass,
  findClassesByTeacher,
  findClassById,
  findMembersByClass,
  createClassSource,
  findClassSourcesByClass,
  findClassSourceById,
  findSubmissionsByClassSource
} = require('../store');

const router = express.Router();

const generateTeacherToken = (teacher) =>
  jwt.sign({ teacherId: teacher.id, email: teacher.email, type: 'teacher' }, JWT_SECRET, { expiresIn: '7d' });

const publicTeacher = (teacher) => ({ id: teacher.id, email: teacher.email, name: teacher.name });

const publicClass = (cls) => ({
  id: cls.id,
  name: cls.name,
  classCode: cls.class_code,
  subscriptionStatus: cls.subscription_status,
  memberCount: cls.member_count !== undefined ? cls.member_count : undefined,
  createdAt: cls.created_at
});

// Ownership-Check: gehört diese Klasse dieser Lehrkraft? Ohne diesen Check
// könnte eine Lehrkraft per URL-Manipulation (/classes/:id) die Klasse
// einer anderen Lehrkraft einsehen oder bearbeiten (gleiches Muster wie
// Sicherheitsaudit Kritisch #3 und die Ownership-Checks im Eltern-Board).
async function loadOwnedClass(req, res) {
  const classId = parseInt(req.params.id, 10);
  if (!classId) {
    res.status(400).json({ error: 'Ungültige Klassen-ID' });
    return null;
  }
  const cls = await findClassById(classId);
  if (!cls || cls.teacher_id !== req.teacher.id) {
    res.status(404).json({ error: 'Klasse nicht gefunden' });
    return null;
  }
  return cls;
}

// ---- Mock-Testgenerierung für Lehrer-Uploads ----
// Platzhalter, bis eine echte KI-Generierung aus dem Dokumenttext sicher
// angebunden ist (siehe Sicherheitsaudit Kritisch #6, gleiche Einschränkung
// wie bei der Schüler-Upload-Pipeline in routes/processing.js). Hier
// bewusst mit anderen Beispielfragen als generateMockTest() in
// processing.js, damit im Test klar erkennbar ist, welcher Pfad lief.
function generateMockClassTest(title) {
  return {
    title: title || 'Klassenarbeit',
    total_questions: 3,
    difficulty: 'mittel',
    questions: [
      {
        id: 1,
        type: 'multiple_choice',
        question_text: 'Wie viele Bundesländer hat Deutschland?',
        options: JSON.stringify(['13', '15', '16', '18']),
        correct_answer: '16',
        explanation: 'Deutschland hat 16 Bundesländer.'
      },
      {
        id: 2,
        type: 'multiple_choice',
        question_text: 'Was ist 9 × 8?',
        options: JSON.stringify(['62', '68', '72', '81']),
        correct_answer: '72',
        explanation: '9 × 8 = 72.'
      },
      {
        id: 3,
        type: 'fill_gap',
        question_text: 'Ein Dreieck hat ______ Ecken.',
        correct_answer: 'drei',
        explanation: 'Ein Dreieck hat drei Ecken und drei Seiten.'
      }
    ]
  };
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, Email und Passwort erforderlich' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });
    }
    if (await findTeacherByEmail(email)) {
      return res.status(409).json({ error: 'Diese Email ist bereits als Lehrkraft registriert' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const teacher = await createTeacher({ email, password: passwordHash, name });

    const token = generateTeacherToken(teacher);
    setTeacherAuthCookie(res, token);

    return res.status(201).json({ success: true, teacher: publicTeacher(teacher) });
  } catch (error) {
    console.error('Teacher Register Error:', error);
    return res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Passwort erforderlich' });
    }

    const teacher = await findTeacherByEmail(email);
    if (!teacher) {
      return res.status(401).json({ error: 'Email oder Passwort falsch' });
    }

    const validPassword = await bcrypt.compare(password, teacher.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email oder Passwort falsch' });
    }

    const token = generateTeacherToken(teacher);
    setTeacherAuthCookie(res, token);

    return res.json({ success: true, teacher: publicTeacher(teacher) });
  } catch (error) {
    console.error('Teacher Login Error:', error);
    return res.status(500).json({ error: 'Login fehlgeschlagen' });
  }
});

router.post('/logout', (req, res) => {
  clearTeacherAuthCookie(res);
  res.json({ message: 'Logout erfolgreich' });
});

router.get('/me', teacherAuthCheck, async (req, res) => {
  const teacher = await findTeacherById(req.teacher.id);
  if (!teacher) {
    return res.status(404).json({ error: 'Lehrer-Konto nicht gefunden' });
  }
  return res.json(publicTeacher(teacher));
});

router.get('/classes', teacherAuthCheck, async (req, res) => {
  try {
    const classes = await findClassesByTeacher(req.teacher.id);
    return res.json({ classes: classes.map(publicClass) });
  } catch (error) {
    console.error('Teacher Classes Error:', error);
    return res.status(500).json({ error: 'Klassen konnten nicht geladen werden' });
  }
});

router.post('/classes', teacherAuthCheck, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Klassenname erforderlich' });
    }
    const cls = await createClass({ teacherId: req.teacher.id, name: name.trim() });
    return res.status(201).json({ success: true, class: publicClass({ ...cls, member_count: 0 }) });
  } catch (error) {
    console.error('Create Class Error:', error);
    return res.status(500).json({ error: 'Klasse konnte nicht angelegt werden' });
  }
});

router.get('/classes/:id', teacherAuthCheck, async (req, res) => {
  try {
    const cls = await loadOwnedClass(req, res);
    if (!cls) return;

    const members = await findMembersByClass(cls.id);
    return res.json({
      class: publicClass({ ...cls, member_count: members.length }),
      members: members.map((m) => ({ id: m.id, name: m.name, gradeLevel: m.grade_level }))
    });
  } catch (error) {
    console.error('Class Detail Error:', error);
    return res.status(500).json({ error: 'Klasse konnte nicht geladen werden' });
  }
});

// Kernzahlen-Fortschrittsansicht (Konzept Abschnitt 3, Phase 1): pro
// Klassenarbeit, wie viele Mitglieder haben sie gemacht, Durchschnitt, und
// die Einzelergebnisse. Datenschutzrechtlich unproblematisch, weil genau
// das der Zweck ist, dem durch den Beitritt per Klassencode zugestimmt
// wird (siehe Konzept-Doku Abschnitt 9).
router.get('/classes/:id/progress', teacherAuthCheck, async (req, res) => {
  try {
    const cls = await loadOwnedClass(req, res);
    if (!cls) return;

    const members = await findMembersByClass(cls.id);
    const sources = await findClassSourcesByClass(cls.id);

    const sourcesWithProgress = await Promise.all(
      sources.map(async (source) => {
        const submissions = await findSubmissionsByClassSource(source.id);
        const avgAccuracy = submissions.length
          ? Math.round(submissions.reduce((sum, s) => sum + s.accuracy, 0) / submissions.length)
          : null;

        return {
          id: source.id,
          title: source.title,
          status: source.status,
          questionCount: source.test?.questions?.length || 0,
          completedCount: submissions.length,
          memberCount: members.length,
          avgAccuracy,
          submissions: submissions.map((s) => ({
            studentId: s.student_id,
            studentName: s.student_name,
            correctCount: s.correct_count,
            totalQuestions: s.total_questions,
            accuracy: s.accuracy,
            submittedAt: s.submitted_at
          }))
        };
      })
    );

    return res.json({
      class: publicClass({ ...cls, member_count: members.length }),
      sources: sourcesWithProgress
    });
  } catch (error) {
    console.error('Class Progress Error:', error);
    return res.status(500).json({ error: 'Fortschritt konnte nicht geladen werden' });
  }
});

// Eigene Klassenarbeits-Uploads (Konzept Abschnitt 4). Phase 1 bewusst ohne
// echten Datei-Upload/OCR - nur ein Titel/Thema als Text, die (Mock-)
// Testgenerierung läuft synchron (siehe generateMockClassTest oben). Sobald
// echte KI-Generierung existiert, wird hier der Verarbeitungsschritt
// eingehängt, ohne die Route selbst ändern zu müssen.
router.post('/classes/:id/sources', teacherAuthCheck, async (req, res) => {
  try {
    const cls = await loadOwnedClass(req, res);
    if (!cls) return;

    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Titel/Thema der Klassenarbeit erforderlich' });
    }

    const test = generateMockClassTest(title.trim());
    const source = await createClassSource({
      classId: cls.id,
      teacherId: req.teacher.id,
      title: title.trim(),
      test
    });

    return res.status(201).json({
      success: true,
      source: {
        id: source.id,
        title: source.title,
        status: source.status,
        questionCount: test.questions.length,
        createdAt: source.created_at
      }
    });
  } catch (error) {
    console.error('Create Class Source Error:', error);
    return res.status(500).json({ error: 'Klassenarbeit konnte nicht angelegt werden' });
  }
});

// Generierten Test einsehen (Konzept Abschnitt 4: "einsehen/freigeben" -
// Freigabe-Workflow selbst ist als offene Frage für später vermerkt, siehe
// Konzept-Doku; Phase 1 ist ein Test sofort nach dem Anlegen für die Klasse
// sichtbar).
router.get('/classes/:id/sources/:sourceId', teacherAuthCheck, async (req, res) => {
  try {
    const cls = await loadOwnedClass(req, res);
    if (!cls) return;

    const sourceId = parseInt(req.params.sourceId, 10);
    const source = await findClassSourceById(sourceId);
    if (!source || source.class_id !== cls.id) {
      return res.status(404).json({ error: 'Klassenarbeit nicht gefunden' });
    }

    return res.json({
      source: {
        id: source.id,
        title: source.title,
        status: source.status,
        test: source.test,
        createdAt: source.created_at
      }
    });
  } catch (error) {
    console.error('Class Source Detail Error:', error);
    return res.status(500).json({ error: 'Klassenarbeit konnte nicht geladen werden' });
  }
});

module.exports = router;
