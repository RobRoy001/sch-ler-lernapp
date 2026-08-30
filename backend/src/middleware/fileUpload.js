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

// Multer Instance - EXPORT DIREKT!
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 5, // Max 5 Dateien gleichzeitig
  }
});

// Export die Multer-Instanz direkt
module.exports = upload;