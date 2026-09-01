const db = require('../database');
const archiver = require('archiver');
const { Readable } = require('stream');

class DataExportService {
  static async gatherUserData(userId) {
    const data = {};
    try {
      const userRes = await db.query(
        `SELECT id, email, created_at FROM users WHERE id = $1`,
        [userId]
      );
      if (userRes.rows.length === 0) {
        throw new Error('User not found');
      }
      data.user = userRes.rows[0];
      console.log(`[Export] User data gathered: ${data.user.email}`);

      const ageRes = await db.query(
        `SELECT user_id, age_verified, consent_date, created_at 
         FROM age_verification WHERE user_id = $1`,
        [userId]
      );
      data.age_verification = ageRes.rows;

      const delRes = await db.query(
        `SELECT id, request_date, deletion_date, status, reason
         FROM deletion_requests WHERE user_id = $1`,
        [userId]
      );
      data.deletion_requests = delRes.rows;

      const consentRes = await db.query(
        `SELECT consent_type, given, version, timestamp
         FROM consent_log WHERE user_id = $1`,
        [userId]
      );
      data.consent_log = consentRes.rows;

      const anonRes = await db.query(
        `SELECT service, mapping_type, is_active, created_at
         FROM anonymization_mappings WHERE user_id = $1`,
        [userId]
      );
      data.anonymization_mappings = anonRes.rows;

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
      archive.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`[Export] ZIP created: ${buffer.length} bytes`);
        resolve(buffer);
      });
      archive.on('error', (err) => {
        console.error('[Archive Error]', err);
        reject(err);
      });

      archive.append(
        JSON.stringify(userData, null, 2),
        { name: 'lernapp-export.json' }
      );

      const csv = this.convertToCSV(userData);
      archive.append(csv, { name: 'lernapp-export.csv' });

      archive.append(
        JSON.stringify({
          exportDate: new Date().toISOString(),
          version: '1.0',
          gdprArticle: '20',
          format: 'DSGVO Artikel 20 - Datenportabilität'
        }, null, 2),
        { name: 'metadata.json' }
      );

      archive.append(
        `LernApp Datenexport
===================

Dieser Export enthält Ihre Daten gemäß DSGVO Artikel 20.

Inhalte:
- lernapp-export.json: Komplette Daten im JSON-Format
- lernapp-export.csv: Daten in Tabellenformat
- metadata.json: Export-Informationen

Datenschutz:
Diese Daten sind für Sie bestimmt.
Bitte behandeln Sie diese sensiblen Informationen sicher.
`,
        { name: 'README.txt' }
      );

      archive.finalize();
    });
  }

  static convertToCSV(data) {
    let csv = 'Kategorie,Wert,Datum\n';
    csv += `Email,${this.escapeCSV(data.user.email)},${data.user.created_at}\n`;
    csv += `Account erstellt,Ja,${data.user.created_at}\n`;
    csv += `\n`;

    if (data.age_verification.length > 0) {
      csv += `--- Altersverifikation ---\n`;
      data.age_verification.forEach(av => {
        csv += `Altersverifikation,${av.age_verified ? 'Bestätigt' : 'Ausstehend'},${av.consent_date || av.created_at}\n`;
      });
      csv += `\n`;
    }

    if (data.consent_log.length > 0) {
      csv += `--- Zustimmungen ---\n`;
      data.consent_log.forEach(cl => {
        const status = cl.given ? 'Gegeben' : 'Zurückgezogen';
        csv += `Zustimmung (${cl.consent_type}),${status},${cl.timestamp}\n`;
      });
      csv += `\n`;
    }

    if (data.deletion_requests.length > 0) {
      csv += `--- Löschanfragen ---\n`;
      data.deletion_requests.forEach(dr => {
        csv += `Löschanfrage,${dr.status},${dr.request_date}\n`;
      });
      csv += `\n`;
    }

    return csv;
  }

  static escapeCSV(value) {
    if (!value) return '';
    return `"${String(value).replace(/"/g, '""')}"`;
  }
}

module.exports = DataExportService;
