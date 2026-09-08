const { calculateAge } = require('../../src/utils/age');

// Ersetzt die vorherige Attrappe (backend/tests/rate-limit.test.js hatte
// nichts mit Altersberechnung zu tun, aber generell galt für die ganze
// Suite: expect(true).toBe(true)). calculateAge() entscheidet direkt über
// die Elternzustimmungs-Pflicht (PARENT_CONSENT_AGE=16 in server.js) - ein
// Fehler hier hätte reale rechtliche Konsequenzen (Minderjährige ohne
// Elternzustimmung registriert, oder Erwachsene fälschlich blockiert).
//
// Bewusst KEINE hartkodierten absoluten Datumsangaben ("geboren am
// 2005-01-01") - der Test würde sonst mit der Zeit ein falsches Ergebnis
// liefern. Stattdessen relative Geburtsdaten ausgehend vom jeweiligen
// Testlauf-"heute", exakt wie calculateAge() selbst intern rechnet.
function isoDateYearsAndDaysAgo(years, days) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

describe('calculateAge', () => {
  it('gibt null für ein nicht parsbares Datum zurück', () => {
    expect(calculateAge('kein-datum')).toBeNull();
    expect(calculateAge('')).toBeNull();
    expect(calculateAge(undefined)).toBeNull();
  });

  it('rechnet ein glattes Alter in ganzen Jahren korrekt, wenn der Geburtstag heute ist', () => {
    expect(calculateAge(isoDateYearsAndDaysAgo(20, 0))).toBe(20);
  });

  it('zieht ein Jahr ab, wenn der Geburtstag dieses Jahr noch nicht war (morgen)', () => {
    expect(calculateAge(isoDateYearsAndDaysAgo(20, 1))).toBe(19);
  });

  it('zählt das volle Alter, wenn der Geburtstag dieses Jahr schon war (gestern)', () => {
    expect(calculateAge(isoDateYearsAndDaysAgo(20, -1))).toBe(20);
  });

  it('Grenzfall Elternzustimmung: genau 16 Jahre alt gilt NICHT mehr als zustimmungspflichtig', () => {
    // server.js: "if (age < PARENT_CONSENT_AGE)" - exakt 16 ist NICHT < 16.
    const age = calculateAge(isoDateYearsAndDaysAgo(16, 0));
    expect(age).toBe(16);
    expect(age < 16).toBe(false);
  });

  it('Grenzfall Elternzustimmung: einen Tag vor dem 16. Geburtstag ist noch 15 und zustimmungspflichtig', () => {
    const age = calculateAge(isoDateYearsAndDaysAgo(16, 1));
    expect(age).toBe(15);
    expect(age < 16).toBe(true);
  });
});
