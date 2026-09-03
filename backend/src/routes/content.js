const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createSource, nextFileId, findSourcesByUser, findSourceById } = require('../store');
const authCheck = require('../middleware/authCheck');
const asyncHandler = require('../utils/asyncHandler');
const { uploads, sourceFiles } = require('../utils/pendingUploads');
// ✅ Lehrer-Upload-Pipeline (2026-09-03): diese beiden Konstanten werden
// jetzt auch von routes/teacher.js gebraucht - siehe utils/testFormats.js.
const { VALID_TEST_FORMATS, VALID_TEST_SCOPES } = require('../utils/testFormats');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// POST /api/content/upload
//
// ✅ KI-Testgenerierung (2026-09-03): die Datei-Bytes wurden hier vorher
// nach dem Request nie wieder angefasst (siehe KI-Testgenerierung-Konzept
// Abschnitt 1 - "die hochgeladene Datei wird komplett verworfen"). Jetzt
// wird der Buffer kurzzeitig in pendingUploads.uploads zwischengehalten,
// bis POST /sources ihn per file_id abholt und an die eigentliche Source
// hängt - siehe utils/pendingUploads.js für die genaue Begründung (kein
// externer Objektspeicher, TTL-Aufräumung).
router.post('/upload', authCheck, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen' });
  }

  const fileId = String(nextFileId());
  uploads.set(fileId, {
    buffer: req.file.buffer,
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    userId: req.user.id
  });

  res.json({
    message: 'Datei erfolgreich hochgeladen',
    file: {
      id: fileId,
      filename: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    }
  });
});

// POST /api/content/sources
//
// Nimmt jetzt zusätzlich file_id (aus POST /upload), test_format, test_scope
// und consent entgegen (siehe UploadPage.jsx) und verknüpft die zuvor
// hochgeladene Datei mit der neu angelegten Source, statt die beiden völlig
// unabhängig voneinander zu lassen (siehe KI-Testgenerierung-Konzept
// Abschnitt 9, "Upload und Source-Anlage in einem Schritt zusammenführen" -
// technisch weiterhin zwei Requests, aber die Datei geht dazwischen nicht
// mehr verloren).
router.post('/sources', authCheck, asyncHandler(async (req, res) => {
  try {
    const { content_type, reference_id, reference_book_id, file_id, test_format, test_scope, consent } = req.body;

    if (!content_type) {
      return res.status(400).json({ error: 'content_type erforderlich' });
    }

    const source = await createSource({
      userId: req.user.id,
      content_type,
      reference_id,
      reference_book_id
    });

    if (file_id !== undefined && file_id !== null && file_id !== '') {
      const pending = uploads.take(String(file_id));
      // Nur übernehmen, wenn die Datei tatsächlich von diesem Nutzer
      // hochgeladen wurde - verhindert, dass jemand die file_id einer
      // fremden, noch nicht abgeholten Datei errät und sich damit einen
      // fremden Upload "stiehlt".
      if (pending && pending.userId === req.user.id) {
        sourceFiles.set(String(source.id), {
          buffer: pending.buffer,
          filename: pending.filename,
          mimetype: pending.mimetype,
          testFormat: VALID_TEST_FORMATS.includes(test_format) ? test_format : 'multiple_choice',
          testScope: VALID_TEST_SCOPES.includes(test_scope) ? test_scope : 'standard',
          consent: consent === true || consent === 'true'
        });
      }
    }

    res.json({
      message: 'Content Source erstellt',
      source: { id: source.id, content_type: source.content_type, status: source.status }
    });
  } catch (error) {
    console.error('Fehler beim Anlegen der Content Source:', error);
    res.status(500).json({ error: 'Content Source konnte nicht erstellt werden' });
  }
}));

// ✅ GET /api/content/sources - alle hochgeladenen Aufgaben des Nutzers
// (wird von der TasksOverviewPage im Frontend gebraucht). Die sources-
// Tabelle hat keine eigene title/description Spalte - hier aus
// content_type + id abgeleitet, statt sie künstlich in der DB zu ergänzen.
router.get('/sources', authCheck, asyncHandler(async (req, res) => {
  const sources = await findSourcesByUser(req.user.id);

  res.json({
    sources: sources.map((s) => ({
      id: s.id,
      title: `${s.content_type || 'Aufgabe'} #${s.id}`,
      description: null,
      status: s.status,
      progress: s.progress || 0,
      question_count: s.test && s.test.questions ? s.test.questions.length : 0,
      created_at: s.created_at
    }))
  });
}));

// ✅ GET /api/content/sources/:id - Details einer einzelnen Aufgabe
router.get('/sources/:id', authCheck, asyncHandler(async (req, res) => {
  const source = await findSourceById(parseInt(req.params.id, 10));

  if (!source || source.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Aufgabe nicht gefunden' });
  }

  res.json({
    source: {
      id: source.id,
      title: `${source.content_type || 'Aufgabe'} #${source.id}`,
      status: source.status,
      progress: source.progress || 0,
      created_at: source.created_at
    }
  });
}));

// ---- Platzhalter-Bücherkatalog (statisch, kein DB-Zugriff nötig) ----
const MOCK_BOOKS = [
  { id: 1, title: 'Mathematik 9', author: 'Klett Verlag', total_pages: 240, grade_level: '9', subject: 'Mathe' },
  { id: 2, title: 'Deutschbuch 9', author: 'Cornelsen', total_pages: 220, grade_level: '9', subject: 'Deutsch' },
  { id: 3, title: 'English G 9', author: 'Cornelsen', total_pages: 200, grade_level: '9', subject: 'Englisch' }
];

const MOCK_CHAPTERS = {
  1: [
    { id: 101, book_id: 1, chapter_number: 1, chapter_title: 'Bruchrechnung', start_page: 5, end_page: 30 },
    { id: 102, book_id: 1, chapter_number: 2, chapter_title: 'Lineare Gleichungen', start_page: 31, end_page: 58 }
  ],
  2: [
    { id: 201, book_id: 2, chapter_number: 1, chapter_title: 'Kurzgeschichten', start_page: 10, end_page: 40 }
  ],
  3: [
    { id: 301, book_id: 3, chapter_number: 1, chapter_title: 'Present Perfect', start_page: 12, end_page: 28 }
  ]
};

// GET /api/content/books
router.get('/books', (req, res) => {
  const { grade_level, subject } = req.query;
  let books = MOCK_BOOKS;
  if (grade_level) books = books.filter(b => b.grade_level === grade_level);
  if (subject) books = books.filter(b => b.subject === subject);
  res.json({ books });
});

// GET /api/content/books/:bookId/chapters
router.get('/books/:bookId/chapters', (req, res) => {
  const chapters = MOCK_CHAPTERS[req.params.bookId] || [];
  res.json({ chapters });
});

module.exports = router;
