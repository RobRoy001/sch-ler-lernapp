import React, { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, ListChecks } from 'lucide-react';

// ✅ Fix (2026-09-06): Robert konnte sich Testergebnisse bisher nicht im
// Detail anschauen - nur die Gesamt-Erfolgsquote war sichtbar, nicht WELCHE
// Fragen falsch waren. "questions" ist das gradedAnswers-Array aus dem
// Backend (siehe routes/processing.js, gleiche Form bei POST .../submit
// (Feld "answers") und GET /submissions/:submissionId (Feld
// "questions"/"userAnswers")): je ein Eintrag mit question_text, answer,
// correct_answer, is_correct, explanation, topic.
export default function AnswerReview({ questions }) {
  const [expanded, setExpanded] = useState(true);

  if (!questions || questions.length === 0) {
    return null;
  }

  const wrongCount = questions.filter((q) => !q.is_correct).length;

  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm mt-6">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 p-6 text-left"
      >
        <div className="flex items-center gap-3">
          <ListChecks size={20} className="text-primary" />
          <div>
            <h3 className="font-display text-lg font-bold text-gray-900">
              Deine Antworten im Detail
            </h3>
            <p className="text-sm text-gray-500">
              {wrongCount === 0
                ? 'Alle Fragen richtig beantwortet'
                : `${wrongCount} von ${questions.length} Fragen falsch beantwortet`}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={20} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {questions.map((q, index) => (
            <div key={q.question_id || index} className="p-6">
              <div className="flex items-start gap-3">
                {q.is_correct ? (
                  <CheckCircle size={20} className="text-success flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={20} className="text-error flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    {index + 1}. {q.question_text}
                  </p>
                  <p className="text-sm text-gray-600">
                    Deine Antwort:{' '}
                    <span
                      className={
                        q.is_correct ? 'font-medium text-success' : 'font-medium text-error'
                      }
                    >
                      {q.answer || '(keine Antwort)'}
                    </span>
                  </p>
                  {!q.is_correct && (
                    <p className="text-sm text-gray-600 mt-1">
                      Richtige Antwort:{' '}
                      <span className="font-medium text-gray-900">{q.correct_answer}</span>
                    </p>
                  )}
                  {q.explanation && (
                    <p className="text-sm text-gray-500 mt-2 bg-gray-50 rounded-md p-3">
                      {q.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
