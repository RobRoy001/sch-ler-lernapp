import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../config/api';

export default function UploadPage({ user }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Nur PDF, JPG, PNG oder TXT Dateien sind erlaubt');
        return;
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('Datei darf nicht größer als 10 MB sein');
        return;
      }

      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file || !title.trim()) {
      setError('Bitte wähle eine Datei und gib einen Titel ein');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);

      const uploadResponse = await fetch(`${API_BASE_URL}/content/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        credentials: 'include'
      });

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json().catch(() => ({}));
        throw new Error(data.error || 'Upload fehlgeschlagen');
      }

      // Nach dem Datei-Upload wird eine Content-Source angelegt, die die
      // Verarbeitung (Testgenerierung) für genau diese Aufgabe verfolgt.
      const sourceResponse = await fetch(`${API_BASE_URL}/content/sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content_type: file.type || 'document' }),
        credentials: 'include'
      });

      const sourceData = await sourceResponse.json();
      if (!sourceResponse.ok) {
        throw new Error(sourceData.error || 'Aufgabe konnte nicht angelegt werden');
      }

      setSuccess(true);
      setTitle('');
      setDescription('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Weiter zur Verarbeitungsseite dieser konkreten Aufgabe
      setTimeout(() => {
        navigate(`/processing/${sourceData.source.id}`);
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm font-medium"
        >
          <ArrowLeft size={18} /> Zurück zum Dashboard
        </button>

        <div className="flex items-center gap-3 mb-8">
          <Logo size={32} />
          <h1 className="font-display text-2xl font-bold text-gray-900">Neue Aufgabe</h1>
        </div>

        <div className="bg-cream border border-gray-100 rounded-lg p-8 shadow-sm">
          <form onSubmit={handleUpload} className="space-y-6">
            {/* Title Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Titel der Aufgabe <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Mathe Klausur - Kapitel 5"
                className="w-full h-11 px-4 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-xs text-gray-500 mt-1">Kurze Beschreibung deiner Aufgabe</p>
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Beschreibung (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="z.B. Aufgaben zum Thema Quadratische Gleichungen"
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">Zusätzliche Details helfen beim Verständnis</p>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Datei hochladen <span className="text-error">*</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 rounded-lg p-8 text-center cursor-pointer transition"
              >
                <Upload size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="font-semibold text-gray-900 mb-1">
                  Datei hier ablegen oder klicken
                </p>
                <p className="text-xs text-gray-500">
                  PDF, JPG, PNG oder TXT (max. 10 MB)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.txt"
                className="hidden"
              />
              {file && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">✓ {file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-error-light border border-error/20 rounded-md">
                <AlertTriangle size={18} className="text-error-dark flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error-dark">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-start gap-3 p-4 bg-success/10 border border-success/30 rounded-md">
                <CheckCircle size={18} className="text-success flex-shrink-0 mt-0.5" />
                <p className="text-sm text-success font-semibold">
                  Aufgabe erfolgreich hochgeladen! Wird weitergeleitet…
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !file}
              className="w-full bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Wird hochgeladen…' : 'Aufgabe hochladen'}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">So funktioniert es:</h3>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>Lade deine Aufgabe hoch (PDF, Bild oder Text)</li>
              <li>Unser System liest die Aufgabe automatisch</li>
              <li>Es erstellt passende Testfragen</li>
              <li>Du kannst die Fragen beantworten und dein Wissen testen</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
