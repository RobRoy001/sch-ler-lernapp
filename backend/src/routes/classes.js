// Schüler-seitige Klassen-Routen (Lehrer-Portal Phase 1, 2026-09-03).
//
// Getrennt von routes/teacher.js: hier geht es um das KIND-Konto (normales
// "token"-Cookie, authCheck-Middleware), das einer Klasse beigetreten ist
// und deren Klassenarbeiten ansehen/bearbeiten darf - nicht um die
// Lehrkraft selbst. Jede Route prüft zusätzlich zur Anmeldung, ob dieser
// Schüler tatsächlich Mitglied der angefragten Klasse ist (Ownership-Check,
// gleiches Muster wie beim Eltern-Board: Autorisierung nie aus der URL
// ableiten, sondern immer serverseitig gegen die echte Mitgliedschaft
// prüfen).

const express = require('express');
const authCheck = require('../middleware/authCheck');
const {
  findClassMembership,
  findClassById,
  findMembersByClass,
  findClassSourcesByClass,
  findClassSourceById,
  findClassSourceSubmissionByStudent,
  createClassSourceSubmission,
  findUserBillingStatus,
  findPurchasesByUser,
  countKlassenaboPayers
} = require('../store');

// ✅ Klassen-Abo (2026-09-07): dieselben Werte wie in routes/billing.js
// (KLASSENABO_CAP_PAYERS) und im Preismodell-Dokument - hier nur für die
// Anzeige auf der Klassen-Abo-Seite (frontend), keine Zahlungslogik selbst.
const KLASSENABO_PRICE_PER_STUDENT_CENTS = 999;
const KLASSENABO_CAP_CENTS = 19900;
const KLASSENABO_CAP_PAYERS = 20;

const router = express.Router();

// ✅ Fix (2026-09-06): Klassenarbeiten hatten bisher weder eine Fragen-
// Detailansicht noch den Vertiefungsmodus (Robert: "kann nicht anklicken um
// zu sehen wo die Fehler waren" galt hier weiterhin, obwohl der individuelle
// Upload-Pfad das schon konnte). Diese beiden Hilfsfunktionen sind bewusst
// eine eigene Kopie von computeWeakTopics()/loadDeepeningAccess() aus
// routes/processing.js statt eines gemeinsamen Imports - gleiche
// Begründung wie bei generateMockClassTest() in routes/teacher.js: der
// Klassen-Pfad soll unabhängig vom individuellen Upload-Pfad bleiben, damit
// eine Änderung an der einen Stelle die andere nicht versehentlich mit
// beeinflusst.
function computeWeakTopics(gradedAnswers, { isPro, isUnlockedForSubmission }) {
  const byTopic = new Map();

  for (const a of gradedAnswers) {
    if (!a.topic) continue;
    if (!byTopic.has(a.topic)) {
      byTopic.set(a.topic, { topic: a.topic, wrongCount: 0, totalCount: 0 });
    }
    const entry = byTopic.get(a.topic);
    entry.totalCount++;
    if (!a.is_correct) entry.wrongCount++;
  }

  return Array.from(byTopic.values())
    .filter((t) => t.wrongCount > 0)
    .map((t) => ({ ...t, unlocked: isPro || isUnlockedForSubmission }))
    .sort((a, b) => b.wrongCount - a.wrongCount);
}

// Lädt Pro-Status + prüft, ob GENAU DIESE Klassenarbeit (classSourceSubmissionId)
// bereits per Einzelkauf freigeschaltet wurde - eigener Bezug
// (purchases.class_source_submission_id), weil test_submissions und
// class_source_submissions getrennte ID-Räume sind (siehe migrations.js).
async function loadDeepeningAccessForClass(userId, classSourceSubmissionId) {
  const [billing, purchases] = await Promise.all([
    findUserBillingStatus(userId),
    findPurchasesByUser(userId)
  ]);
  const isPro = billing?.subscription_status === 'active';
  const isUnlockedForSubmission = purchases.some(
    (p) => p.product_type === 'vertiefung' && p.class_source_submission_id === classSourceSubmissionId
  );
  return { isPro, isUnlockedForSubmission };
}

async function requireMembership(req, res) {
  const classId = parseInt(req.params.classId, 10);
  if (!classId) {
    res.status(400).json({ error: 'Ungültige Klassen-ID' });
    return null;
  }
  const membership = await findClassMembership(classId, req.user.id);
  if (!membership) {
    res.status(403).json({ error: 'Du bist kein Mitglied dieser Klasse' });
    return null;
  }
  return classId;
}

// Liste der Klassenarbeiten dieser Klasse, jeweils mit Hinweis, ob DIESER
// Schüler sie schon gemacht hat (für "Test starten" vs. "Bereits erledigt").
router.get('/:classId/sources', authCheck, async (req, res) => {
  try {
    const classId = await requireMembership(req, res);
    if (!classId) return;

    // ✅ Draft/Publish (2026-09-07): nur veröffentlichte Klassenarbeiten
    // erscheinen in der Schüler-Liste - eine noch nicht freigegebene bleibt
    // für die Lehrkraft (routes/teacher.js, dort ohne diesen Filter) sicht-
    // bar, für die Klasse aber nicht. Gefiltert hier statt in
    // findClassSourcesByClass() selbst, weil dieselbe Store-Funktion auch
    // vom Lehrer-Pfad genutzt wird, der bewusst ALLE Status sehen soll.
    const allSources = await findClassSourcesByClass(classId);
    const sources = allSources.filter((s) => s.visibility === 'published');
    const sourcesWithStatus = await Promise.all(
      sources.map(async (source) => {
        const submission = await findClassSourceSubmissionByStudent(source.id, req.user.id);
        return {
          id: source.id,
          title: source.title,
          status: source.status,
          questionCount: source.test?.questions?.length || 0,
          completed: !!submission,
          lastResult: submission
            ? {
                correctCount: submission.correct_count,
                totalQuestions: submission.total_questions,
                accuracy: submission.accuracy,
                submittedAt: submission.submitted_at
              }
            : null
        };
      })
    );

    return res.json({ sources: sourcesWithStatus });
  } catch (error) {
    console.error('Class Sources (Student) Error:', error);
    return res.status(500).json({ error: 'Klassenarbeiten konnten nicht geladen werden' });
  }
});

router.get('/:classId/sources/:sourceId', authCheck, async (req, res) => {
  try {
    const classId = await requireMembership(req, res);
    if (!classId) return;

    const sourceId = parseInt(req.params.sourceId, 10);
    const source = await findClassSourceById(sourceId);
    if (!source || source.class_id !== classId) {
      return res.status(404).json({ error: 'Klassenarbeit nicht gefunden' });
    }
    // ✅ Draft/Publish (2026-09-07): verhindert, dass ein Schüler eine noch
    // nicht veröffentlichte Klassenarbeit direkt über die sourceId aufruft
    // (URL erraten/eine alte, aus der Liste bereits entfernte ID) - der
    // Listen-Filter oben allein würde das nicht abdecken.
    if (source.visibility !== 'published') {
      return res.status(404).json({ error: 'Klassenarbeit nicht gefunden' });
    }
    if (!source.test) {
      return res.status(404).json({ error: 'Test noch nicht bereit' });
    }

    return res.json({ test: { id: source.id, ...source.test } });
  } catch (error) {
    console.error('Class Source (Student) Error:', error);
    return res.status(500).json({ error: 'Test konnte nicht geladen werden' });
  }
});

// ✅ Sicherheitsaudit Kritisch #4: die Bewertung passiert serverseitig -
// der Client sendet nur die rohen Antworten, nie ein selbst berechnetes
// Ergebnis (gleiches Muster wie processing.js /tests/:testId/submit).
router.post('/:classId/sources/:sourceId/submit', authCheck, async (req, res) => {
  try {
    const classId = await requireMembership(req, res);
    if (!classId) return;

    const sourceId = parseInt(req.params.sourceId, 10);
    const source = await findClassSourceById(sourceId);
    if (!source || source.class_id !== classId || !source.test) {
      return res.status(404).json({ error: 'Klassenarbeit nicht gefunden' });
    }
    // ✅ Draft/Publish (2026-09-07): gleicher Schutz wie beim Laden des Tests
    // oben - eine unveröffentlichte Klassenarbeit lässt sich nicht
    // abschicken, auch nicht mit einer direkt konstruierten Anfrage.
    if (source.visibility !== 'published') {
      return res.status(404).json({ error: 'Klassenarbeit nicht gefunden' });
    }

    const { answers } = req.body;
    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers (Array) erforderlich' });
    }

    const questions = source.test.questions || [];
    const answerByQuestionId = new Map(answers.map((a) => [String(a.question_id), a.answer]));

    let correctCount = 0;
    // ✅ Fix (2026-09-06): gradedAnswers trägt jetzt dieselben Detaildaten wie
    // beim individuellen Upload (routes/processing.js /tests/:testId/submit)
    // mit - Grundlage sowohl für die Fragen-Detailansicht (AnswerReview) als
    // auch für die Schwachthemen-Erkennung (computeWeakTopics oben).
    const gradedAnswers = questions.map((q) => {
      const userAnswer = answerByQuestionId.get(String(q.id)) || '';
      const isCorrect =
        !!userAnswer &&
        userAnswer.toLowerCase().trim() === String(q.correct_answer).toLowerCase().trim();
      if (isCorrect) correctCount++;
      return {
        question_id: q.id,
        answer: userAnswer,
        is_correct: isCorrect,
        topic: q.type === 'vocabulary' ? null : q.topic || null,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        explanation: q.explanation || ''
      };
    });

    const totalQuestions = questions.length;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const submission = await createClassSourceSubmission({
      classSourceId: sourceId,
      studentUserId: req.user.id,
      correctCount,
      totalQuestions,
      accuracy,
      answersJson: gradedAnswers
    });

    const access = await loadDeepeningAccessForClass(req.user.id, submission.id);
    const weakTopics = computeWeakTopics(gradedAnswers, access);

    return res.json({
      success: true,
      submission: {
        id: submission.id,
        correctCount: submission.correct_count,
        totalQuestions: submission.total_questions,
        accuracy: submission.accuracy,
        submittedAt: submission.submitted_at,
        answers: gradedAnswers,
        weakTopics
      }
    });
  } catch (error) {
    console.error('Class Source Submit Error:', error);
    return res.status(500).json({ error: 'Test konnte nicht eingereicht werden' });
  }
});

// ✅ Fix (2026-09-06): GET-Pendant zu POST .../submit, für "Nochmal ansehen"
// in KlassePage.jsx (vorher öffnete das den leeren Test erneut statt das
// bereits abgegebene Ergebnis zu zeigen) UND für die Rückkehr von Stripe
// nach einem Vertiefungsmodus-Einzelkauf (gleiches Muster wie
// GET /api/processing/submissions/:submissionId).
router.get('/:classId/sources/:sourceId/result', authCheck, async (req, res) => {
  try {
    const classId = await requireMembership(req, res);
    if (!classId) return;

    const sourceId = parseInt(req.params.sourceId, 10);
    const source = await findClassSourceById(sourceId);
    if (!source || source.class_id !== classId) {
      return res.status(404).json({ error: 'Klassenarbeit nicht gefunden' });
    }

    const submission = await findClassSourceSubmissionByStudent(sourceId, req.user.id);
    if (!submission) {
      return res.status(404).json({ error: 'Du hast diese Klassenarbeit noch nicht abgegeben' });
    }

    const gradedAnswers = submission.answers_json || [];
    const access = await loadDeepeningAccessForClass(req.user.id, submission.id);
    const weakTopics = computeWeakTopics(gradedAnswers, access);

    return res.json({
      success: true,
      submission: {
        id: submission.id,
        title: source.title,
        correctCount: submission.correct_count,
        totalQuestions: submission.total_questions,
        accuracy: submission.accuracy,
        submittedAt: submission.submitted_at,
        answers: gradedAnswers,
        weakTopics
      }
    });
  } catch (error) {
    console.error('Class Source Result Error:', error);
    return res.status(500).json({ error: 'Ergebnis konnte nicht geladen werden' });
  }
});

// ✅ Klassen-Abo (2026-09-07): Datengrundlage für die Klassen-Abo-Seite
// (frontend, neue Route z.B. /klasse/:classId/abo) - zeigt Klassenname,
// Mitgliederzahl, wie viele schon bezahlt haben und ob die Kappungsgrenze
// bereits erreicht ist (dann lohnt sich für weitere Mitglieder kein Kauf
// mehr, sie sind schon automatisch freigeschaltet).
router.get('/:classId/klassenabo-status', authCheck, async (req, res) => {
  try {
    const classId = await requireMembership(req, res);
    if (!classId) return;

    const [cls, members, payerCount] = await Promise.all([
      findClassById(classId),
      findMembersByClass(classId),
      countKlassenaboPayers(classId)
    ]);

    const billing = await findUserBillingStatus(req.user.id);
    const alreadyActive = cls?.subscription_status === 'active' || billing?.subscription_status === 'active';

    return res.json({
      classId,
      className: cls?.name || '',
      memberCount: members.length,
      payerCount,
      capPayers: KLASSENABO_CAP_PAYERS,
      capReached: cls?.subscription_status === 'active',
      pricePerStudentCents: KLASSENABO_PRICE_PER_STUDENT_CENTS,
      capCents: KLASSENABO_CAP_CENTS,
      // true, wenn dieser eingeloggte Nutzer bereits Zugriff hat (eigenes
      // Pro-Abo, eigener Klassen-Abo-Kauf, oder die Klasse hat die
      // Kappungsgrenze schon erreicht) - Frontend blendet den Kaufen-Button
      // dann aus.
      alreadyActive
    });
  } catch (error) {
    console.error('Klassen-Abo-Status Error:', error);
    return res.status(500).json({ error: 'Klassen-Abo-Status konnte nicht geladen werden' });
  }
});

module.exports = router;
