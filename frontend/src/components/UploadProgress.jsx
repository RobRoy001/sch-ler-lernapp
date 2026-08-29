import React from 'react';

export default function UploadProgress({ progress, status }) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'uploading':
        return 'bg-blue-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Fertig';
      case 'error':
        return 'Fehler';
      case 'uploading':
        return 'Wird hochgeladen...';
      default:
        return 'Ausstehend';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="w-full bg-slate-600 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${getStatusColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="text-right">
        <span className="text-slate-300 text-sm font-medium">{progress}%</span>
      </div>
      <div className="text-slate-400 text-xs min-w-fit">{getStatusText()}</div>
    </div>
  );
}