import React from 'react';
import { ArrowRight, Loader } from 'lucide-react';

export default function ConfirmAndProceed({
  filesCount,
  chaptersCount,
  isProcessing,
  onProceed
}) {
  const totalItems = filesCount + chaptersCount;

  return (
    <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Bereit zum Hochladen
          </h3>
          <p className="text-slate-300">
            {filesCount > 0 && `${filesCount} Datei${filesCount !== 1 ? 'en' : ''}`}
            {filesCount > 0 && chaptersCount > 0 && ' + '}
            {chaptersCount > 0 && `${chaptersCount} Kapitel${chaptersCount !== 1 ? '' : ''}`}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Deine Materialien werden automatisch verarbeitet und Tests generiert
          </p>
        </div>

        <button
          onClick={onProceed}
          disabled={isProcessing || totalItems === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 text-white px-8 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader size={20} className="animate-spin" />
              Wird hochgeladen...
            </>
          ) : (
            <>
              Weiter zur Verarbeitung
              <ArrowRight size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}