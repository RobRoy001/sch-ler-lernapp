// src/services/ocrService.js - Tesseract.js für OCR

const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

class OCRService {
  static async extractTextFromImage(filePath) {
    try {
      console.log(`[OCR] Extracting text from: ${filePath}`);

      const result = await Tesseract.recognize(filePath, ['deu', 'eng'], {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      const text = result.data.text;
      console.log(`[OCR] Extracted ${text.length} characters`);

      return {
        raw_text: text,
        confidence: result.data.confidence,
        text_length: text.length,
        language: 'deu'
      };
    } catch (error) {
      console.error('[OCR] Error:', error.message);
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  static async extractTextFromPDF(filePath) {
    try {
      console.log(`[OCR] PDF detected: ${filePath}`);
      
      // Für PDF: Convertiere zu Bilder mit pdfparse, dann OCR
      // ODER: Nutze pdf-parse library
      // Simplified: Nutze Tesseract direkt auf PDF
      
      const result = await Tesseract.recognize(filePath, ['deu', 'eng']);
      
      return {
        raw_text: result.data.text,
        confidence: result.data.confidence,
        text_length: result.data.text.length,
        language: 'deu'
      };
    } catch (error) {
      console.error('[OCR] PDF Error:', error.message);
      throw new Error(`PDF OCR extraction failed: ${error.message}`);
    }
  }

  static async extract(filePath) {
    // Bestimme Dateityp
    const ext = path.extname(filePath).toLowerCase();

    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(ext)) {
      return this.extractTextFromImage(filePath);
    } else if (ext === '.pdf') {
      return this.extractTextFromPDF(filePath);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  }
}

module.exports = OCRService;