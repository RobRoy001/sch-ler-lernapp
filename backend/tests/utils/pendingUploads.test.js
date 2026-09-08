// pendingUploads.js hält hochgeladene Datei-Buffer kurzzeitig zwischen zwei
// Requests (POST /upload -> POST /sources) im Prozessspeicher (siehe
// Kommentar dort für die Begründung: kein externer Objektspeicher in Phase
// 1). Zwei Dinge müssen stimmen, sonst geht entweder eine hochgeladene
// Datei "verloren" (take() liefert null, obwohl gerade erst hochgeladen)
// oder alte Buffer sammeln sich im Speicher an (TTL greift nicht):
//
// 1. take() liest EINMALIG (danach ist der Eintrag weg).
// 2. cleanup() entfernt nur Einträge, die die TTL (15 Minuten) überschritten
//    haben - nicht früher, nicht nie.
//
// jest.useFakeTimers({ advanceTimers: false }) allein reicht hier nicht,
// weil cleanup() selbst manuell aufgerufen wird (kein echter Timer-Tick nötig)
// - stattdessen wird Date.now() direkt für die Dauer des Tests umgebogen.

describe('pendingUploads Stores (uploads/sourceFiles/classSourceFiles)', () => {
  let uploads;
  let sourceFiles;
  let classSourceFiles;
  let realDateNow;

  beforeEach(() => {
    jest.resetModules();
    ({ uploads, sourceFiles, classSourceFiles } = require('../../src/utils/pendingUploads'));
    realDateNow = Date.now;
  });

  afterEach(() => {
    Date.now = realDateNow;
  });

  it('liefert drei unabhängige Stores', () => {
    uploads.set('id-1', { who: 'uploads' });
    expect(sourceFiles.take('id-1')).toBeNull();
    expect(classSourceFiles.take('id-1')).toBeNull();
    expect(uploads.take('id-1')).toEqual({ who: 'uploads' });
  });

  it('take() liefert den Wert und entfernt ihn danach (einmalig verwendbar)', () => {
    uploads.set('file-1', { buffer: Buffer.from('hallo'), filename: 'a.pdf' });
    expect(uploads.size()).toBe(1);

    const taken = uploads.take('file-1');
    expect(taken.filename).toBe('a.pdf');
    expect(uploads.size()).toBe(0);

    // Zweites take() auf denselben Key -> null, nicht der alte Wert
    expect(uploads.take('file-1')).toBeNull();
  });

  it('take() auf einen nie existierenden Key liefert null statt zu crashen', () => {
    expect(uploads.take('gibt-es-nicht')).toBeNull();
  });

  it('cleanup() entfernt einen Eintrag erst NACH Ablauf der 15-Minuten-TTL', () => {
    let fakeNow = realDateNow();
    Date.now = () => fakeNow;

    uploads.set('old', { v: 1 });

    fakeNow += 14 * 60 * 1000; // 14 Minuten - noch innerhalb der TTL
    uploads.cleanup();
    expect(uploads.size()).toBe(1);

    fakeNow += 2 * 60 * 1000; // insgesamt 16 Minuten - TTL überschritten
    uploads.cleanup();
    expect(uploads.size()).toBe(0);
  });

  it('cleanup() lässt frische Einträge unangetastet', () => {
    uploads.set('fresh', { v: 1 });
    uploads.cleanup();
    expect(uploads.size()).toBe(1);
  });
});
