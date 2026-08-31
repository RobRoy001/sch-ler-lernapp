const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const DataExportService = require('../services/DataExportService');
const db = require('../database');

router.get('/export-data', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userData = await DataExportService.gatherUserData(userId);
    const zipBuffer = await DataExportService.createExportZip(userData);
    const fileName = `lernapp-export-${Date.now()}.zip`;
    await db.query(`INSERT INTO data_export_log (user_id, export_date, file_name, data_format, file_size) VALUES ($1, NOW(), $2, $3, $4)`, [userId, fileName, 'json+csv', zipBuffer.length]);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="lernapp-export.zip"');
    res.send(zipBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Datenexport fehlgeschlagen', message: error.message });
  }
});

module.exports = router;
