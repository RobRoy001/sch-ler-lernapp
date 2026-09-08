const { sanitizeForOpenAI, wasSanitized } = require('../../src/utils/contentSanitizer');

// Diese Regeln entscheiden, was tatsächlich an OpenAI geschickt wird (siehe
// claude/OpenAI-Datenschutz-Risiken.md). Die ursprüngliche Version wurde
// bereits einmal im echten Live-Betrieb als zu aggressiv erkannt (siehe
// Kommentar am Dateianfang von contentSanitizer.js: "Französische
// Revolution", "Zweiten Weltkrieg" wurden fälschlich zensiert) - genau
// dieser Regressionsfall bekommt hier einen eigenen Test, damit er nicht
// unbemerkt zurückkommt.

describe('sanitizeForOpenAI', () => {
  it('lässt normalen deutschen Lernstoff mit großgeschriebenen Nomen unangetastet (Regressionstest)', () => {
    const text = 'Die Französische Revolution und der Zweite Weltkrieg waren wichtige Themen der Geschichte.';
    expect(sanitizeForOpenAI(text)).toBe(text);
    expect(wasSanitized(text, sanitizeForOpenAI(text))).toBe(false);
  });

  it('ersetzt einen Namen im Kopf-/Namensfeld ("Name: ...")', () => {
    const out = sanitizeForOpenAI('Name: Max Mustermann\nKlasse: 7b');
    expect(out).toContain('Name: [NAME]');
    // "Klasse: 7b" hat keinen groß geschriebenen Namen als Wert -> unangetastet
    expect(out).toContain('Klasse: 7b');
  });

  it('ersetzt eine Selbstnennung ("Ich heiße ...")', () => {
    const out = sanitizeForOpenAI('Ich heiße Anna Schmidt und mag Mathe.');
    expect(out).toBe('Ich heiße [NAME] und mag Mathe.');
  });

  it('ersetzt einen Namen am Zeilenende nach Bindestrich ("Klasse: 7b - Name")', () => {
    const out = sanitizeForOpenAI('Klasse: 7b - Max Mustermann');
    expect(out).toBe('Klasse: 7b - [NAME]');
  });

  it('ersetzt E-Mail-Adressen', () => {
    expect(sanitizeForOpenAI('Kontakt: schueler@beispiel.de')).toBe('Kontakt: [EMAIL]');
  });

  it('ersetzt Adressen (Straße+Hausnummer, PLZ+Ort)', () => {
    const out = sanitizeForOpenAI('Musterstraße 12, 12345 Berlin');
    expect(out).toBe('[ADRESSE], [ADRESSE]');
  });

  it('ersetzt Telefonnummern', () => {
    expect(sanitizeForOpenAI('Erreichbar unter 0151 23456789.')).toBe('Erreichbar unter [TELEFON].');
  });

  it('ersetzt Noten- und Punkteangaben', () => {
    expect(sanitizeForOpenAI('Note: 2+, Punkte: 8/10')).toBe('[NOTE], [NOTE]');
  });

  it('ersetzt Matrikel-/Schülernummern', () => {
    expect(sanitizeForOpenAI('Matrikel-Nr. 123456')).toBe('[ID]');
  });

  it('lässt eine reine Jahreszahl unangetastet (keine falsche PLZ-Erkennung)', () => {
    const text = 'Der Vertrag von Versailles wurde 1919 unterschrieben.';
    expect(sanitizeForOpenAI(text)).toBe(text);
  });

  it('bewusster Rest-Trade-off: ein frei im Fließtext genannter Name ohne Signalwort wird NICHT erkannt', () => {
    const text = 'Mein Bruder Peter kam gestern zu Besuch.';
    expect(sanitizeForOpenAI(text)).toBe(text);
  });

  it('gibt bei Nicht-String-Eingabe einen leeren String zurück, statt zu crashen', () => {
    expect(sanitizeForOpenAI(null)).toBe('');
    expect(sanitizeForOpenAI(undefined)).toBe('');
    expect(sanitizeForOpenAI(42)).toBe('');
  });
});

describe('wasSanitized', () => {
  it('ist true, wenn sich der Text durch das Sanitizing geändert hat', () => {
    expect(wasSanitized('Name: Max Mustermann', 'Name: [NAME]')).toBe(true);
  });

  it('ist false, wenn der Text unverändert ist', () => {
    expect(wasSanitized('unveränderter Text', 'unveränderter Text')).toBe(false);
  });
});
