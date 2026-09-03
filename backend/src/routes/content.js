const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createSource, nextFileId, findSourcesByUser, findSourceById } = require('../store');
const authCheck = require('../middleware/authCheck');
const asyncHandler = require('../utils/asyncHandler');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// POST /api/content/upload
router.post('/upload', authCheck, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen' });
  }

  const fileId = nextFileId();

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
router.post('/sources', authCheck, asyncHandler(async (req, res) => {
  try {
    const { content_type, reference_id, reference_book_id } = req.body;

    if (!content_type) {
      return res.status(400).json({ error: 'content_type erforderlich' });
    }

    const source = await createSource({
      userId: req.user.id,
      content_type,
      reference_id,
      reference_book_id
    });

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
