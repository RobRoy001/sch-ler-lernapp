import React, { useState } from 'react';

export default function FillGapQuestion({
  question,
  answer,
  onAnswerChange,
  showAnswer
}) {
  const [isFocused, setIsFocused] = useState(false);

  const isCorrect =
    answer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();

  return (
    <div>
      {/* Question mit Lücke */}
      <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
        <p className="text-lg text-slate-300 leading-relaxed">
          {question.question_text.split('_____').map((part, index) => (
            <React.Fragment key={index}>
              {part}
              {index < question.question_text.split('_____').length - 1 && (
                <span className="text-amber-400 font-bold">_____</span>
              )}
            </React.Fragment>
          ))}
        </p>
      </div>

      {/* Input Feld */}
      <div>
        <input
          type="text"
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={showAnswer}
          placeholder="Gib deine Antwort hier ein..."
          className={`w-full px-4 py-3 rounded-lg border-2 bg-slate-700/50 text-white placeholder-slate-500 focus:outline-none transition ${
            showAnswer
              ? isCorrect
                ? 'border-green-500 bg-green-600/10'
                : 'border-red-500 bg-red-600/10'
              : isFocused
              ? 'border-blue-500'
              : 'border-slate-600'
          }`}
        />
      </div>

      {/* Feedback nach Antwort */}
      {showAnswer && (
        <div className="mt-4">
          {isCorrect ? (
            <div className="bg-green-600/10 border border-green-500 rounded-lg p-3">
              <p className="text-green-300 font-semibold">✓ Richtig!</p>
            </div>
          ) : (
            <div className="bg-red-600/10 border border-red-500 rounded-lg p-3">
              <p className="text-red-300 font-semibold">✗ Nicht ganz richtig</p>
              <p className="text-red-300 text-sm mt-2">
                Korrekte Antwort: <strong>{question.correct_answer}</strong>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}