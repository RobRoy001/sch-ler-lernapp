const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
      // Get token from header
          const token = req.headers.authorization?.split(' ')[1];

              if (!token) {
                    return res.status(401).json({ 
                            error: 'Kein Token vorhanden' 
                                  });
                                      }

                                          // Verify token
                                              const decoded = jwt.verify(token, 'your-secret-key-change-this');
                                                  req.user = decoded;
                                                      next();

                                                        } catch (err) {
                                                            res.status(403).json({ 
                                                                  error: 'Token ungültig oder abgelaufen' 
                                                                      });
                                                                        }
                                                                        };

                                                                        module.exports = verifyToken;