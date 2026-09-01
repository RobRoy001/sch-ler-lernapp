import React from 'react';

export default function UploadProgress({ progress, status }) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-success';
      case 'error':
        return 'bg-error';
      case 'uploading':
        return 'bg-primary';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Fertig';
      case 'error':
        return 'Fehler';
      case 'uploading':
        return 'Wird hochgeladen…';
      default:
        return 'Ausstehend';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div
          className="w-full bg-gray-200 rounded-full h-2"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="text-right">
        <span className="text-gray-600 text-xs font-medium">{progress}%</span>
      </div>
      <div className="text-gray-400 text-xs min-w-fit">{getStatusText()}</div>
    </div>
  );
}
