import React, { useState } from 'react';

export default function VocabularyQuestion({
  question,
  answer,
  onAnswerChange,
  showAnswer
}) {
  const [selections, setSelections] = useState(() => {
    // Parse answer as JSON array or empty array
    if (typeof answer === 'string' && answer.trim()) {
      try {
        return JSON.parse(answer);
      } catch {
        return [];
      }
    }
    return [];
  });

  const handleSelect = (option) => {
    const newSelections = [...selections];
    if (newSelections.includes(option)) {
      newSelections.splice(newSelections.indexOf(option), 1);
    } else {
      newSelections.push(option);
    }
    setSelections(newSelections);
    onAnswerChange(JSON.stringify(newSelections));
  };

  const isCorrect = JSON.stringify(selections.sort()) === 
                    JSON.stringify(question.options.map(o => o.right).sort());

  return (
    <div>
      <p className="text-slate-300 mb-6">{question.question_text}</p>

      {/* Left Side: German Words */}
      <div className="mb-6">
        <p className="text-sm text-slate-400 mb-3">Deutsche Wörter:</p>
        <div className="space-y-2">
          {question.options.map((pair, index) => (
            <div
              key={index}
              className="bg-slate-700/30 border border-slate-600 rounded-lg p-3"
            >
              <p className="text-white font-medium">{pair.left}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side: English Translations (clickable) */}
      <div>
        <p className="text-sm text-slate-400 mb-3">Englische Übersetzungen:</p>
        <div className="space-y-2">
          {question.options.map((pair, index) => {
            const isSelected = selections.includes(pair.right);
            const isInCorrectAnswer = question.options.map(o => o.right).includes(pair.right);

            return (
              <button
                key={index}
                onClick={() => !showAnswer && handleSelect(pair.right)}
                disabled={showAnswer}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${
                  showAnswer && isInCorrectAnswer && isSelected
                    ? 'bg-green-600/20 border-green-500 text-green-300'
                    : showAnswer && isSelected && !isInCorrectAnswer
                    ? 'bg-red-600/20 border-red-500 text-red-300'
                    : isSelected
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-slate-700/30 border-slate-600 text-white hover:border-slate-500'
                }`}
              >
                {isSelected && <span className="mr-2">✓</span>}
                {pair.right}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback */}
      {showAnswer && (
        <div className="mt-4">
          {isCorrect ? (
            <div className="bg-green-600/10 border border-green-500 rounded-lg p-3">
              <p className="text-green-300 font-semibold">✓ Perfekt!</p>
            </div>
          ) : (
            <div className="bg-red-600/10 border border-red-500 rounded-lg p-3">
              <p className="text-red-300 font-semibold">✗ Nicht ganz richtig</p>
              <p className="text-red-300 text-sm mt-2">
                Versuche alle Paare richtig zuzuordnen.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}