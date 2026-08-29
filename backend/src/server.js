// src/server.js - UPDATED mit Phase 3 Processing Routes

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./database/connection');
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const processingRoutes = require('./routes/processing');  // ← NEU!

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

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
app.use('/api/processing', processingRoutes);  // ← NEU!

// ============= ERROR HANDLERS =============

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Server-Fehler' });
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
  console.log(`📍 Processing Routes: http://localhost:${PORT}/api/processing/*`);  // ← NEU!
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