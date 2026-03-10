/**
 * SM-2 Algorithm Tests
 * TDD: These tests are written FIRST and must ALL FAIL before sm2.ts is implemented.
 *
 * Covers:
 *   - All 4 ratings (again/hard/good/easy) from each of 4 card states
 *   - easeFactor clamping [1.3, 2.5]
 *   - Fuzz factor injection via randomFn
 *   - First-review (new card) special cases
 *   - Boundary: interval=7 (no fuzz), interval=8 (fuzz applied)
 */
import { describe, it, expect } from 'vitest';
import { calculateNextReview, initCardProgress } from './sm2.js';
import type { CardProgress } from './sm2.js';

const TODAY = new Date('2026-03-04T00:00:00.000Z');

function days(n: number): Date {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function makeProgress(overrides: Partial<CardProgress> = {}): CardProgress {
  return {
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    state: 'new',
    ...overrides,
  };
}

// ────────────────────────────────────────────────
// initCardProgress
// ────────────────────────────────────────────────
describe('initCardProgress', () => {
  it('creates a progress record with SM-2 defaults', () => {
    const progress = initCardProgress('card-1', 'user-1', TODAY);
    expect(progress.interval).toBe(0);
    expect(progress.easeFactor).toBe(2.5);
    expect(progress.repetitions).toBe(0);
    expect(progress.state).toBe('new');
    expect(progress.dueDate.toISOString().slice(0, 10)).toBe('2026-03-04');
  });
});

// ────────────────────────────────────────────────
// New card — first review
// ────────────────────────────────────────────────
describe('new card — first review', () => {
  it('again: interval=1, repetitions=0, state=relearning, easeFactor decreases', () => {
    const result = calculateNextReview(makeProgress(), 'again', TODAY);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
    expect(result.state).toBe('relearning');
    expect(result.easeFactor).toBeCloseTo(2.3, 5); // 2.5 - 0.2
    expect(result.dueDate.toISOString().slice(0, 10)).toBe(days(1).toISOString().slice(0, 10));
  });

  it('hard: interval=1, repetitions=0, state=learning, easeFactor decreases', () => {
    const result = calculateNextReview(makeProgress(), 'hard', TODAY);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
    expect(result.state).toBe('learning');
    expect(result.easeFactor).toBeCloseTo(2.35, 5); // 2.5 - 0.15
  });

  it('good: interval=1, repetitions=1, state=learning', () => {
    const result = calculateNextReview(makeProgress(), 'good', TODAY);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
    expect(result.state).toBe('learning');
    expect(result.easeFactor).toBeCloseTo(2.5, 5); // unchanged
  });

  it('easy: interval=4, repetitions=1, state=review, easeFactor increases', () => {
    const result = calculateNextReview(makeProgress(), 'easy', TODAY);
    expect(result.interval).toBe(4);
    expect(result.repetitions).toBe(1);
    expect(result.state).toBe('review');
    expect(result.easeFactor).toBeCloseTo(2.65, 5); // 2.5 + 0.15
  });
});

// ────────────────────────────────────────────────
// Learning card
// ────────────────────────────────────────────────
describe('learning card', () => {
  const learning = makeProgress({ state: 'learning', interval: 1, repetitions: 1 });

  it('again: interval=1, repetitions=0, state=relearning', () => {
    const result = calculateNextReview(learning, 'again', TODAY);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
    expect(result.state).toBe('relearning');
  });

  it('good: interval = interval × easeFactor, state=review', () => {
    const result = calculateNextReview(learning, 'good', TODAY);
    expect(result.interval).toBe(Math.ceil(1 * 2.5)); // 3
    expect(result.state).toBe('review');
    expect(result.repetitions).toBe(2);
  });

  it('easy: interval = interval × easeFactor × 1.3, state=review', () => {
    const result = calculateNextReview(learning, 'easy', TODAY);
    expect(result.interval).toBe(Math.ceil(1 * 2.5 * 1.3)); // 4
    expect(result.state).toBe('review');
  });
});

// ────────────────────────────────────────────────
// Review card
// ────────────────────────────────────────────────
describe('review card', () => {
  const reviewing = makeProgress({ state: 'review', interval: 4, easeFactor: 2.5, repetitions: 3 });

  it('again: interval=1, repetitions=0, state=relearning, easeFactor-=0.20', () => {
    const result = calculateNextReview(reviewing, 'again', TODAY);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
    expect(result.state).toBe('relearning');
    expect(result.easeFactor).toBeCloseTo(2.3, 5);
  });

  it('hard: interval = interval × 1.2, easeFactor-=0.15, state=review', () => {
    const result = calculateNextReview(reviewing, 'hard', TODAY);
    expect(result.interval).toBe(Math.ceil(4 * 1.2)); // 5
    expect(result.easeFactor).toBeCloseTo(2.35, 5);
    expect(result.state).toBe('review');
  });

  it('good: interval = interval × easeFactor (4 × 2.5 = 10), state=review', () => {
    const result = calculateNextReview(reviewing, 'good', TODAY);
    expect(result.interval).toBe(10);
    expect(result.state).toBe('review');
    expect(result.repetitions).toBe(4);
  });

  it('easy: interval = interval × easeFactor × 1.3, easeFactor+=0.15', () => {
    const result = calculateNextReview(reviewing, 'easy', TODAY);
    expect(result.interval).toBe(Math.ceil(4 * 2.5 * 1.3)); // 13
    expect(result.easeFactor).toBeCloseTo(2.65, 5);
    expect(result.state).toBe('review');
  });
});

// ────────────────────────────────────────────────
// Relearning card
// ────────────────────────────────────────────────
describe('relearning card', () => {
  const relearning = makeProgress({ state: 'relearning', interval: 1, easeFactor: 2.3, repetitions: 0 });

  it('again: stays relearning, interval=1', () => {
    const result = calculateNextReview(relearning, 'again', TODAY);
    expect(result.interval).toBe(1);
    expect(result.state).toBe('relearning');
  });

  it('good: graduates back to review', () => {
    const result = calculateNextReview(relearning, 'good', TODAY);
    expect(result.state).toBe('review');
    expect(result.interval).toBeGreaterThanOrEqual(1);
  });
});

// ────────────────────────────────────────────────
// easeFactor clamping
// ────────────────────────────────────────────────
describe('easeFactor clamping', () => {
  it('does not go below 1.3 on repeated "again"', () => {
    let p = makeProgress({ easeFactor: 1.3, state: 'review', interval: 3 });
    p = calculateNextReview(p, 'again', TODAY);
    expect(p.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('grows above 2.5 on repeated "easy" (no upper cap in SM-2)', () => {
    let p = makeProgress({ easeFactor: 2.5, state: 'review', interval: 3 });
    for (let i = 0; i < 3; i++) {
      p = calculateNextReview(p, 'easy', TODAY) as CardProgress;
    }
    // easeFactor increases each time: 2.5 → 2.65 → 2.80 → 2.95
    expect(p.easeFactor).toBeGreaterThan(2.5);
  });

  it('stays exactly at 1.3 when would drop below minimum', () => {
    const p = makeProgress({ easeFactor: 1.3, state: 'review', interval: 2 });
    const result = calculateNextReview(p, 'again', TODAY);
    expect(result.easeFactor).toBe(1.3);
  });
});

// ────────────────────────────────────────────────
// Fuzz factor
// ────────────────────────────────────────────────
describe('fuzz factor', () => {
  it('does NOT apply fuzz when interval <= 7', () => {
    const p = makeProgress({ state: 'review', interval: 4, easeFactor: 2.5 });
    const noFuzz = () => 0;
    const result1 = calculateNextReview(p, 'good', TODAY, noFuzz);
    const result2 = calculateNextReview(p, 'good', TODAY);
    expect(result1.interval).toBe(result2.interval);
  });

  it('applies fuzz when interval > 7', () => {
    const p = makeProgress({ state: 'review', interval: 8, easeFactor: 2.5 });
    // 8 × 2.5 = 20, fuzz +5% = 21
    const fuzzUp = () => 0.05;
    const resultFuzz = calculateNextReview(p, 'good', TODAY, fuzzUp);
    // base interval = ceil(20) = 20; fuzzed = ceil(20 * 1.05) = 21
    expect(resultFuzz.interval).toBe(21);
  });

  it('reduces interval with negative fuzz', () => {
    const p = makeProgress({ state: 'review', interval: 8, easeFactor: 2.5 });
    const fuzzDown = () => -0.05;
    const result = calculateNextReview(p, 'good', TODAY, fuzzDown);
    // base = 20, fuzz = 20 * 0.95 = 19
    expect(result.interval).toBe(19);
  });

  it('fuzz boundary: interval=7 → no fuzz; interval=8 → fuzz', () => {
    const p7 = makeProgress({ state: 'review', interval: 7, easeFactor: 1.0 });
    const p8 = makeProgress({ state: 'review', interval: 8, easeFactor: 1.0 });
    const alwaysFuzz = () => 0.05;
    const r7 = calculateNextReview(p7, 'good', TODAY, alwaysFuzz);
    const r8 = calculateNextReview(p8, 'good', TODAY, alwaysFuzz);
    // interval 7 × 1.0 = 7, no fuzz → 7
    expect(r7.interval).toBe(7);
    // interval 8 × 1.0 = 8, fuzz +5% → ceil(8.4) = 9
    expect(r8.interval).toBe(9);
  });
});
