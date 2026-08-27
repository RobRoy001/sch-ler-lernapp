const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test Route
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