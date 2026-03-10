/**
 * Character-level diff utility using LCS (Longest Common Subsequence).
 *
 * Convention:
 *   a = user's typed answer
 *   b = correct answer
 *
 * DiffOp meanings:
 *   'equal'  – character appears in both and matches
 *   'delete' – character is in a (user) but NOT in b (correct) → extra / wrong
 *   'insert' – character is in b (correct) but NOT in a (user) → missed
 */

export type DiffOp = 'equal' | 'insert' | 'delete';

export interface DiffPart {
  text: string;
  op: DiffOp;
}

/**
 * Compute a character-level diff between `a` (user answer) and `b` (correct answer).
 * Comparison is case-insensitive; the returned text uses `b`'s casing for 'equal' parts.
 */
export function diffChars(a: string, b: string): DiffPart[] {
  const m = a.length;
  const n = b.length;

  // Build LCS DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1].toLowerCase() === b[j - 1].toLowerCase()
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack to reconstruct the diff
  const result: DiffPart[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
      // Prefer the correct answer's casing in the output
      result.push({ text: b[j - 1], op: 'equal' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ text: b[j - 1], op: 'insert' }); // in correct, missing from user
      j--;
    } else {
      result.push({ text: a[i - 1], op: 'delete' }); // in user, not in correct
      i--;
    }
  }

  return result.reverse();
}

/**
 * Compute a similarity score in [0, 1] between `userAnswer` and `correctAnswer`.
 * Based on: matchedChars / max(len_a, len_b). Case-insensitive.
 */
export function answerSimilarity(userAnswer: string, correctAnswer: string): number {
  const a = userAnswer.trim();
  const b = correctAnswer.trim();
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const parts = diffChars(a, b);
  const equalCount = parts.filter((p) => p.op === 'equal').length;
  return equalCount / Math.max(a.length, b.length);
}
