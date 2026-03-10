import { diffChars, answerSimilarity } from '@/lib/diff';

interface AnswerDiffProps {
  userAnswer: string;
  correctAnswer: string;
}

const SCORE_CONFIG = [
  { min: 0.9, label: 'Excellent 🎉', classes: 'text-green-700 bg-green-50 border-green-200' },
  { min: 0.7, label: 'Good 👍',      classes: 'text-blue-700 bg-blue-50 border-blue-200' },
  { min: 0.5, label: 'Partial 😅',   classes: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { min: 0,   label: 'Try again 😬', classes: 'text-red-700 bg-red-50 border-red-200' },
] as const;

/**
 * AnswerDiff — displays the user's typed answer vs the correct answer with
 * character-level diff highlighting.
 *
 * Colour legend (user row):
 *   green  = character matched the correct answer
 *   red + strikethrough = extra / wrong character
 *
 * Colour legend (correct row):
 *   green  = user typed this character correctly
 *   amber + wavy underline = character the user missed
 */
export function AnswerDiff({ userAnswer, correctAnswer }: AnswerDiffProps) {
  const parts = diffChars(userAnswer.trim(), correctAnswer.trim());
  const score  = answerSimilarity(userAnswer, correctAnswer);
  const isEmpty = !userAnswer.trim();

  const scoreConf = SCORE_CONFIG.find((c) => score >= c.min) ?? SCORE_CONFIG[SCORE_CONFIG.length - 1];

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-white">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Answer check</p>
        {!isEmpty && (
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${scoreConf.classes}`}
          >
            {scoreConf.label} · {Math.round(score * 100)}%
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* ── User's answer ────────────────────── */}
        <div>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            Your answer
          </p>
          {isEmpty ? (
            <p className="text-sm italic text-gray-400">— (no answer typed)</p>
          ) : (
            <p className="font-mono text-sm leading-relaxed break-all">
              {parts.map((part, i) => {
                // skip chars from the correct answer that the user didn't type
                if (part.op === 'insert') return null;
                return (
                  <span
                    key={i}
                    className={
                      part.op === 'equal'
                        ? 'bg-green-100 text-green-900 rounded px-[1px]'
                        : 'bg-red-100 text-red-800 line-through rounded px-[1px]'
                    }
                  >
                    {part.text}
                  </span>
                );
              })}
            </p>
          )}
        </div>

        {/* ── Correct answer ───────────────────── */}
        <div>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
            Correct answer
          </p>
          <p className="font-mono text-sm leading-relaxed break-all">
            {parts.map((part, i) => {
              // skip user's extra chars — they appear only in the user row
              if (part.op === 'delete') return null;
              return (
                <span
                  key={i}
                  className={
                    part.op === 'equal'
                      ? 'bg-green-100 text-green-900 rounded px-[1px]'
                      : 'bg-amber-100 text-amber-900 underline decoration-wavy rounded px-[1px]'
                  }
                >
                  {part.text}
                </span>
              );
            })}
          </p>
        </div>

        {/* ── Legend ───────────────────────────── */}
        <div className="flex flex-wrap gap-3 pt-1 border-t border-gray-100">
          <LegendItem color="bg-green-100 text-green-900" label="Correct" />
          <LegendItem color="bg-red-100 text-red-800 line-through" label="Wrong / extra" />
          <LegendItem color="bg-amber-100 text-amber-900 underline decoration-wavy" label="Missed" />
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${color}`}>abc</span>
      {label}
    </span>
  );
}
