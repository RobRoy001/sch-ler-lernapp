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
    <div className="bg-gradient-to-r from-primary-light/60 to-accent-light/40 border border-primary/20 rounded-lg p-6 md:p-8">
      <div className="flex items-center justify-between flex-col md:flex-row gap-4 text-center md:text-left">
        <div>
          <h3 className="font-display text-base font-semibold text-gray-900 mb-1">
            Bereit zum Hochladen
          </h3>
          <p className="text-gray-700 text-sm">
            {filesCount > 0 && `${filesCount} Datei${filesCount !== 1 ? 'en' : ''}`}
            {filesCount > 0 && chaptersCount > 0 && ' + '}
            {chaptersCount > 0 && `${chaptersCount} Kapitel${chaptersCount !== 1 ? '' : ''}`}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Deine Materialien werden automatisch verarbeitet und Tests generiert
          </p>
        </div>

        <button
          onClick={onProceed}
          disabled={isProcessing || totalItems === 0}
          className="flex items-center gap-2 bg-primary hover:bg-primary-dark disabled:bg-gray-300 text-white px-6 py-3 rounded-md font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg whitespace-nowrap"
        >
          {isProcessing ? (
            <>
              <Loader size={18} className="animate-spin" />
              Wird hochgeladen…
            </>
          ) : (
            <>
              Weiter zur Verarbeitung
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
