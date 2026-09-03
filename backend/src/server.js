const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const { JWT_SECRET } = require('./config/jwt');
const { sendParentConsentEmail } = require('./config/email');
const { calculateAge } = require('./utils/age');
const authCheck = require('./middleware/authCheck');
const { setAuthCookie, clearAuthCookie } = require('./utils/cookies');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const { query } = require('./database/connection');
const {
  createUser,
  findUserByEmail,
  findUserById,
  findUserWithPasswordById,
  findUserByConsentToken,
  updateUser,
  exportUserData,
  deleteUser
} = require('./store');
const processingRouter = require('./routes/processing');
const contentRouter = require('./routes/content');

// Unter diesem Alter ist laut Art. 8 DSGVO eine Elternzustimmung nötig,
// bevor ein Konto aktiv genutzt werden darf (Sicherheitsaudit Kritisch #5).
const PARENT_CONSENT_AGE = 16;
const PARENT_CONSENT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage

const app = express();

const generateToken = (user) =>
  jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  grade_level: user.grade_level
});

app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ✅ Health Check - bewusst VOR dem Rate Limiter definiert
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
  });
});

// ✅ Rate Limiting (Sicherheitsaudit Hoch #7)
app.use('/api', apiLimiter);

// ✅ Login Endpoint - echte Passwortprüfung (Sicherheitsaudit Kritisch #2)
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email und Passwort erforderlich' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Email oder Passwort falsch' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email oder Passwort falsch' });
    }

    // ✅ Sicherheitsaudit Kritisch #5 (Art. 8 DSGVO)
    if (user.account_status === 'pending_parent_consent') {
      return res.status(403).json({
        error: 'Dieses Konto wartet noch auf die Zustimmung eines Erziehungsberechtigten.',
        pendingParentConsent: true
      });
    }

    const token = generateToken(user);
    // ✅ Sicherheitsaudit Mittel #16: Token im httpOnly-Cookie statt localStorage
    setAuthCookie(res, token);

    return res.json({
      success: true,
      message: 'Login erfolgreich',
      token, // bleibt zusätzlich im Body für curl/Postman-Tests, Frontend nutzt das Cookie
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Login fehlgeschlagen' });
  }
});

// ✅ Register Endpoint (Sicherheitsaudit Kritisch #5)
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name, grade_level, date_of_birth, parent_email } = req.body;

    if (!email || !password || !name || !date_of_birth) {
      return res.status(400).json({ error: 'Name, Email, Passwort und Geburtsdatum sind erforderlich' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });
    }

    const age = calculateAge(date_of_birth);
    if (age === null || age < 0 || age > 120) {
      return res.status(400).json({ error: 'Ungültiges Geburtsdatum' });
    }

    if (await findUserByEmail(email)) {
      return res.status(409).json({ error: 'Diese Email ist bereits registriert' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (age < PARENT_CONSENT_AGE) {
      if (!parent_email) {
        return res.status(400).json({
          error: 'Für Nutzer unter 16 Jahren ist die Email eines Erziehungsberechtigten erforderlich'
        });
      }

      const consentToken = crypto.randomBytes(32).toString('hex');
      const consentExpires = new Date(Date.now() + PARENT_CONSENT_TTL_MS).toISOString();

      await createUser({
        email,
        password: passwordHash,
        name,
        grade_level,
        dateOfBirth: date_of_birth,
        parentEmail: parent_email,
        ageVerified: false,
        parentConsentToken: consentToken,
        parentConsentExpires: consentExpires,
        accountStatus: 'pending_parent_consent'
      });

      const consentUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/parent-consent?token=${consentToken}`;
      try {
        await sendParentConsentEmail(parent_email, consentUrl, name);
      } catch (emailError) {
        console.error('Parent-Consent-Email konnte nicht gesendet werden:', emailError.message);
        // Registrierung bleibt trotzdem erfolgreich - der Consent-Link
        // funktioniert auch ohne die Email (z.B. manuell weitergegeben).
      }

      return res.status(202).json({
        success: true,
        pendingParentConsent: true,
        message: 'Registrierung erfasst. Ein Erziehungsberechtigter muss der Nutzung noch zustimmen.'
      });
    }

    const user = await createUser({
      email,
      password: passwordHash,
      name,
      grade_level,
      dateOfBirth: date_of_birth,
      ageVerified: true,
      accountStatus: 'active'
    });
    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Registrierung erfolgreich',
      token,
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
  }
});

// ✅ Elternzustimmung - Vorschau
app.get('/api/auth/parent-consent', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Token erforderlich' });
  }

  const user = await findUserByConsentToken(token);
  if (!user || user.account_status !== 'pending_parent_consent') {
    return res.status(404).json({ error: 'Dieser Link ist ungültig oder wurde bereits verwendet' });
  }

  if (new Date(user.parent_consent_expires) < new Date()) {
    return res.status(410).json({ error: 'Dieser Link ist abgelaufen. Bitte erneut registrieren.' });
  }

  return res.json({
    childName: user.name,
    parentEmail: user.parent_email
  });
});

// ✅ Elternzustimmung - Bestätigung
app.post('/api/auth/parent-consent/confirm', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token erforderlich' });
    }

    const user = await findUserByConsentToken(token);
    if (!user || user.account_status !== 'pending_parent_consent') {
      return res.status(404).json({ error: 'Dieser Link ist ungültig oder wurde bereits verwendet' });
    }

    if (new Date(user.parent_consent_expires) < new Date()) {
      return res.status(410).json({ error: 'Dieser Link ist abgelaufen. Bitte erneut registrieren.' });
    }

    await updateUser(user.id, {
      accountStatus: 'active',
      ageVerified: true,
      parentConsentToken: null,
      parentConsentExpires: null,
      parentConsentAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'Zustimmung bestätigt. Das Konto ist jetzt freigeschaltet und kann sich einloggen.'
    });
  } catch (error) {
    console.error('Parent Consent Error:', error);
    return res.status(500).json({ error: 'Bestätigung fehlgeschlagen' });
  }
});

// ✅ Profile Endpoint
app.get('/api/auth/profile', authCheck, async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Nutzer nicht gefunden' });
  }
  return res.json(publicUser(user));
});

// ✅ Logout Endpoint
app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logout erfolgreich' });
});

// ✅ Refresh Token Endpoint
app.post('/api/auth/refresh-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(401).json({ error: 'Token erforderlich' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Nutzer nicht gefunden' });
    }

    const newToken = generateToken(user);
    setAuthCookie(res, newToken);

    return res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    return res.status(401).json({ error: 'Token ungültig oder abgelaufen' });
  }
});

// ✅ Datenexport - Art. 20 DSGVO
app.get('/api/auth/export-data', authCheck, async (req, res) => {
  try {
    const data = await exportUserData(req.user.id);
    if (!data) {
      return res.status(404).json({ error: 'Nutzer nicht gefunden' });
    }

    const exportPayload = {
      export_date: new Date().toISOString(),
      ...data
    };

    const filename = `kapiert-meine-daten-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(exportPayload, null, 2));
  } catch (error) {
    console.error('Export Error:', error);
    res.status(500).json({ error: 'Datenexport fehlgeschlagen' });
  }
});

// ✅ Kontolöschung - Art. 17 DSGVO
app.delete('/api/auth/account', authLimiter, authCheck, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Passwort zur Bestätigung erforderlich' });
    }

    const user = await findUserWithPasswordById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Nutzer nicht gefunden' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Passwort falsch' });
    }

    await deleteUser(user.id);
    clearAuthCookie(res);

    return res.json({
      success: true,
      message: 'Konto und alle zugehörigen Daten wurden gelöscht.'
    });
  } catch (error) {
    console.error('Account Deletion Error:', error);
    return res.status(500).json({ error: 'Konto konnte nicht gelöscht werden' });
  }
});

// ✅ Content Routes
app.use('/api/content', contentRouter);

// ✅ Processing Routes
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
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n╔════════════════════════════════════════╗\n║        🚀 LernApp Server Started       ║\n╠════════════════════════════════════════╣\n║ Port: ${PORT}\n║ Environment: ${process.env.NODE_ENV || 'development'}\n║ Status: Running ✅\n║ Auth: Ready (echte DB)\n║ Processing: Ready\n╚════════════════════════════════════════╝\n    `);
  });

  query('SELECT 1')
    .then(() => console.log('✅ Datenbankverbindung erfolgreich (Supabase/Postgres).'))
    .catch((err) => console.error('❌ Datenbankverbindung fehlgeschlagen - DATABASE_URL in backend/.env prüfen:', err.message));
}

module.exports = app;
