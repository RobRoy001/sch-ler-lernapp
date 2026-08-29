// src/routes/content.js - Phase 2 Content Management APIs

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pool = require('../database/connection');
const { uploadSingle, uploadMultiple, handleUploadError, getUploadDir, deleteFile } = require('../middleware/fileUpload');

// Middleware: JWT Verification (wie in auth.js)
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

// ============= API 1: Upload einzelne Datei =============
router.post('/upload', verifyToken, uploadSingle, handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    const { originalname, filename, size, mimetype, path: filePath } = req.file;
    const userId = req.user.id;

    // Datei-Metadaten in DB speichern
    const result = await pool.query(
      `INSERT INTO uploaded_documents 
       (user_id, filename, file_path, file_size, file_type, source_type, upload_status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, filename, file_size, uploaded_at`,
      [
        userId,
        originalname,
        filePath,
        size,
        mimetype,
        'upload',
        'completed',
        JSON.stringify({ 
          uploadedName: filename,
          uploadedAt: new Date().toISOString() 
        })
      ]
    );

    const file = result.rows[0];

    res.status(201).json({
      message: 'Datei erfolgreich hochgeladen',
      file: {
        id: file.id,
        name: file.filename,
        size: file.file_size,
        uploadedAt: file.uploaded_at,
        type: mimetype
      }
    });
  } catch (error) {
    console.error('Upload Error:', error);
    // Datei löschen falls Fehler
    if (req.file) {
      await deleteFile(req.file.path).catch(err => console.error('Delete Error:', err));
    }
    res.status(500).json({ error: 'Server-Fehler beim Upload' });
  }
});

// ============= API 2: Upload mehrere Dateien =============
router.post('/upload-multiple', verifyToken, uploadMultiple, handleUploadError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Keine Dateien hochgeladen' });
    }

    const userId = req.user.id;
    const uploadedFiles = [];

    // Alle Dateien in DB speichern
    for (const file of req.files) {
      const result = await pool.query(
        `INSERT INTO uploaded_documents 
         (user_id, filename, file_path, file_size, file_type, source_type, upload_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, filename, file_size, uploaded_at`,
        [
          userId,
          file.originalname,
          file.path,
          file.size,
          file.mimetype,
          'upload',
          'completed'
        ]
      );

      uploadedFiles.push({
        id: result.rows[0].id,
        name: result.rows[0].filename,
        size: result.rows[0].file_size,
        uploadedAt: result.rows[0].uploaded_at
      });
    }

    res.status(201).json({
      message: `${uploadedFiles.length} Dateien erfolgreich hochgeladen`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Multiple Upload Error:', error);
    // Dateien löschen falls Fehler
    if (req.files) {
      for (const file of req.files) {
        await deleteFile(file.path).catch(err => console.error('Delete Error:', err));
      }
    }
    res.status(500).json({ error: 'Server-Fehler beim Upload' });
  }
});

// ============= API 3: File Validation (vor Upload) =============
router.post('/validate', (req, res) => {
  try {
    const { filename, size, type } = req.body;

    // Größen-Check
    if (size > 10 * 1024 * 1024) {
      return res.status(400).json({ 
        valid: false,
        error: 'Datei zu groß (max 10 MB)'
      });
    }

    // Format-Check
    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMimes.includes(type)) {
      return res.status(400).json({ 
        valid: false,
        error: 'Format nicht erlaubt (nur JPG, PNG, PDF)'
      });
    }

    res.json({
      valid: true,
      message: 'Datei ist valide',
      filename,
      size
    });
  } catch (error) {
    res.status(400).json({ valid: false, error: error.message });
  }
});

// ============= API 4: Get all books (Katalog) =============
router.get('/books', async (req, res) => {
  try {
    const { grade_level, subject } = req.query;

    let query = 'SELECT id, title, author, subject, grade_level, total_pages, isbn, description FROM books_catalog';
    const params = [];

    if (grade_level && subject) {
      query += ' WHERE grade_level = $1 AND subject = $2';
      params.push(grade_level, subject);
    } else if (grade_level) {
      query += ' WHERE grade_level = $1';
      params.push(grade_level);
    } else if (subject) {
      query += ' WHERE subject = $1';
      params.push(subject);
    }

    query += ' ORDER BY title ASC';

    const result = await pool.query(query, params);

    res.json({
      count: result.rows.length,
      books: result.rows
    });
  } catch (error) {
    console.error('Get Books Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Bücher' });
  }
});

// ============= API 5: Get book chapters =============
router.get('/books/:bookId/chapters', async (req, res) => {
  try {
    const { bookId } = req.params;

    // Erst Buch-Details holen
    const bookResult = await pool.query(
      'SELECT id, title, total_pages FROM books_catalog WHERE id = $1',
      [bookId]
    );

    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Buch nicht gefunden' });
    }

    const book = bookResult.rows[0];

    // Dann Kapitel holen
    const chaptersResult = await pool.query(
      `SELECT id, chapter_number, chapter_title, start_page, end_page, summary 
       FROM book_chapters 
       WHERE book_id = $1 
       ORDER BY chapter_number ASC`,
      [bookId]
    );

    res.json({
      book: {
        id: book.id,
        title: book.title,
        totalPages: book.total_pages
      },
      chapters: chaptersResult.rows
    });
  } catch (error) {
    console.error('Get Chapters Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Kapitel' });
  }
});

// ============= API 6: Create content source (Book/Upload) =============
router.post('/sources', verifyToken, async (req, res) => {
  try {
    const { content_type, reference_id, reference_book_id } = req.body;
    const userId = req.user.id;

    // Validierung
    if (!content_type || !reference_id) {
      return res.status(400).json({ error: 'content_type und reference_id erforderlich' });
    }

    if (!['uploaded_document', 'book_chapter'].includes(content_type)) {
      return res.status(400).json({ error: 'Ungültiger content_type' });
    }

    // Content Source erstellen
    const result = await pool.query(
      `INSERT INTO content_sources 
       (user_id, content_type, reference_id, reference_book_id, processing_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, content_type, processing_status, created_at`,
      [userId, content_type, reference_id, reference_book_id, 'pending']
    );

    const source = result.rows[0];

    res.status(201).json({
      message: 'Content Source erstellt',
      source: {
        id: source.id,
        type: source.content_type,
        status: source.processing_status,
        createdAt: source.created_at,
        nextStep: 'Phase 3: KI-Verarbeitung startet automatisch'
      }
    });
  } catch (error) {
    console.error('Create Source Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Erstellen der Content Source' });
  }
});

// ============= API 7: Get user uploads =============
router.get('/uploads', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query; // optional: filter by status

    let query = 'SELECT id, filename, file_size, file_type, upload_status, source_type, uploaded_at FROM uploaded_documents WHERE user_id = $1';
    const params = [userId];

    if (status) {
      query += ' AND upload_status = $2';
      params.push(status);
    }

    query += ' ORDER BY uploaded_at DESC';

    const result = await pool.query(query, params);

    res.json({
      count: result.rows.length,
      uploads: result.rows.map(row => ({
        id: row.id,
        name: row.filename,
        size: row.file_size,
        type: row.file_type,
        status: row.upload_status,
        source: row.source_type,
        uploadedAt: row.uploaded_at
      }))
    });
  } catch (error) {
    console.error('Get Uploads Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen der Uploads' });
  }
});

// ============= BONUS: Delete uploaded file =============
router.delete('/uploads/:fileId', verifyToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    // Überprüfen ob Datei dem User gehört
    const result = await pool.query(
      'SELECT file_path FROM uploaded_documents WHERE id = $1 AND user_id = $2',
      [fileId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Datei nicht gefunden' });
    }

    const { file_path } = result.rows[0];

    // Datei vom Filesystem löschen
    await deleteFile(file_path);

    // Aus DB löschen
    await pool.query('DELETE FROM uploaded_documents WHERE id = $1', [fileId]);

    res.json({ message: 'Datei erfolgreich gelöscht' });
  } catch (error) {
    console.error('Delete File Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Löschen der Datei' });
  }
});

module.exports = router;