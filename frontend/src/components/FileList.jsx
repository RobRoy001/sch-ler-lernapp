import React from 'react';
import { Trash2, File, Image } from 'lucide-react';
import UploadProgress from './UploadProgress';

export default function FileList({ files, onFileRemove }) {
  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) {
      return <Image size={18} className="text-primary" />;
    }
    return <File size={18} className="text-error" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-cream border border-gray-100 rounded-lg p-6 mb-8 shadow-sm">
      <h3 className="font-display text-base font-semibold text-gray-900 mb-4">
        Hochgeladene Dateien ({files.length})
      </h3>

      <div className="space-y-3">
        {files.map(uploadedFile => (
          <div key={uploadedFile.id} className="bg-white rounded-md p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getFileIcon(uploadedFile.file)}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 truncate font-medium text-sm">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onFileRemove(uploadedFile.id)}
                aria-label="Datei entfernen"
                className="text-gray-400 hover:text-error transition ml-2"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <UploadProgress progress={uploadedFile.progress} status={uploadedFile.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
