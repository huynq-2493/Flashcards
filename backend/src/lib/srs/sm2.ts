/**
 * SM-2 Spaced Repetition Algorithm — Pure, stateless function.
 *
 * Reference: Piotr Woźniak, SuperMemo 2 algorithm (1987)
 * This function has ZERO side effects. All state is passed in and returned.
 */

export type Rating = 'again' | 'hard' | 'good' | 'easy';

export interface CardProgress {
  interval: number;       // days until next review (0 = new)
  easeFactor: number;     // multiplier, default 2.5, min 1.3, max 2.5
  repetitions: number;    // consecutive successful reviews
  state: 'new' | 'learning' | 'review' | 'relearning';
}

export interface ReviewResult extends CardProgress {
  dueDate: Date;
}

const MIN_EASE = 1.3;

// SM-2 only enforces a MINIMUM easeFactor of 1.3.
// There is no hard upper cap — easeFactor grows with "easy" ratings.
function clampEase(ef: number): number {
  return Math.max(MIN_EASE, ef);
}

/**
 * Calculate the next review schedule for a card.
 *
 * @param progress  Current card scheduling state
 * @param rating    User's quality rating for this review
 * @param now       Reference date for dueDate calculation (default: today UTC)
 * @param randomFn  Optional injected random function for fuzz factor.
 *                  Return a value in [-0.05, 0.05] or omit for no fuzz.
 *                  Fuzz is ONLY applied when resulting interval > 7 days.
 */
export function calculateNextReview(
  progress: CardProgress,
  rating: Rating,
  now: Date = new Date(),
  randomFn?: () => number,
): ReviewResult {
  let { interval, easeFactor, repetitions, state } = progress;

  switch (rating) {
    case 'again': {
      // Failed review — reset to start
      easeFactor = clampEase(easeFactor - 0.20);
      interval = 1;
      repetitions = 0;
      state = 'relearning';
      break;
    }

    case 'hard': {
      easeFactor = clampEase(easeFactor - 0.15);
      if (state === 'new') {
        interval = 1;
        state = 'learning';
        // repetitions stays 0
      } else {
        interval = Math.ceil(interval * 1.2);
        state = state === 'relearning' ? 'review' : state === 'review' ? 'review' : 'learning';
      }
      break;
    }

    case 'good': {
      if (state === 'new') {
        interval = 1;
        state = 'learning';
        repetitions += 1;
      } else {
        const rawInterval = interval === 0 ? 1 : interval;
        interval = Math.ceil(rawInterval * easeFactor);
        state = 'review';
        repetitions += 1;
      }
      // No easeFactor change for "good"
      break;
    }

    case 'easy': {
      // SM-2: calculate new interval using PRE-update easeFactor, then update EF
      const oldEaseFactor = easeFactor;
      easeFactor = clampEase(easeFactor + 0.15);
      if (state === 'new') {
        interval = 4;
        state = 'review';
        repetitions += 1;
      } else {
        const rawInterval = interval === 0 ? 1 : interval;
        interval = Math.ceil(rawInterval * oldEaseFactor * 1.3);
        state = 'review';
        repetitions += 1;
      }
      break;
    }
  }

  // Apply fuzz factor ±5% only for intervals > 7 days
  if (interval > 7 && randomFn) {
    const fuzz = randomFn(); // caller provides value in [-0.05, 0.05]
    interval = Math.ceil(interval * (1 + fuzz));
    if (interval < 1) interval = 1;
  }

  // Calculate due date (UTC date, time stripped to midnight)
  const dueDate = new Date(now);
  dueDate.setUTCHours(0, 0, 0, 0);
  dueDate.setUTCDate(dueDate.getUTCDate() + interval);

  return { interval, easeFactor, repetitions, state, dueDate };
}

/**
 * Create a default CardProgress for a new card.
 * Due date = today (card is immediately available for first study).
 */
export function initCardProgress(
  cardId: string,
  userId: string,
  now: Date = new Date(),
): CardProgress & { cardId: string; userId: string; dueDate: Date } {
  const dueDate = new Date(now);
  dueDate.setUTCHours(0, 0, 0, 0);

  return {
    cardId,
    userId,
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    state: 'new',
    dueDate,
  };
}
