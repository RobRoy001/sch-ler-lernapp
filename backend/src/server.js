const express = require('express');
const cors = require('cors');
require('dotenv').config();

const processingRouter = require('./routes/processing');

const app = express();

app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ✅ Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
  });
});

// ✅ Simple Login Endpoint (für Tests)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Passwort erforderlich' });
    }

    // Mock user for testing
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    return res.json({
      success: true,
      message: 'Login erfolgreich',
      token: token,
      user: {
        id: 1,
        email: email,
        name: 'Test User'
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(401).json({ error: error.message });
  }
});

// ✅ Register Endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Passwort erforderlich' });
    }

    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    return res.json({
      success: true,
      message: 'Registrierung erfolgreich',
      token: token,
      user: {
        id: 1,
        email: email,
        name: name || 'New User'
      }
    });
  } catch (error) {
    console.error('Register Error:', error);
    return res.status(400).json({ error: error.message });
  }
});

// ✅ Logout Endpoint
app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logout erfolgreich' });
});

// ✅ Refresh Token Endpoint
app.post('/api/auth/refresh-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(401).json({ error: 'Token erforderlich' });
    }
    const newToken = Buffer.from(`refreshed:${Date.now()}`).toString('base64');
    return res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
});

// ✅ Processing Routes (Tests + Scoring) - FIX #2
app.use('/api/processing', processingRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint nicht gefunden',
    path: req.path,
    method: req.method,
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Interner Fehler',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║        🚀 LernApp Server Started       ║
╠════════════════════════════════════════╣
║ Port: ${PORT}
║ Environment: ${process.env.NODE_ENV || 'development'}
║ Status: Running ✅
║ Auth: Ready (Mock Mode)
║ Processing: Ready (FIX #2)
╚════════════════════════════════════════╝
    `);
  });
}

module.exports = app;