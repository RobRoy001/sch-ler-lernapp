const db = require('../database');
const archiver = require('archiver');

class DataExportService {
  static async gatherUserData(userId) {
    const data = {};
    try {
      const userRes = await db.query(`SELECT id, email, created_at FROM users WHERE id = $1`, [userId]);
      if (userRes.rows.length === 0) throw new Error('User not found');
      data.user = userRes.rows[0];
      data.age_verification = (await db.query(`SELECT user_id, age_verified, consent_date, created_at FROM age_verification WHERE user_id = $1`, [userId])).rows;
      data.deletion_requests = (await db.query(`SELECT id, request_date, deletion_date, status, reason FROM deletion_requests WHERE user_id = $1`, [userId])).rows;
      data.consent_log = (await db.query(`SELECT consent_type, given, version, timestamp FROM consent_log WHERE user_id = $1`, [userId])).rows;
      data.anonymization_mappings = (await db.query(`SELECT service, mapping_type, is_active, created_at FROM anonymization_mappings WHERE user_id = $1`, [userId])).rows;
      return data;
    } catch (error) {
      console.error('[DataExport Error]', error);
      throw error;
    }
  }

  static async createExportZip(userData) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
      archive.append(JSON.stringify(userData, null, 2), { name: 'lernapp-export.json' });
      archive.append(this.convertToCSV(userData), { name: 'lernapp-export.csv' });
      archive.append(JSON.stringify({ exportDate: new Date().toISOString(), version: '1.0', gdprArticle: '20' }, null, 2), { name: 'metadata.json' });
      archive.finalize();
    });
  }

  static convertToCSV(data) {
    let csv = 'Kategorie,Wert,Datum\n';
    csv += `Email,${this.escapeCSV(data.user.email)},${data.user.created_at}\n`;
    data.age_verification.forEach(av => csv += `Altersverifikation,${av.age_verified ? 'Bestätigt' : 'Ausstehend'},${av.consent_date || av.created_at}\n`);
    data.consent_log.forEach(cl => csv += `Zustimmung (${cl.consent_type}),${cl.given ? 'Gegeben' : 'Zurückgezogen'},${cl.timestamp}\n`);
    return csv;
  }

  static escapeCSV(value) {
    return !value ? '' : `"${String(value).replace(/"/g, '""')}"`;
  }
}

module.exports = DataExportService;
