// exportUserData() ist die Grundlage für den DSGVO-Art.-20-Datenexport
// (GET /api/auth/export-data, siehe server.js) - genau die Funktion, die
// die alte Attrappe (backend/tests/data-export.test.js) mit
// "expect(hasDataExport).toBe(true)" NICHT wirklich getestet hat. Hier
// wird die Datenbank gemockt (kein echter DB-Zugriff nötig) und geprüft:
// (a) die richtigen Tabellen werden abgefragt, (b) password_hash landet
// NIE im Export, (c) ein unbekannter Nutzer liefert null statt zu crashen.

jest.mock('../../src/database/connection', () => ({
  query: jest.fn()
}));

const { query } = require('../../src/database/connection');
const { exportUserData } = require('../../src/store');

describe('exportUserData', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('liefert null, wenn der Nutzer nicht existiert, ohne die anderen Tabellen abzufragen', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // users-Query liefert nichts

    const result = await exportUserData(999);

    expect(result).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('fragt users/test_submissions/sources ab und liefert sie strukturiert zurück', async () => {
    const user = { id: 1, email: 'kind@example.com', name: 'Max', grade_level: '9', date_of_birth: '2012-01-01', created_at: '2026-01-01' };
    const submissions = [{ id: 5, test_id: 3, correct_count: 4, total_questions: 6, accuracy: 66.7 }];
    const sources = [{ id: 3, content_type: 'pdf', status: 'completed', created_at: '2026-01-02' }];

    query.mockImplementation((sql) => {
      if (sql.includes('FROM users')) return Promise.resolve({ rows: [user] });
      if (sql.includes('FROM test_submissions')) return Promise.resolve({ rows: submissions });
      if (sql.includes('FROM sources')) return Promise.resolve({ rows: sources });
      throw new Error(`Unerwartete Query im Test: ${sql}`);
    });

    const result = await exportUserData(1);

    expect(result).toEqual({ user, submissions, uploaded_content: sources });
  });

  it('fragt beim Nutzer NIE password_hash ab (Datenschutz: kein Passwort-Hash im DSGVO-Export)', async () => {
    query.mockImplementation((sql) => {
      if (sql.includes('FROM users')) return Promise.resolve({ rows: [{ id: 1 }] });
      return Promise.resolve({ rows: [] });
    });

    await exportUserData(1);

    const userQuerySql = query.mock.calls.find(([sql]) => sql.includes('FROM users'))[0];
    expect(userQuerySql.toLowerCase()).not.toContain('password_hash');
  });

  it('übergibt die userId als Parameter an jede Abfrage (kein fremder Export durch Vertippen)', async () => {
    query.mockImplementation((sql) => {
      if (sql.includes('FROM users')) return Promise.resolve({ rows: [{ id: 42 }] });
      return Promise.resolve({ rows: [] });
    });

    await exportUserData(42);

    for (const [, params] of query.mock.calls) {
      expect(params).toEqual([42]);
    }
  });
});
