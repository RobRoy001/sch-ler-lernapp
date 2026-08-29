const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../database/connection');
const router = express.Router();

// User Registration
router.post('/register', async (req, res) => {
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
                                                                                                                            if (err.code === '23505') {
                                                                                                                                  return res.status(409).json({ 
                                                                                                                                          error: 'Email existiert bereits' 
                                                                                                                                                });
                                                                                                                                                    }
                                                                                                                                                        res.status(500).json({ error: err.message });
                                                                                                                                                          }
                                                                                                                                                          });
                                                                                                                                                          // User Login
                                                                                                                                                          router.post('/login', async (req, res) => {
                                                                                                                                                            try {
                                                                                                                                                                const { email, password } = req.body;

                                                                                                                                                                    // Validation
                                                                                                                                                                        if (!email || !password) {
                                                                                                                                                                              return res.status(400).json({ 
                                                                                                                                                                                      error: 'Email und password sind erforderlich' 
                                                                                                                                                                                            });
                                                                                                                                                                                                }

                                                                                                                                                                                                    // Get user by email
                                                                                                                                                                                                        const result = await pool.query(
                                                                                                                                                                                                              'SELECT * FROM users WHERE email = $1',
                                                                                                                                                                                                                    [email]
                                                                                                                                                                                                                        );

                                                                                                                                                                                                                            if (result.rows.length === 0) {
                                                                                                                                                                                                                                  return res.status(401).json({ 
                                                                                                                                                                                                                                          error: 'Email oder Passwort falsch' 
                                                                                                                                                                                                                                                });
                                                                                                                                                                                                                                                    }

                                                                                                                                                                                                                                                        const user = result.rows[0];

                                                                                                                                                                                                                                                            // Check password
                                                                                                                                                                                                                                                                const passwordMatch = await bcrypt.compare(password, user.password_hash);
                                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                        if (!passwordMatch) {
                                                                                                                                                                                                                                                                              return res.status(401).json({ 
                                                                                                                                                                                                                                                                                      error: 'Email oder Passwort falsch' 
                                                                                                                                                                                                                                                                                            });
                                                                                                                                                                                                                                                                                                }

                                                                                                                                                                                                                                                                                                    // Generate JWT Token
                                                                                                                                                                                                                                                                                                        const jwt = require('jsonwebtoken');
                                                                                                                                                                                                                                                                                                            const token = jwt.sign(
                                                                                                                                                                                                                                                                                                                  { id: user.id, email: user.email },
                                                                                                                                                                                                                                                                                                                        'your-secret-key-change-this',
                                                                                                                                                                                                                                                                                                                              { expiresIn: '7d' }
                                                                                                                                                                                                                                                                                                                                  );

                                                                                                                                                                                                                                                                                                                                      res.status(200).json({
                                                                                                                                                                                                                                                                                                                                            message: 'Login erfolgreich!',
                                                                                                                                                                                                                                                                                                                                                  token: token,
                                                                                                                                                                                                                                                                                                                                                        user: {
                                                                                                                                                                                                                                                                                                                                                                id: user.id,
                                                                                                                                                                                                                                                                                                                                                                        email: user.email,
                                                                                                                                                                                                                                                                                                                                                                                name: user.name
                                                                                                                                                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                                                                                                                                                          });

                                                                                                                                                                                                                                                                                                                                                                                            } catch (err) {
                                                                                                                                                                                                                                                                                                                                                                                                res.status(500).json({ error: err.message });
                                                                                                                                                                                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                                                                                                                                                                                  });

module.exports = router;