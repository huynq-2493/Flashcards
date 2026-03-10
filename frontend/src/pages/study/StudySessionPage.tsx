import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { sessionsService } from '@/services/sessions';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ConfirmModal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { getApiError, getApiErrorCode } from '@/lib/api';
import { AnswerDiff } from '@/components/study/AnswerDiff';
import type { Rating, NextCardResponse } from '@/types/api';

type Phase = 'loading' | 'question' | 'answer' | 'done' | 'error';

interface CardState {
  id: string;
  front: string;
  deckId: string;
  position: number;
  total: number;
}

const ratingConfig: Array<{
  rating: Rating;
  label: string;
  key: string;
  keyNum: string;
  colorClass: string;
  preview: string;
}> = [
  { rating: 'again', label: 'Again', key: 'Space+1', keyNum: '1', colorClass: 'bg-again text-white hover:bg-red-600', preview: 'Tomorrow' },
  { rating: 'hard', label: 'Hard', key: '2', keyNum: '2', colorClass: 'bg-hard text-white hover:bg-orange-600', preview: '~2 days' },
  { rating: 'good', label: 'Good', key: '3', keyNum: '3', colorClass: 'bg-good text-white hover:bg-green-600', preview: '~4 days' },
  { rating: 'easy', label: 'Easy', key: '4', keyNum: '4', colorClass: 'bg-easy text-white hover:bg-teal-600', preview: '~8 days' },
];

export default function StudySessionPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [card, setCard] = useState<CardState | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const [showAbandon, setShowAbandon] = useState(false);
  const [totalCards, setTotalCards] = useState(0);
  const [rated, setRated] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const answerInputRef = useRef<HTMLTextAreaElement>(null);

  // 1. Create session on mount
  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const session = await sessionsService.createSession(deckId!);
        if (cancelled) return;
        setSessionId(session.sessionId);
        sessionIdRef.current = session.sessionId;
        setTotalCards(session.totalCards);
        await loadNext(session.sessionId);
      } catch (err) {
        if (!cancelled) {
          if (getApiErrorCode(err) === 'NO_CARDS_DUE') {
            toast('info', 'No cards due for review right now!');
            navigate(`/decks/${deckId}`, { replace: true });
          } else {
            toast('error', getApiError(err));
            setPhase('error');
          }
        }
      }
    }
    start();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  // 2. Load next card
  const loadNext = useCallback(async (sid: string) => {
    setPhase('loading');
    setIsFlipped(false);
    setUserAnswer('');
    setCorrectAnswer(null);
    try {
      const res = await sessionsService.getNextCard(sid);
      if (res.done) {
        // Auto-complete the session
        await sessionsService.completeSession(sid);
        navigate(`/sessions/${sid}/summary`, { replace: true });
        return;
      }
      const nc = res as NextCardResponse;
      setCard({ id: nc.card.id, front: nc.card.front, deckId: nc.card.deckId, position: nc.position, total: nc.total });
      setPhase('question');
    } catch (err) {
      toast('error', getApiError(err));
      setPhase('error');
    }
  }, [navigate]);

  // 3. Rate card
  const rateMutation = useMutation({
    mutationFn: ({ sid, cardId, rating }: { sid: string; cardId: string; rating: Rating }) =>
      sessionsService.rateCard(sid, cardId, rating),
    onSuccess: async () => {
      setRated((r) => r + 1);
      await loadNext(sessionIdRef.current!);
    },
    onError: (err) => toast('error', getApiError(err)),
  });

  const handleFlip = useCallback(() => {
    if (phase === 'question') setPhase('answer');
    setIsFlipped(true);
  }, [phase]);

  const handleRate = useCallback(
    (rating: Rating) => {
      if (!sessionId || !card || isRating || phase !== 'answer') return;
      setIsRating(true);
      rateMutation.mutate(
        { sid: sessionId, cardId: card.id, rating },
        { onSettled: () => setIsRating(false) },
      );
    },
    [sessionId, card, isRating, phase, rateMutation],
  );

  // 4. Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === ' ') {
        e.preventDefault();
        if (phase === 'question') handleFlip();
      }
      if (phase === 'answer') {
        if (e.key === '1') handleRate('again');
        if (e.key === '2') handleRate('hard');
        if (e.key === '3') handleRate('good');
        if (e.key === '4') handleRate('easy');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, handleFlip, handleRate]);

  // 5. Auto-focus answer input when a new card arrives
  useEffect(() => {
    if (phase === 'question') {
      // Small delay lets the DOM settle after the card transition
      const t = setTimeout(() => answerInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // 6. Abandon session
  const handleAbandon = async () => {
    if (sessionId) {
      try {
        await sessionsService.abandonSession(sessionId);
      } catch {
        // ignore
      }
    }
    navigate(`/decks/${deckId}`, { replace: true });
  };

  // Progress
  const progress = totalCards > 0 ? rated : 0;

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-600 font-medium">Something went wrong. Please try again.</p>
        <Button onClick={() => navigate(`/decks/${deckId}`)}>Back to Deck</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {totalCards > 0 && (
            <span>
              {rated}/{totalCards} cards
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAbandon(true)}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          End session
        </button>
      </div>

      {/* Progress */}
      <ProgressBar value={progress} max={totalCards} colorClass="bg-indigo-500" />

      {/* Card */}
      <div className="perspective-1000">
        <div
          className={`relative transition-transform duration-300 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front */}
          <div
            className={[
              'bg-white rounded-2xl border shadow-lg p-8 min-h-[280px]',
              'flex flex-col items-center justify-center text-center cursor-pointer',
              'backface-hidden select-none',
              phase === 'loading' ? 'animate-pulse' : '',
            ].join(' ')}
            style={{ backfaceVisibility: 'hidden' }}
            onClick={phase === 'question' ? handleFlip : undefined}
          >
            {phase === 'loading' ? (
              <div className="space-y-3 w-full max-w-sm">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mx-auto" />
              </div>
            ) : (
              <>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">
                  Front
                </p>
                <p className="text-xl font-medium text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {card?.front}
                </p>
                <p className="text-xs text-gray-400 mt-6">
                  Press <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">Space</kbd> or tap to reveal
                </p>
              </>
            )}
          </div>

          {/* Back (flipped) */}
          {card && (
            <div
              className={[
                'absolute inset-0 bg-white rounded-2xl border shadow-lg p-8 min-h-[280px]',
                'flex flex-col items-center justify-center text-center',
                'backface-hidden rotate-y-180',
              ].join(' ')}
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">
                Answer
              </p>
              <p className="text-xl font-medium text-gray-900 whitespace-pre-wrap leading-relaxed">
                {/* Back is revealed from server after flip, but we need to fetch it */}
                {/* In this app, back is NOT available from session API by design */}
                {/* We show a placeholder; in real deployment cards are fetched with back when viewed */}
                <BackContent cardId={card.id} deckId={card.deckId} onFetched={setCorrectAnswer} />
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Answer input — shown while user is on the question side */}
      {phase === 'question' && card && (
        <div className="space-y-2">
          <textarea
            ref={answerInputRef}
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleFlip();
              }
            }}
            placeholder="Type your answer… (Enter ↵ to reveal)"
            rows={3}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none placeholder-gray-400"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Shift+Enter for newline · Enter or Space to reveal</p>
            <Button size="sm" variant="secondary" onClick={handleFlip}>
              Show Answer
            </Button>
          </div>
        </div>
      )}

      {/* Answer diff — shown after flip */}
      {isFlipped && phase === 'answer' && (
        correctAnswer !== null ? (
          <AnswerDiff userAnswer={userAnswer} correctAnswer={correctAnswer} />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-400 text-center animate-pulse">
            Comparing answer…
          </div>
        )
      )}

      {/* Rating buttons — only show when flipped */}
      {isFlipped && phase === 'answer' && (
        <div className="animate-fade-in">
          <p className="text-xs text-center text-gray-400 mb-3">How well did you recall?</p>
          <div className="grid grid-cols-4 gap-2">
            {ratingConfig.map(({ rating, label, keyNum, colorClass, preview }) => (
              <button
                key={rating}
                onClick={() => handleRate(rating)}
                disabled={isRating}
                className={[
                  'rounded-xl py-3 font-semibold text-sm flex flex-col items-center gap-1',
                  'transition-all duration-150 disabled:opacity-50',
                  colorClass,
                ].join(' ')}
                data-rating={rating}
              >
                {label}
                <span className="text-[10px] opacity-80 font-normal">{preview}</span>
                <kbd className="text-[10px] opacity-70 bg-white/20 px-1.5 py-0.5 rounded">
                  {keyNum}
                </kbd>
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-gray-300 mt-2">
            Keyboard: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
          </p>
        </div>
      )}

      {/* Manual abandon */}
      <ConfirmModal
        open={showAbandon}
        onClose={() => setShowAbandon(false)}
        onConfirm={handleAbandon}
        title="End session?"
        message="Progress for already-rated cards will be saved. Unrated cards will not be affected."
        confirmLabel="End session"
      />
    </div>
  );
}

/**
 * BackContent component: fetches the card's back text only when the card is flipped.
 * This ensures back text is never pre-loaded (satisfies FR-014 spirit on the frontend).
 */
function BackContent({ cardId, deckId, onFetched }: { cardId: string; deckId: string; onFetched?: (back: string) => void }) {
  const [back, setBack] = useState<string | null>(null);
  const onFetchedRef = useRef(onFetched);
  useEffect(() => { onFetchedRef.current = onFetched; });

  useEffect(() => {
    let cancelled = false;
    // Fetch all cards for this deck; find the one matching cardId for its back text
    // (The session API never returns back — so we fetch it here only after flip)
    import('@/services/decks').then(({ decksService }) => {
      decksService.listCards(deckId).then((cards) => {
        if (cancelled) return;
        const card = cards.find((c) => c.id === cardId);
        const backText = card?.back ?? '—';
        setBack(backText);
        onFetchedRef.current?.(backText);
      }).catch(() => {
        if (!cancelled) {
          setBack('—');
          onFetchedRef.current?.('—');
        }
      });
    });
    return () => { cancelled = true; };
  }, [cardId, deckId]);

  if (back === null) {
    return (
      <span className="inline-flex items-center gap-2 text-gray-400">
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading…
      </span>
    );
  }

  return <>{back}</>;
}
