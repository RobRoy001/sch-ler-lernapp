const express = require('express');
const router = express.Router();
const pool = require('../database/connection');
const upload = require('../middleware/fileUpload');
 
// Middleware: JWT Verification
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
 
  if (!token) {
    return res.status(403).json({ error: 'Token erforderlich' });
  }
 
  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token ungültig oder abgelaufen' });
    }
    req.user = decoded;
    next();
  });
}
 
// ============= API 1: Upload einzelne Datei + erstelle Source =============
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }
 
    const { originalname, filename, size, mimetype, path: filePath } = req.file;
    const userId = req.user.id;
 
    console.log(`📁 Upload: ${originalname} (${size} bytes) für User ${userId}`);
 
    // Schritt 1: Speichere Datei in DB
    const uploadResult = await pool.query(
      'INSERT INTO uploaded_documents (user_id, filename, file_path, file_size, file_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, filename, file_path, file_size, file_type',
      [userId, originalname, filePath, size, mimetype]
    );
 
    const uploadedFile = uploadResult.rows[0];
    console.log(`✅ File ${uploadedFile.id} in DB gespeichert`);
 
    // Schritt 2: Erstelle Content Source für Processing
    const sourceResult = await pool.query(
      'INSERT INTO content_sources (user_id, content_type, reference_id, processing_status) VALUES ($1, $2, $3, $4) RETURNING id, content_type, reference_id, processing_status',
      [userId, 'uploaded_document', uploadedFile.id, 'pending']
    );
 
    const source = sourceResult.rows[0];
    console.log(`✅ Content Source ${source.id} erstellt`);
 
    res.json({
      message: 'Datei erfolgreich hochgeladen',
      file: {
        id: uploadedFile.id,
        filename: uploadedFile.filename,
        size: uploadedFile.file_size,
        type: uploadedFile.file_type,
        path: uploadedFile.file_path
      },
      source: {
        id: source.id,
        content_type: source.content_type,
        status: source.processing_status
      }
    });
  } catch (error) {
    console.error('❌ Upload Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Upload' });
  }
});
 
// ============= API 2: Upload multiple Dateien =============
router.post('/upload-multiple', verifyToken, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Keine Dateien hochgeladen' });
    }
 
    const userId = req.user.id;
    const uploadedFiles = [];
    const sources = [];
 
    for (const file of req.files) {
      // Speichere jede Datei
      const uploadResult = await pool.query(
        'INSERT INTO uploaded_documents (user_id, filename, file_path, file_size, file_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, filename, file_path, file_size, file_type',
        [userId, file.originalname, file.path, file.size, file.mimetype]
      );
 
      const uploadedFile = uploadResult.rows[0];
      uploadedFiles.push(uploadedFile);
 
      // Erstelle Source für jede Datei
      const sourceResult = await pool.query(
        'INSERT INTO content_sources (user_id, content_type, reference_id, processing_status) VALUES ($1, $2, $3, $4) RETURNING id, content_type, reference_id, processing_status',
        [userId, 'uploaded_document', uploadedFile.id, 'pending']
      );
 
      sources.push(sourceResult.rows[0]);
    }
 
    console.log(`✅ ${uploadedFiles.length} Dateien hochgeladen`);
 
    res.json({
      message: `${uploadedFiles.length} Dateien erfolgreich hochgeladen`,
      files: uploadedFiles,
      sources: sources
    });
  } catch (error) {
    console.error('❌ Upload Multiple Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Upload' });
  }
});
 
// ============= API 3: Datei validieren =============
router.post('/validate', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }
 
    const { originalname, size, mimetype } = req.file;
 
    res.json({ 
      valid: true, 
      message: 'Datei ist gültig',
      file: {
        name: originalname,
        size: size,
        type: mimetype
      }
    });
  } catch (error) {
    console.error('❌ Validate Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Validieren' });
  }
});
 
// ============= API 4: Get Bücher Katalog =============
router.get('/books', async (req, res) => {
  try {
    const { grade_level, subject } = req.query;
 
    let query = 'SELECT * FROM books_catalog WHERE 1=1';
    const params = [];
 
    if (grade_level) {
      query += ' AND grade_level = $' + (params.length + 1);
      params.push(grade_level);
    }
 
    if (subject) {
      query += ' AND subject = $' + (params.length + 1);
      params.push(subject);
    }
 
    const result = await pool.query(query, params);
    res.json({ books: result.rows });
  } catch (error) {
    console.error('❌ Get Books Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Bücher' });
  }
});
 
// ============= API 5: Get Buch Kapitel =============
router.get('/books/:bookId/chapters', async (req, res) => {
  try {
    const { bookId } = req.params;
 
    const result = await pool.query(
      'SELECT * FROM book_chapters WHERE book_id = $1 ORDER BY chapter_number',
      [bookId]
    );
 
    res.json({ chapters: result.rows });
  } catch (error) {
    console.error('❌ Get Chapters Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Kapitel' });
  }
});
 
// ============= API 6: Erstelle Content Source =============
router.post('/sources', verifyToken, async (req, res) => {
  try {
    const { content_type, reference_id, reference_book_id } = req.body;
    const userId = req.user.id;
 
    const result = await pool.query(
      'INSERT INTO content_sources (user_id, content_type, reference_id, reference_book_id, processing_status) VALUES ($1, $2, $3, $4, $5) RETURNING id, content_type, reference_id, processing_status',
      [userId, content_type, reference_id, reference_book_id, 'pending']
    );
 
    res.json({
      message: 'Content Source erstellt',
      source: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Create Source Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Erstellen der Source' });
  }
});
 
// ============= API 7: Get User Uploads =============
router.get('/uploads', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
 
    const result = await pool.query(
      'SELECT id, filename, file_size, file_type, upload_date FROM uploaded_documents WHERE user_id = $1 ORDER BY upload_date DESC',
      [userId]
    );
 
    res.json({ uploads: result.rows });
  } catch (error) {
    console.error('❌ Get Uploads Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Uploads' });
  }
});
 
// ============= API 8: Lösche Upload =============
router.delete('/uploads/:fileId', verifyToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;
 
    const result = await pool.query(
      'DELETE FROM uploaded_documents WHERE id = $1 AND user_id = $2 RETURNING id',
      [fileId, userId]
    );
 
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
    }
 
    res.json({ message: 'Datei gelöscht' });
  } catch (error) {
    console.error('❌ Delete Upload Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Löschen' });
  }
});
 
module.exports = router;