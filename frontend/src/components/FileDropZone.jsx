import React, { useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

export default function FileDropZone({ onFileAdded }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Nur JPG, PNG und PDF erlaubt');
      return false;
    }

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError('Ungültige Dateiendung');
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Datei zu groß (max 10 MB)');
      return false;
    }

    setError(null);
    return true;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (validateFile(file)) {
        onFileAdded(file);
      }
    });
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (validateFile(file)) {
        onFileAdded(file);
      }
    });
  };

  return (
    <div className="mb-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition ${
          isDragging
            ? 'border-primary bg-primary-light/40'
            : 'border-gray-300 bg-cream hover:border-primary/60'
        }`}
      >
        <Upload size={44} className="mx-auto mb-4 text-primary" />

        <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
          Zieh Dateien hierher oder klick zum Durchsuchen
        </h3>

        <p className="text-gray-500 text-sm mb-4">
          JPG, PNG oder PDF • Max 10 MB pro Datei • Bis zu 5 Dateien
        </p>

        <label className="inline-block">
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Datei auswählen"
          />
          <span className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-md cursor-pointer transition inline-block font-medium text-sm shadow-sm hover:shadow-md">
            Datei auswählen
          </span>
        </label>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-error-dark text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
    </div>
  );
}
