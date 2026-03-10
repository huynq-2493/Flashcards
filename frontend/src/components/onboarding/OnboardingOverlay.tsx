import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

const STORAGE_KEY = 'flashcards_onboarding_dismissed';

/**
 * T054 — OnboardingOverlay
 *
 * Shown only once to a new user (tracked in localStorage under `flashcards_onboarding_dismissed`).
 * Highlights the three key actions: Add Card, Study Now, and rating buttons.
 * Dismissed permanently by clicking "Got it!".
 */
export function OnboardingOverlay() {
  // Default to `true` (hidden) to avoid a flash on returning users.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center pb-10 px-4 pointer-events-none">
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/25" />

      {/* Tooltip card */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full pointer-events-auto z-50 animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl" aria-hidden>👋</span>
          <div>
            <h3 id="onboarding-title" className="text-lg font-semibold text-gray-900">
              Welcome to Flashcards!
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Here's how to get started:
            </p>
          </div>
        </div>

        <ol className="space-y-3 mb-5">
          <li className="flex items-start gap-3 text-sm text-gray-700">
            <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">1</span>
            <span>Click <strong>+ Add Card</strong> inside any deck to create your first flashcard.</span>
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-700">
            <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">2</span>
            <span>Click <strong>Study Now</strong> on a deck to start a review session.</span>
          </li>
          <li className="flex items-start gap-3 text-sm text-gray-700">
            <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">3</span>
            <span>Rate each card with <strong>Again / Hard / Good / Easy</strong> — the app will schedule your next review automatically.</span>
          </li>
        </ol>

        <Button onClick={dismiss} className="w-full">
          Got it! 🚀
        </Button>
      </div>
    </div>
  );
}
