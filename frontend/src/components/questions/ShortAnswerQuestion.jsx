import React, { useState } from 'react';

export default function ShortAnswerQuestion({
  question,
  answer,
  onAnswerChange,
  showAnswer
}) {
  const [isFocused, setIsFocused] = useState(false);

  // Fuzzy matching: check if user answer contains key words from correct answer
  const getAccuracy = () => {
    const correctWords = question.correct_answer
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3);
    
    const userWords = answer
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3);

    const matches = userWords.filter(w => 
      correctWords.some(cw => cw.includes(w) || w.includes(cw))
    ).length;

    return Math.round((matches / correctWords.length) * 100);
  };

  const accuracy = getAccuracy();
  const isReasonablyCorrect = accuracy >= 60;

  return (
    <div>
      {/* Textarea */}
      <textarea
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={showAnswer}
        placeholder="Schreibe deine Antwort hier..."
        rows={5}
        className={`w-full px-4 py-3 rounded-lg border-2 bg-slate-700/50 text-white placeholder-slate-500 focus:outline-none transition resize-none ${
          showAnswer
            ? isReasonablyCorrect
              ? 'border-green-500 bg-green-600/10'
              : 'border-red-500 bg-red-600/10'
            : isFocused
            ? 'border-blue-500'
            : 'border-slate-600'
        }`}
      />

      {/* Word Count */}
      <p className="text-slate-400 text-sm mt-2">
        {answer.split(/\s+/).filter(w => w.length > 0).length} Wörter
      </p>

      {/* Feedback nach Antwort */}
      {showAnswer && (
        <div className="mt-4">
          {isReasonablyCorrect ? (
            <div className="bg-green-600/10 border border-green-500 rounded-lg p-4">
              <p className="text-green-300 font-semibold">✓ Gute Antwort!</p>
              <p className="text-green-300 text-sm mt-2">
                Du hast die wichtigsten Punkte erfasst.
              </p>
            </div>
          ) : (
            <div className="bg-red-600/10 border border-red-500 rounded-lg p-4">
              <p className="text-red-300 font-semibold">💡 Vergleich mit Musterlösung:</p>
              <p className="text-red-300 text-sm mt-2 bg-red-900/20 p-3 rounded mt-3">
                <strong>Musterlösung:</strong> {question.correct_answer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}