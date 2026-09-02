const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createSource, nextFileId } = require('../store');
const authCheck = require('../middleware/authCheck');

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
// ✅ Sicherheitsaudit Befund 10: legt die Source jetzt in der echten
// Datenbank an (store.js), nicht mehr nur in einer In-Memory-Map - bleibt
// deshalb auch nach einem Server-Neustart erhalten.
router.post('/sources', authCheck, async (req, res) => {
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
});

// ---- Platzhalter-Bücherkatalog (statisch, kein DB-Zugriff nötig) ----
// Ersetzt die alte Version, die eine nie migrierte books_catalog-Tabelle
// voraussetzte und deshalb immer 500er zurückgab.
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