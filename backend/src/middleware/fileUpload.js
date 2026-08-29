// src/middleware/fileUpload.js - Multer File Upload Middleware

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Upload Ordner erstellen, falls nicht existiert
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ordner pro Benutzer: /uploads/{userId}/
    const userDir = path.join(uploadDir, String(req.user?.id || 'unknown'));
    
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    // Filename: {timestamp}-{random}-{originalName}
    const timestamp = Date.now();
    const random = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '_').substring(0, 30);
    
    const filename = `${timestamp}-${random}-${name}${ext}`;
    cb(null, filename);
  },
});

// File Filter - nur JPG, PNG, PDF erlaubt
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'application/pdf'
  ];
  
  const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Nur JPG, PNG, PDF erlaubt. Erhalten: ${file.mimetype}`));
  }
};

// Multer Instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 5, // Max 5 Dateien gleichzeitig
  }
});

// Export verschiedene Upload-Optionen
module.exports = {
  // Single file upload
  uploadSingle: upload.single('file'),
  
  // Multiple files upload (max 5)
  uploadMultiple: upload.array('files', 5),
  
  // Error Handler Middleware
  handleUploadError: (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'Datei zu groß (max 10 MB)' 
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ 
          error: 'Zu viele Dateien (max 5)' 
        });
      }
      return res.status(400).json({ 
        error: `Upload-Fehler: ${err.message}` 
      });
    }
    
    if (err) {
      return res.status(400).json({ 
        error: err.message 
      });
    }
    
    next();
  },
  
  // Utilities
  getUploadDir: () => uploadDir,
  
  // Datei löschen
  deleteFile: (filePath) => {
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
};