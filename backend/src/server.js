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
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const { query } = require('./database/connection');
const {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByConsentToken,
  updateUser
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

// ✅ Health Check - bewusst VOR dem Rate Limiter definiert, damit Monitoring/
// Uptime-Checks nie mit ausgebremst werden.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
  });
});

// ✅ Rate Limiting (Sicherheitsaudit Hoch #7) - allgemeiner Basisschutz für
// alle übrigen /api-Routen gegen groben DoS/Missbrauch.
app.use('/api', apiLimiter);

// ✅ Login Endpoint - echte Passwortprüfung (Sicherheitsaudit Kritisch #2)
//
// Vorher: es wurde nur geprüft, ob email/password überhaupt gesetzt waren,
// dann ein unsigniertes Base64-Token für JEDE beliebige Email ausgestellt -
// egal ob dieser Account existierte. Jeder konnte sich als jeder ausgeben.
//
// authLimiter zusätzlich zum globalen apiLimiter: Login ist der wichtigste
// Brute-Force-Angriffspunkt der ganzen App, deshalb hier zusätzlich das
// strengere Limit (5 Versuche / 15 Minuten statt 200).
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

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email oder Passwort falsch' });
    }

    // ✅ Sicherheitsaudit Kritisch #5 (Art. 8 DSGVO): ein Konto unter 16
    // bleibt gesperrt, bis ein Elternteil über den Bestätigungslink
    // zugestimmt hat. Ohne diesen Check könnte man sich zwar registrieren,
    // aber trotzdem sofort einloggen und die App nutzen - genau das, was
    // die Elternzustimmung eigentlich verhindern soll.
    if (user.accountStatus === 'pending_parent_consent') {
      return res.status(403).json({
        error: 'Dieses Konto wartet noch auf die Zustimmung eines Erziehungsberechtigten.',
        pendingParentConsent: true
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login erfolgreich',
      token,
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Login fehlgeschlagen' });
  }
});

// ✅ Register Endpoint - Passwort wird jetzt tatsächlich gehasht und der
// Nutzer gespeichert (jetzt in einer echten Datenbank - Sicherheitsaudit
// Befund 10 -, nicht mehr nur In-Memory).
//
// ✅ Sicherheitsaudit Kritisch #5 (Art. 8 DSGVO): Geburtsdatum ist jetzt
// Pflicht. Bei unter 16-Jährigen wird KEIN nutzbares Konto angelegt, bevor
// nicht ein Elternteil über einen Bestätigungslink zugestimmt hat - vorher
// gab es überhaupt keine Altersprüfung und Kinder konnten sich direkt und
// sofort nutzbar registrieren.
//
// authLimiter auch hier: verhindert automatisiertes Massen-Anlegen von
// Konten (Spam-Registrierungen).
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
        passwordHash,
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
      await sendParentConsentEmail(parent_email, consentUrl, name);

      // Bewusst 202 (Accepted) statt 201: das Konto existiert, ist aber noch
      // nicht nutzbar. Kein token im Response - ein Login ist erst nach
      // erteilter Zustimmung möglich (siehe Login-Endpoint oben).
      return res.status(202).json({
        success: true,
        pendingParentConsent: true,
        message: 'Registrierung erfasst. Ein Erziehungsberechtigter muss der Nutzung noch zustimmen - wir haben dafür eine Email mit einem Bestätigungslink verschickt.'
      });
    }

    const user = await createUser({
      email,
      passwordHash,
      name,
      grade_level,
      dateOfBirth: date_of_birth,
      ageVerified: true,
      accountStatus: 'active'
    });
    const token = generateToken(user);

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

// ✅ Elternzustimmung - Vorschau (Sicherheitsaudit Kritisch #5)
//
// Wird von der Bestätigungsseite aufgerufen, BEVOR der Elternteil klickt,
// damit dort angezeigt werden kann, für wen genau zugestimmt wird - ohne
// dass dieser Aufruf selbst schon etwas verändert.
app.get('/api/auth/parent-consent', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Token erforderlich' });
  }

  const user = await findUserByConsentToken(token);
  if (!user || user.accountStatus !== 'pending_parent_consent') {
    return res.status(404).json({ error: 'Dieser Link ist ungültig oder wurde bereits verwendet' });
  }

  if (new Date(user.parentConsentExpires) < new Date()) {
    return res.status(410).json({ error: 'Dieser Link ist abgelaufen. Bitte erneut registrieren.' });
  }

  return res.json({
    childName: user.name,
    parentEmail: user.parentEmail
  });
});

// ✅ Elternzustimmung - Bestätigung (Sicherheitsaudit Kritisch #5)
//
// Schaltet das Konto frei: accountStatus wird 'active', ageVerified true,
// der Einmal-Token wird sofort entwertet (kein erneutes Einlösen möglich).
// Erst danach ist ein Login für dieses Konto überhaupt möglich.
app.post('/api/auth/parent-consent/confirm', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token erforderlich' });
    }

    const user = await findUserByConsentToken(token);
    if (!user || user.accountStatus !== 'pending_parent_consent') {
      return res.status(404).json({ error: 'Dieser Link ist ungültig oder wurde bereits verwendet' });
    }

    if (new Date(user.parentConsentExpires) < new Date()) {
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

// ✅ Profile Endpoint - wird von App.jsx beim Laden aufgerufen, um ein
// bestehendes Token zu prüfen. Existierte vorher gar nicht (404 bei jedem
// Seiten-Reload mit vorhandenem Token -> sofortiger Logout).
app.get('/api/auth/profile', authCheck, async (req, res) => {
  const user = await findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Nutzer nicht gefunden' });
  }
  return res.json(publicUser(user));
});

// ✅ Logout Endpoint - bei JWTs zustandslos (Client löscht das Token)
app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logout erfolgreich' });
});

// ✅ Refresh Token Endpoint - verifiziert das bestehende Token und stellt
// bei Gültigkeit ein neues aus, statt (wie vorher) einen bedeutungslosen
// Platzhalter-String zurückzugeben.
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

    return res.json({
      success: true,
      token: generateToken(user)
    });
  } catch (error) {
    return res.status(401).json({ error: 'Token ungültig oder abgelaufen' });
  }
});

// ✅ Content Routes (Upload, Sources, Bücherkatalog)
app.use('/api/content', contentRouter);

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
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════╗
║        🚀 LernApp Server Started       ║
╠════════════════════════════════════════╣
║ Port: ${PORT}
║ Environment: ${process.env.NODE_ENV || 'development'}
║ Status: Running ✅
║ Auth: Ready (echte DB)
║ Processing: Ready (FIX #2)
╚════════════════════════════════════════╝
    `);
  });

  // Kurzer Verbindungstest zur echten Datenbank (Supabase/Postgres) - rein
  // informativ, damit man sofort in der Konsole sieht, ob DATABASE_URL
  // funktioniert, statt erst beim ersten Login/Register einen Fehler zu
  // bekommen (Sicherheitsaudit Befund 10).
  query('SELECT 1')
    .then(() => console.log('✅ Datenbankverbindung erfolgreich (Supabase/Postgres).'))
    .catch((err) => console.error('❌ Datenbankverbindung fehlgeschlagen - DATABASE_URL in backend/.env prüfen:', err.message));
}

module.exports = app;