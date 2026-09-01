import React, { useState, useEffect } from 'react';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6"
        >
          <ArrowLeft size={20} /> Zurück zum Dashboard
        </button>
        
        <h1 className="text-4xl font-bold text-white mb-2">Neue Inhalte hochladen</h1>
        <p className="text-slate-400">Wähle Bücher aus unserem Katalog oder lade deine eigenen Materialien hoch</p>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex gap-4 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload size={20} /> Dateien hochladen
          </button>
          
          <button
            onClick={() => setActiveTab('book')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 transition ${
              activeTab === 'book'
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen size={20} /> Aus Katalog wählen
          </button>
          
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex items-center gap-2 px-6 py-3 border-b-2 transition ${
              activeTab === 'camera'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera size={20} /> Mit Kamera
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-4xl mx-auto mb-6 bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
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
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center text-slate-400">
            <Camera size={48} className="mx-auto mb-4 opacity-50" />
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