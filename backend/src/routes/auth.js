// src/routes/auth.js - Auth APIs für PostgreSQL Backend
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database/connection');
const crypto = require('crypto');

// Helper: JWT Token generieren
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// ============= REGISTRATION =============
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, grade_level } = req.body;

    // Validierung
    if (!email || !password || !name || !grade_level) {
      return res.status(400).json({ error: 'Alle Felder erforderlich' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });
    }

    // Email-Format überprüfen
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Ungültiges E-Mail-Format' });
    }

    // Email schon vorhanden?
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'E-Mail-Adresse existiert bereits' });
    }

    // Password hashen
    const hashedPassword = await bcrypt.hash(password, 10);

    // User in DB einfügen
    const result = await pool.query(
  'INSERT INTO users (email, password, name, grade_level) VALUES ($1, $2, $3, $4) RETURNING id, email, name, grade_level',
  [email, hashedPassword, name, grade_level]
);

    const user = result.rows[0];

    // JWT Token generieren
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Registrierung erfolgreich!',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        grade_level: user.grade_level,
      },
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Server-Fehler bei der Registrierung' });
  }
});

// ============= LOGIN =============
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validierung
    if (!email || !password) {
      return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
    }

    // User suchen
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'E-Mail oder Passwort ungültig' });
    }

    const user = result.rows[0];

    // Password überprüfen
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'E-Mail oder Passwort ungültig' });
    }

    // JWT Token generieren
    const token = generateToken(user.id);

    res.json({
      message: 'Login erfolgreich!',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        grade_level: user.grade_level,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Login' });
  }
});

// ============= GET PROFILE (Protected Route) =============
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT id, email, name, grade_level, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User nicht gefunden' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ error: 'Server-Fehler beim Abrufen des Profils' });
  }
});

// ============= JWT VERIFICATION MIDDLEWARE =============
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(403).json({ error: 'Token erforderlich' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token ungültig oder abgelaufen' });
    }
    req.user = decoded;
    next();
  });
}

module.exports = router;