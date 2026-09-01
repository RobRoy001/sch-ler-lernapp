import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, BookOpen, Camera } from 'lucide-react';
import FileDropZone from '../components/FileDropZone';
import FileList from '../components/FileList';
import BookCatalogSelector from '../components/BookCatalogSelector';
import ConfirmAndProceed from '../components/ConfirmAndProceed';

export default function UploadPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapters, setSelectedChapters] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleFileAdded = (file) => {
    setUploadedFiles(prev => [...prev, {
      id: Date.now(),
      file,
      progress: 0,
      status: 'pending'
    }]);
    setError(null);
  };

  const handleFileRemove = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleProceed = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      let lastSourceId = null;

      // 1. Upload all files
      for (const uploadedFile of uploadedFiles) {
        const formData = new FormData();
        formData.append('file', uploadedFile.file);

        console.log('[Upload] Uploading file:', uploadedFile.file.name);

        const uploadRes = await fetch('https://web-production-adfb70.up.railway.app/api/content/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          throw new Error(errorData.error || 'Upload fehlgeschlagen');
        }

        const uploadData = await uploadRes.json();
        console.log('[Upload] Upload erfolgreich:', uploadData);

        // Create content source
        console.log('[Content Source] Creating for file ID:', uploadData.file.id);

        const sourceRes = await fetch('https://web-production-adfb70.up.railway.app/api/content/sources', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content_type: 'uploaded_document',
            reference_id: uploadData.file.id
          })
        });

        if (!sourceRes.ok) {
          const errorData = await sourceRes.json();
          throw new Error(errorData.error || 'Content Source erstellen fehlgeschlagen');
        }

        const sourceData = await sourceRes.json();
        lastSourceId = sourceData.source.id;
        console.log('[Content Source] Created with ID:', lastSourceId);
      }

      // 2. If book chapters selected
      if (selectedChapters.length > 0) {
        for (const chapter of selectedChapters) {
          console.log('[Book Chapter] Creating for chapter:', chapter.id);

          const sourceRes = await fetch('https://web-production-adfb70.up.railway.app/api/content/sources', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              content_type: 'book_chapter',
              reference_id: chapter.id,
              reference_book_id: selectedBook.id
            })
          });

          if (!sourceRes.ok) {
            const errorData = await sourceRes.json();
            throw new Error(errorData.error || 'Book Chapter Source erstellen fehlgeschlagen');
          }

          const sourceData = await sourceRes.json();
          lastSourceId = sourceData.source.id;
        }
      }

      if (!lastSourceId) {
        throw new Error('Keine Inhalte hochgeladen');
      }

      // 3. Redirect to processing
      console.log('[Redirect] Navigating to processing page with sourceId:', lastSourceId);
      navigate(`/processing/${lastSourceId}`);

    } catch (err) {
      console.error('[Error]', err);
      setError(err.message || 'Fehler beim Hochladen');
      setIsProcessing(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const tabs = [
    { id: 'upload', label: 'Dateien hochladen', icon: Upload },
    { id: 'book', label: 'Aus Katalog wählen', icon: BookOpen },
    { id: 'camera', label: 'Mit Kamera', icon: Camera },
  ];

  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm font-medium"
        >
          <ArrowLeft size={18} /> Zurück zum Dashboard
        </button>

        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">Neue Inhalte hochladen</h1>
        <p className="text-gray-500">Wähle Bücher aus unserem Katalog oder lade deine eigenen Materialien hoch</p>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 md:px-6 py-3 border-b-2 text-sm md:text-base font-medium whitespace-nowrap transition ${
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div role="alert" className="max-w-4xl mx-auto mb-6 bg-error-light border border-error/30 text-error-dark px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto">
        {activeTab === 'upload' && (
          <>
            <FileDropZone onFileAdded={handleFileAdded} />
            {uploadedFiles.length > 0 && (
              <FileList files={uploadedFiles} onFileRemove={handleFileRemove} />
            )}
          </>
        )}

        {activeTab === 'book' && (
          <BookCatalogSelector
            selectedBook={selectedBook}
            onBookSelect={setSelectedBook}
            selectedChapters={selectedChapters}
            onChaptersSelect={setSelectedChapters}
          />
        )}

        {activeTab === 'camera' && (
          <div className="bg-cream border border-gray-100 rounded-lg p-8 text-center text-gray-400">
            <Camera size={48} className="mx-auto mb-4 opacity-40" />
            <p>Kamera-Feature kommt bald! 🚀</p>
          </div>
        )}
      </div>

      {/* Proceed Button */}
      {(uploadedFiles.length > 0 || selectedChapters.length > 0) && (
        <div className="max-w-4xl mx-auto mt-8">
          <ConfirmAndProceed
            filesCount={uploadedFiles.length}
            chaptersCount={selectedChapters.length}
            isProcessing={isProcessing}
            onProceed={handleProceed}
          />
        </div>
      )}
    </div>
  );
}
