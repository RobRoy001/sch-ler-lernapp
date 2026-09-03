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
const multer = require('multer');

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
  updateClassSource,
  findClassSourcesByClass,
  findClassSourceById,
  findSubmissionsByClassSource
} = require('../store');

// ✅ KI-Testgenerierung Lehrer-Upload-Pfad (2026-09-03): dieselbe echte
// Pipeline wie beim Schüler-Upload (routes/processing.js), nur an
// class_sources statt sources angeschlossen - siehe
// claude/KI-Testgenerierung-Konzept-2026-09-03.md, Abschnitt "Lehrer-
// Upload-Pfad" weiter unten in diesem Kommentarblock (processClassSource-
// InBackground) für die Details.
const { classSourceFiles } = require('../utils/pendingUploads');
const { extractText } = require('../services/textExtraction');
const { sanitizeForOpenAI } = require('../utils/contentSanitizer');
const { generateQuestions } = require('../services/questionGenerator');
const { VALID_TEST_FORMATS, VALID_TEST_SCOPES } = require('../utils/testFormats');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB, gleiches Limit wie beim Schüler-Upload
});

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

// ✅ Echte Pipeline für den Lehrer-Upload (2026-09-03) - eins-zu-eins nach
// dem Vorbild von processSourceInBackground() in routes/processing.js
// (dort inzwischen live verifiziert, siehe Konzept-Dokument), nur an
// class_sources/updateClassSource statt sources/updateSource angeschlossen.
// Bewusst eine eigene, separate Funktion statt die aus processing.js zu
// importieren und zu verbiegen - beide Pipelines sollen unabhängig
// voneinander bleiben, damit eine Änderung am Schüler-Pfad nicht
// versehentlich den (gerade erst stabilisierten) Lehrer-Pfad mit
// beeinflusst und umgekehrt.
//
// Läuft NACH der Response weiter (fire-and-forget aus der Route unten) -
// wirft deshalb nie einen Fehler nach außen: jeder Fehlerfall endet trotzdem
// in status: 'completed' mit dem Mock-Test als Fallback (gleiche Robert-
// Entscheidung wie beim Schüler-Upload: kein Hard-Block, kein dauerhafter
// 'error'-Status, den das Frontend ohnehin nicht anzeigen würde).
async function processClassSourceInBackground(sourceId) {
  const pendingFile = classSourceFiles.take(String(sourceId));
  let test = null;
  let fallbackReason = null;

  try {
    await updateClassSource(sourceId, { progress: 25 });

    if (!pendingFile) {
      fallbackReason = 'keine Datei verknüpft';
    } else if (!pendingFile.consent) {
      fallbackReason = 'keine Einwilligung zur KI-Verarbeitung erteilt';
    } else {
      const { text } = await extractText(pendingFile.buffer, pendingFile.mimetype);
      await updateClassSource(sourceId, { progress: 55 });

      const sanitized = sanitizeForOpenAI(text);
      await updateClassSource(sourceId, { progress: 70 });

      test = await generateQuestions({
        text: sanitized,
        format: pendingFile.testFormat,
        scope: pendingFile.testScope
      });
      await updateClassSource(sourceId, { progress: 90 });
    }
  } catch (err) {
    fallbackReason = err.message;
    console.error(`Echte Testgenerierung für Class-Source ${sourceId} fehlgeschlagen, nutze Mock-Fallback:`, err.message);
  }

  if (!test) {
    // Titel kommt bewusst frisch aus der DB statt aus pendingFile (das im
    // "keine Datei verknüpft"-Fall ohnehin leer ist) - ein zusätzlicher,
    // günstiger Read statt den Titel zusätzlich im In-Memory-Store
    // mitzuführen.
    const sourceRow = await findClassSourceById(sourceId);
    test = generateMockClassTest(sourceRow ? sourceRow.title : undefined);
    test.fallback_reason = fallbackReason;
  }

  await updateClassSource(sourceId, { status: 'completed', progress: 100, test });
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
          progress: source.progress || 0,
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

// Eigene Klassenarbeits-Uploads (Konzept Abschnitt 4).
//
// ✅ KI-Testgenerierung Lehrer-Upload-Pfad (2026-09-03): nimmt jetzt
// zusätzlich eine echte Datei entgegen (multipart/form-data statt reinem
// JSON, siehe upload.single('file') oben) sowie test_format/test_scope/
// consent - genau wie POST /content/sources beim Schüler-Upload. Läuft
// jetzt ASYNCHRON (Antwort kommt sofort mit status:'pending', die echte
// Verarbeitung läuft danach im Hintergrund, siehe
// processClassSourceInBackground oben) statt wie vorher synchron mit
// sofort fertigem Mock-Test - das war nötig, weil OCR+OpenAI-Aufruf ein
// paar Sekunden brauchen und dafür zu langsam für eine synchrone HTTP-
// Antwort sind (gleicher Grund wie beim Schüler-Upload, siehe Konzept-
// Dokument Abschnitt 6). Ein Titel bleibt weiterhin Pflicht, auch wenn
// eine Datei hochgeladen wird - er dient als Bezeichnung der
// Klassenarbeit in der Übersicht, unabhängig vom Dateiinhalt.
router.post('/classes/:id/sources', teacherAuthCheck, upload.single('file'), async (req, res) => {
  try {
    const cls = await loadOwnedClass(req, res);
    if (!cls) return;

    const { title, test_format, test_scope, consent } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Titel/Thema der Klassenarbeit erforderlich' });
    }

    const source = await createClassSource({
      classId: cls.id,
      teacherId: req.teacher.id,
      title: title.trim()
    });

    if (req.file) {
      classSourceFiles.set(String(source.id), {
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        testFormat: VALID_TEST_FORMATS.includes(test_format) ? test_format : 'multiple_choice',
        testScope: VALID_TEST_SCOPES.includes(test_scope) ? test_scope : 'standard',
        consent: consent === true || consent === 'true'
      });
    }

    res.status(201).json({
      success: true,
      source: {
        id: source.id,
        title: source.title,
        status: source.status,
        progress: source.progress || 0,
        createdAt: source.created_at
      }
    });

    // Fire-and-forget, wie beim Schüler-Upload (processing.js) - die
    // Response ist bereits raus, ein hier geworfener Fehler würde also
    // ohnehin nicht mehr beim Client ankommen. processClassSourceInBackground
    // fängt intern jeden Fehler ab und landet immer bei status:'completed'
    // (echter Test oder Mock-Fallback), dieser .catch() ist nur ein
    // zusätzliches Sicherheitsnetz gegen einen unerwarteten Absturz.
    processClassSourceInBackground(source.id).catch((err) => {
      console.error(`Unerwarteter Fehler bei der Verarbeitung von Class-Source ${source.id}:`, err);
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
        progress: source.progress || 0,
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
