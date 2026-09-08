const { VALID_TEST_FORMATS, VALID_TEST_SCOPES } = require('../../src/utils/testFormats');

// Klein, aber genau die Stelle, an der routes/content.js UND routes/
// teacher.js beide hängen (siehe Kommentar in testFormats.js - vorher zwei
// unabhängige Kopien, die hätten auseinanderlaufen können). Ein Test hier
// stellt sicher, dass eine künftige Änderung an einer Stelle nicht
// versehentlich nur halb gemacht wird.

describe('testFormats Konstanten', () => {
  it('enthält genau die vier unterstützten Testformate', () => {
    expect(VALID_TEST_FORMATS).toEqual(
      expect.arrayContaining(['multiple_choice', 'fill_gap', 'mixed', 'vocabulary'])
    );
    expect(VALID_TEST_FORMATS).toHaveLength(4);
  });

  it('enthält genau die zwei unterstützten Testumfänge', () => {
    expect(VALID_TEST_SCOPES).toEqual(
      expect.arrayContaining(['standard', 'arbeitsvorbereitung'])
    );
    expect(VALID_TEST_SCOPES).toHaveLength(2);
  });

  it('lehnt einen erfundenen Testtyp ab (Muster für die Validierung in content.js/teacher.js)', () => {
    expect(VALID_TEST_FORMATS.includes('essay')).toBe(false);
  });
});
