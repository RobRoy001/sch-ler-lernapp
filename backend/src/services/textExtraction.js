// Text-Extraktion aus einer hochgeladenen Datei (siehe claude/KI-Test-
// generierung-Konzept-2026-09-03.md Abschnitt 5, Schritt 2). Ersetzt das
// tote/kaputte alte services/ocrService.js. Läuft lokal im Backend-Prozess,
// kein externer Dienst nötig - erst der HIER extrahierte Text geht (nach
// dem Sanitizer, siehe utils/contentSanitizer.js) an OpenAI weiter, nie das
// Bild/PDF selbst (Kernentscheidung aus Abschnitt 2 des Konzepts, gilt
// unverändert auch für den OCR-Fallback unten - es wird lokal per Tesseract
// zu Text gemacht, nie ein Bild an ein Vision-Modell geschickt).
//
// PDFs werden zuerst über ihren vorhandenen Text-Layer gelesen (pdfjs-dist,
// kein OCR nötig, deckt digital erstellte/exportierte PDFs ab). Eingescannte
// PDFs OHNE Text-Layer (= im Grunde ein Bild in einer PDF-Hülle) waren in
// Phase 1 bewusst NICHT unterstützt (siehe Konzept-Dokument, "PDF-
// Rendering"-Hinweis: fehlende Canvas-Bibliothek). ✅ Fix (2026-09-07,
// LernApp-Vollaudit Plan-Punkt 13): jetzt per Rasterung+OCR-Fallback
// abgedeckt - siehe extractFromPdf()/ocrPdfPages() unten. `@napi-rs/canvas`
// statt des klassischen `canvas`-Pakets, weil `@napi-rs/canvas` vorkompilierte
// Binaries mitbringt (keine native Build-Toolchain/cairo/pango auf Railway
// nötig) - genau der im Konzept-Dokument vorab notierte Grund für diese Wahl.

const { createWorker } = require('tesseract.js');
// ⚠️ HOTFIX (2026-09-03, Produktions-Crash): pdfjs-dist v4 ist reines ESM
// (package.json "main": "build/pdf.mjs", kein CJS-Build mehr unter
// legacy/build/ - dort liegen nur noch .mjs-Dateien). Ein Top-Level
// require('pdfjs-dist/legacy/build/pdf.js') wirft deshalb sofort beim
// Server-Start "Cannot find module", noch bevor Express überhaupt startet
// (server.js -> routes/processing.js -> dieses File ist ein synchroner
// require-Chain). Fix: pdfjs-dist NICHT mehr top-level requiren, sondern
// per dynamischem import() erst dann laden, wenn tatsächlich ein PDF
// verarbeitet wird (CommonJS darf ESM-Pakete per import() nachladen) -
// siehe extractFromPdf() unten. tesseract.js bleibt unverändert, das ist
// ein normales CJS-Paket ({"main": "src/index.js"}, kein type/exports-Feld).

// Unterhalb dieser Zeichenzahl gilt die Extraktion als gescheitert (siehe
// Konzept-Dokument Abschnitt 5, Schritt 4 - Mindest-Qualitätscheck VOR dem
// teuren LLM-Aufruf).
const MIN_TEXT_LENGTH = 50;

// Rastern+OCR ist pro Seite deutlich teurer (Sekunden statt Millisekunden)
// als reines Text-Layer-Lesen - deshalb ein kleineres Limit als die
// generellen 10 Seiten oben für den OCR-Fallback-Pfad.
const OCR_MAX_PAGES = 5;
// Vergrößerungsfaktor beim Rastern: höher = bessere OCR-Trefferquote (mehr
// Pixel pro Buchstabe), aber langsamer und mehr Arbeitsspeicher pro Seite.
// 2.0 ist ein für Schul-Arbeitsblätter (meist klar gedruckter/getippter
// Text, kein Fließtext-Roman) guter Mittelweg.
const OCR_RENDER_SCALE = 2.0;

// pdfjs-dist braucht unter Node (kein DOM/<canvas>) eine eigene "Canvas-
// Factory", die es beim Rendern intern nutzt, um Seiten (und ggf. Bild-
// Masken innerhalb einer Seite) auf ein Pixel-Raster zu zeichnen - das ist
// das offizielle Muster aus den pdfjs-dist Node-Beispielen, hier nur mit
// `@napi-rs/canvas` statt des schwerer zu deployenden `canvas`-Pakets.
class NodeCanvasFactory {
  create(width, height) {
    // Lazy statt Top-Level-Require (gleiches Muster wie beim pdfjs-dist-
    // Hotfix unten) - ein fehlendes/noch nicht installiertes Paket soll
    // erst beim tatsächlichen OCR-Fallback auffallen, nicht schon beim
    // Server-Start alle anderen Uploads (PDF mit Text-Layer, JPG/PNG, TXT)
    // mit runterreißen.
    // eslint-disable-next-line global-require
    const { createCanvas } = require('@napi-rs/canvas');
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return { canvas, context };
  }

  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

// Rastert bis zu `maxPages` Seiten eines bereits geladenen PDF-Dokuments zu
// PNG-Bildern und liest sie per Tesseract - derselbe OCR-Weg wie für
// JPG/PNG-Uploads (extractFromImage oben), nur dass die "Fotos" hier erst
// aus dem PDF erzeugt werden. EIN gemeinsamer Tesseract-Worker für alle
// Seiten (statt pro Seite neu zu starten) - das Initialisieren des Workers
// ist selbst bei wenigen Seiten spürbar der teuerste Einzelschritt.
async function ocrPdfPages(pdf, maxPages) {
  const worker = await createWorker('deu+eng');
  try {
    const pageTexts = [];
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });
      const canvasFactory = new NodeCanvasFactory();
      const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

      await page.render({ canvasContext: canvasAndContext.context, viewport }).promise;
      const pngBuffer = canvasAndContext.canvas.toBuffer('image/png');
      canvasFactory.destroy(canvasAndContext);

      const { data } = await worker.recognize(pngBuffer);
      pageTexts.push(data.text || '');
    }
    return pageTexts.join('\n').trim();
  } finally {
    // Worker IMMER beenden, auch bei einem Fehler auf halbem Weg - gleiche
    // Begründung wie in extractFromImage() oben (Memory-/Handle-Leak sonst).
    await worker.terminate();
  }
}

async function extractFromImage(buffer) {
  // tesseract.js v5: createWorker(langs) lädt UND initialisiert die
  // angegebenen Sprachen in einem Schritt (anders als in v4, wo
  // loadLanguage()/initialize() noch separate Aufrufe waren). "deu+eng",
  // weil Schulmaterial teils zweisprachig ist (z.B. Englisch-Vokabeltests)
  // und deutsche Umlaute/ß ansonsten schlechter erkannt würden.
  const worker = await createWorker('deu+eng');
  try {
    const { data } = await worker.recognize(buffer);
    return { text: data.text || '', confidence: data.confidence || 0 };
  } finally {
    // Worker IMMER beenden, auch bei einem Fehler in recognize() - sonst
    // sammeln sich bei wiederholten fehlgeschlagenen Uploads Worker-
    // Prozesse an (Memory-/Handle-Leak).
    await worker.terminate();
  }
}

async function extractFromPdf(buffer) {
  // Lazy-Load statt Top-Level-Require, siehe Kommentar am Datei-Anfang.
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  // Begrenzung auf die ersten 10 Seiten (siehe Konzept-Dokument Abschnitt 5,
  // PDF-Rendering-Hinweis) - reicht für Klassenarbeiten/Schulbuch-
  // Ausschnitte, begrenzt Verarbeitungszeit bei versehentlich hochgeladenen
  // sehr langen Dokumenten.
  const maxPages = Math.min(pdf.numPages, 10);
  const pageTexts = [];

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    pageTexts.push(pageText);
  }

  const text = pageTexts.join('\n').trim();

  if (text.length < MIN_TEXT_LENGTH) {
    // Sehr wahrscheinlich ein gescanntes PDF ohne Text-Layer (siehe
    // Datei-Kommentar oben) statt eines "leeren" Dokuments.
    // ✅ OCR-Fallback (2026-09-07): statt hier sofort aufzugeben, die ersten
    // Seiten rastern und per Tesseract lesen (ocrPdfPages() oben) - deckt
    // genau den Fall ab, den die alte Fehlermeldung nur beschrieben hat.
    let ocrText = '';
    try {
      const ocrPageCount = Math.min(pdf.numPages, OCR_MAX_PAGES);
      ocrText = await ocrPdfPages(pdf, ocrPageCount);
    } catch (ocrErr) {
      // Kein Hard-Crash der ganzen Verarbeitung, falls z.B. `@napi-rs/canvas`
      // (noch) nicht installiert ist oder das Rendern einer bestimmten Seite
      // scheitert - stattdessen unten in die reguläre "kein Text gefunden"-
      // Fehlermeldung fallen, die der Aufrufer ohnehin schon abfängt (Mock-
      // Test-Fallback, siehe processing.js/teacher.js).
      console.error('OCR-Fallback für gescanntes PDF fehlgeschlagen:', ocrErr);
    }

    if (ocrText.length >= MIN_TEXT_LENGTH) {
      // Niedrigere Konfidenz als reines Text-Layer-Lesen (90) UND als
      // direkte Foto-OCR (siehe extractFromImage) - eine gescannte PDF-Seite
      // ist in der Praxis oft in schlechterer Auflösung/Kontrast als ein
      // gezieltes Handy-Foto.
      return { text: ocrText, confidence: 70 };
    }

    throw new Error(
      'In dieser PDF wurde kein lesbarer Text gefunden, auch nicht per Texterkennung (OCR) auf den ' +
      'gerasterten Seiten. Bitte stattdessen ein schärferes Foto (JPG/PNG) der Seite hochladen.'
    );
  }

  return { text, confidence: 90 };
}

function extractFromTxt(buffer) {
  return { text: buffer.toString('utf-8').trim(), confidence: 100 };
}

// Einheitlicher Einstiegspunkt für alle drei unterstützten Dateitypen
// (siehe UploadPage.jsx: 'application/pdf' | 'image/jpeg' | 'image/png' |
// 'text/plain'). Wirft bei zu wenig erkanntem Text ODER einem nicht
// unterstützten Dateityp - der Aufrufer (processing.js) fängt das ab und
// nutzt den Mock-Fallback (siehe Robert-Entscheidung: kein Hard-Block).
async function extractText(buffer, mimetype) {
  let result;

  if (mimetype === 'application/pdf') {
    result = await extractFromPdf(buffer);
  } else if (mimetype === 'image/jpeg' || mimetype === 'image/png') {
    result = await extractFromImage(buffer);
  } else if (mimetype === 'text/plain') {
    result = extractFromTxt(buffer);
  } else {
    throw new Error(`Nicht unterstützter Dateityp für Text-Extraktion: ${mimetype}`);
  }

  if (!result.text || result.text.trim().length < MIN_TEXT_LENGTH) {
    throw new Error(
      'Zu wenig Text erkannt. Bitte ein schärferes Foto oder eine Datei mit mehr Text hochladen.'
    );
  }

  return result;
}

module.exports = { extractText, MIN_TEXT_LENGTH };
