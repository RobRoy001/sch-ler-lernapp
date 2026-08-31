const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { authMiddleware } = require('../middleware/auth');
const securityHeaders = require('../middleware/securityHeaders');
const httpsRedirect = require('../middleware/httpsRedirect');

const {
  loginLimiter,
  apiLimiter,
  ageLimiter,
  registerLimiter,
} = require('../middleware/rateLimiter');
const rateLimitLogger = require('../middleware/rateLimitLogger');

const authRouter = require('../routes/auth');
const authDataExportRouter = require('../routes/auth-data-export');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(securityHeaders);

if (process.env.NODE_ENV === 'production') {
  app.use(httpsRedirect);
}

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://robroy001.github.io',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(morgan('combined'));

app.use(rateLimitLogger);
app.use('/api/', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
  });
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const result = await require('../services/AuthService').login(req.body);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.post('/api/auth/register', registerLimiter, async (req, res) => {
  try {
    const result = await require('../services/AuthService').register(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/verify-age', ageLimiter, async (req, res) => {
  try {
    const result = await require('../services/AgeVerificationService').verify(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/refresh-token', loginLimiter, async (req, res) => {
  try {
    const result = await require('../services/AuthService').refreshToken(req.body);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  res.json({ message: 'Logout erfolgreich' });
});

app.use('/api/auth', authDataExportRouter);

app.post('/api/auth/request-deletion', authMiddleware, async (req, res) => {
  try {
    const result = await require('../services/DeletionService').requestDeletion(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/accept-privacy', authMiddleware, async (req, res) => {
  try {
    const result = await require('../services/ConsentService').acceptPrivacy(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/set-cookie-consent', authMiddleware, async (req, res) => {
  try {
    const result = await require('../services/ConsentService').setCookieConsent(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/lessons', authMiddleware, async (req, res) => {
  try {
    const lessons = await require('../services/LessonService').getLessons();
    res.json(lessons);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/lessons/:id/complete', authMiddleware, async (req, res) => {
  try {
    const result = await require('../services/LessonService').completeLesson(req.user.id, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint nicht gefunden',
    path: req.path,
    method: req.method,
  });
});

app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Zu viele Anfragen',
      retryAfter: err.retryAfter,
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Interner Fehler',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 3000;

let server;

if (process.env.HTTPS === 'true' || process.env.NODE_ENV === 'production') {
  const https = require('https');
  const fs = require('fs');
  const tlsConfig = require('../config/tlsConfig');

  try {
    const options = {
      key: fs.readFileSync(tlsConfig.keyPath),
      cert: fs.readFileSync(tlsConfig.certPath),
    };
    server = https.createServer(options, app);
  } catch (error) {
    console.warn('[TLS Warning]', error.message);
    server = require('http').createServer(app);
  }
} else {
  server = require('http').createServer(app);
}

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║        🚀 LernApp Server Started       ║
╠════════════════════════════════════════╣
║ Environment: ${process.env.NODE_ENV || 'development'}
║ Port: ${PORT}
║ HTTPS: ${process.env.HTTPS === 'true' ? 'Enabled ✅' : 'Disabled'}
║ Rate Limiting: Enabled ✅
║ Compliance: DSGVO ✅
╚════════════════════════════════════════╝
    `);
  });
}

module.exports = app;
module.exports.server = server;
