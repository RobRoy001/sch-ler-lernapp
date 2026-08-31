import React from 'react';

export default function MultipleChoiceQuestion({
  question,
  answer,
  onAnswerChange,
  showAnswer
}) {
  return (
    <div className="space-y-3">
      {question.options.map((option, index) => {
        const isSelected = answer === option.text;
        const isCorrect = option.is_correct;
        const shouldHighlight = showAnswer && isCorrect;
        const shouldShowWrong = showAnswer && isSelected && !isCorrect;

        return (
          <label
            key={index}
            className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition ${
              shouldHighlight
                ? 'bg-green-600/20 border-green-500'
                : shouldShowWrong
                ? 'bg-red-600/20 border-red-500'
                : isSelected
                ? 'bg-blue-600/20 border-blue-500'
                : 'bg-slate-700/30 border-slate-600 hover:border-slate-500'
            }`}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option.text}
              checked={isSelected}
              onChange={(e) => onAnswerChange(e.target.value)}
              disabled={showAnswer}
              className="w-4 h-4 accent-blue-500 cursor-pointer"
            />
            <span className="ml-4 flex-1 text-white font-medium">{option.text}</span>
            {shouldHighlight && <span className="text-green-400 font-bold">✓</span>}
            {shouldShowWrong && <span className="text-red-400 font-bold">✗</span>}
          </label>
        );
      })}
    </div>
  );
}