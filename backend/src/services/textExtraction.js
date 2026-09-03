// Text-Extraktion aus einer hochgeladenen Datei (siehe claude/KI-Test-
// generierung-Konzept-2026-09-03.md Abschnitt 5, Schritt 2). Ersetzt das
// tote/kaputte alte services/ocrService.js. Läuft lokal im Backend-Prozess,
// kein externer Dienst nötig - erst der HIER extrahierte Text geht (nach
// dem Sanitizer, siehe utils/contentSanitizer.js) an OpenAI weiter, nie das
// Bild/PDF selbst (Kernentscheidung aus Abschnitt 2 des Konzepts).
//
// Wichtige, bewusste Einschränkung für Phase 1 (siehe Abschnitt 5, "PDF-
// Rendering"-Hinweis im Konzept-Dokument): PDFs werden über ihren
// vorhandenen Text-Layer gelesen (pdfjs-dist, kein OCR nötig) - das deckt
// digital erstellte/exportierte PDFs ab. Eingescannte PDFs OHNE Text-Layer
// (= im Grunde ein Bild in einer PDF-Hülle) werden NICHT per Rasterung+OCR
// verarbeitet, weil das eine zusätzliche Canvas-Bibliothek braucht, die
// laut Konzept-Dokument noch nicht final ausgewählt/getestet ist. Nutzer
// bekommen in diesem Fall eine klare Fehlermeldung statt eines stillen
// Fehlschlags - Workaround: als Foto (JPG/PNG) statt als PDF hochladen.

const { createWorker } = require('tesseract.js');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Unterhalb dieser Zeichenzahl gilt die Extraktion als gescheitert (siehe
// Konzept-Dokument Abschnitt 5, Schritt 4 - Mindest-Qualitätscheck VOR dem
// teuren LLM-Aufruf).
const MIN_TEXT_LENGTH = 50;

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
    // Datei-Kommentar oben) statt eines "leeren" Dokuments - deshalb eine
    // gezielte Fehlermeldung statt der generischen weiter unten.
    throw new Error(
      'In dieser PDF wurde kein lesbarer Text gefunden (vermutlich ein eingescanntes Dokument ohne Text-Layer). ' +
      'Bitte stattdessen ein Foto (JPG/PNG) der Seite hochladen.'
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
