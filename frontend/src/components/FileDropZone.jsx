import React, { useState } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

export default function FileDropZone({ onFileAdded }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

  const validateFile = (file) => {
    // Check MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Nur JPG, PNG und PDF erlaubt');
      return false;
    }

    // Check extension
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError('Ungültige Dateiendung');
      return false;
    }

    // Check size
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
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-600 bg-slate-800/30 hover:border-slate-500'
        }`}
      >
        <Upload size={48} className="mx-auto mb-4 text-blue-400" />
        
        <h3 className="text-xl font-semibold text-white mb-2">
          Zieh Dateien hierher oder klick zum Durchsuchen
        </h3>
        
        <p className="text-slate-400 mb-4">
          JPG, PNG oder PDF • Max 10 MB pro Datei • Bis zu 5 Dateien
        </p>

        <label className="inline-block">
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <span className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg cursor-pointer transition inline-block">
            Datei auswählen
          </span>
        </label>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-400">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
    </div>
  );
}