// src/server.js - UPDATED mit vollständiger CORS Konfiguration

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./database/connection');
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const processingRoutes = require('./routes/processing');

dotenv.config();

const app = express();

// ============= CORS KONFIGURATION =============
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
}));

// ============= MIDDLEWARE =============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============= HEALTH CHECKS =============

app.get('/health', (req, res) => {
  res.json({ status: 'Backend läuft ✅' });
});

app.get('/api/db-status', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: '✅ PostgreSQL verbunden',
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ROUTES =============

app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/processing', processingRoutes);

// ============= ERROR HANDLERS =============

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  
  // Multer Fehler
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Datei zu groß (max 10MB)' });
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Zu viele Dateien (max 5)' });
  }
  
  if (err.message && err.message.includes('Nur JPG, PNG, PDF erlaubt')) {
    return res.status(400).json({ error: err.message });
  }
  
  res.status(500).json({ error: 'Server-Fehler: ' + err.message });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route nicht gefunden' });
});

// ============= SERVER START =============

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Schüler-Lernapp Backend läuft!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`📍 Health Check: http://localhost:${PORT}/health`);
  console.log(`📍 Auth Routes: http://localhost:${PORT}/api/auth/*`);
  console.log(`📍 Content Routes: http://localhost:${PORT}/api/content/*`);
  console.log(`📍 Processing Routes: http://localhost:${PORT}/api/processing/*`);
  console.log(`📍 DB Status: http://localhost:${PORT}/api/db-status`);
  console.log(`${'='.repeat(60)}\n`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('Server wird beendet...');
  pool.end();
  process.exit(0);
});

module.exports = app;