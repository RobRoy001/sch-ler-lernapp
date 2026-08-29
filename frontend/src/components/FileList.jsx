import React from 'react';
import { Trash2, File, Image } from 'lucide-react';
import UploadProgress from './UploadProgress';

export default function FileList({ files, onFileRemove }) {
  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) {
      return <Image size={20} className="text-blue-400" />;
    }
    return <File size={20} className="text-red-400" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
      <h3 className="text-lg font-semibold text-white mb-4">
        Hochgeladene Dateien ({files.length})
      </h3>

      <div className="space-y-3">
        {files.map(uploadedFile => (
          <div key={uploadedFile.id} className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 flex-1">
                {getFileIcon(uploadedFile.file)}
                <div className="flex-1 min-w-0">
                  <p className="text-white truncate font-medium text-sm">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-slate-400 text-xs">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => onFileRemove(uploadedFile.id)}
                className="text-slate-400 hover:text-red-400 transition ml-2"
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