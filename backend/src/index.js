const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
const pool = require('./database/connection');
const authRouter = require('./api/auth');
app.use('/api/auth', authRouter);
// Middleware
const verifyToken = require('./middleware/auth');

// Protected Route - Get User Profile
app.get('/api/user/profile', verifyToken, async (req, res) => {
  try {
      const result = await pool.query(
            'SELECT id, email, name, grade_level FROM users WHERE id = $1',
                  [req.user.id]
                      );
                          
                              if (result.rows.length === 0) {
                                    return res.status(404).json({ error: 'User nicht gefunden' });
                                        }
                                            
                                                res.json({
                                                      message: 'Profil geladen!',
                                                            user: result.rows[0]
                                                                });
                                                                  } catch (err) {
                                                                      res.status(500).json({ error: err.message });
                                                                        }
                                                                        });

// Test Database Connection
app.get('/api/db-test', async (req, res) => {
  try {
      const result = await pool.query('SELECT NOW()');
          res.json({
                status: 'Database connected!',
                      time: result.rows[0]
                          });
                            } catch (err) {
                                res.status(500).json({ error: err.message });
                                  }
                                  });
                                  const bcrypt = require('bcryptjs');

                                  // User Registration
                                  app.post('/api/auth/register', async (req, res) => {
                                    try {
                                        const { email, password, name, classLevel } = req.body;

                                            // Validation
                                                if (!email || !password || !name) {
                                                      return res.status(400).json({ 
                                                              error: 'Email, password und name sind erforderlich' 
                                                                    });
                                                                        }

                                                                            if (classLevel < 5 || classLevel > 13) {
                                                                                  return res.status(400).json({ 
                                                                                          error: 'Klassenstufe muss zwischen 5 und 13 sein' 
                                                                                                });
                                                                                                    }

                                                                                                        // Hash password
                                                                                                            const passwordHash = await bcrypt.hash(password, 10);

                                                                                                                // Insert into database
                                                                                                                    const result = await pool.query(
                                                                                                                          'INSERT INTO users (email, password_hash, name, grade_level) VALUES ($1, $2, $3, $4) RETURNING id, email, name',
                                                                                                                                [email, passwordHash, name, classLevel]
                                                                                                                                    );

                                                                                                                                        res.status(201).json({
                                                                                                                                              message: 'User erfolgreich registriert!',
                                                                                                                                                    user: result.rows[0]
                                                                                                                                                        });

                                                                                                                                                          } catch (err) {
                                                                                                                                                              // Duplicate email error
                                                                                                                                                                  if (err.code === '23505') {
                                                                                                                                                                        return res.status(409).json({ 
                                                                                                                                                                                error: 'Email existiert bereits' 
                                                                                                                                                                                      });
                                                                                                                                                                                          }
                                                                                                                                                                                              res.status(500).json({ error: err.message });
                                                                                                                                                                                                }
                                                                                                                                                                                            });
app.get('/api/health', (req, res) => {
  res.json({ 
      status: 'Server läuft!', 
          timestamp: new Date(),
              message: 'Schüler-LernApp Backend ist online!'
                });
                });

                // Server starten
                const PORT = process.env.PORT || 3000;
                app.listen(PORT, () => {
                  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
                    console.log(`📚 LernApp Backend ist bereit!`);
                    });