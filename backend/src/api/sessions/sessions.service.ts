import { Rating } from '@prisma/client';
import prisma from '../../lib/prisma.js';
import { calculateNextReview } from '../../lib/srs/sm2.js';
import { getDueCards } from '../../lib/srs/queue.js';
import { createError } from '../../middleware/errorHandler.js';

export async function createSession(userId: string, deckId: string) {
  // Check deck ownership
  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
  if (!deck) throw createError('Deck not found', 404, 'NOT_FOUND');

  // Check for an existing active session for this deck
  const existingSession = await prisma.studySession.findFirst({
    where: { userId, deckId, status: 'active' },
  });
  if (existingSession) {
    const totalCards = await prisma.sessionQueue.count({ where: { sessionId: existingSession.id } });
    return { sessionId: existingSession.id, resumed: true, totalCards };
  }

  // Get user settings for daily limits
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const dailyNewLimit = settings?.dailyNewCardsLimit ?? 20;

  // Build due-card queue
  const cards = await getDueCards(prisma, userId, deckId, dailyNewLimit);
  if (cards.length === 0) {
    // Find next due date
    const nextDue = await prisma.cardProgress.findFirst({
      where: { userId, card: { deckId }, state: { notIn: ['new'] } },
      orderBy: { dueDate: 'asc' },
    });
    const error = createError('No cards due for study', 422, 'NO_CARDS_DUE');
    (error as unknown as Record<string, unknown>).nextDueDate = nextDue?.dueDate ?? null;
    throw error;
  }

  // Create session and snapshot the queue
  const session = await prisma.studySession.create({
    data: {
      userId,
      deckId,
      status: 'active',
      queue: {
        create: cards.map((card, index) => ({
          cardId: card.id,
          position: index,
        })),
      },
    },
  });

  return { sessionId: session.id, resumed: false, totalCards: cards.length };
}

export async function getNextCard(sessionId: string, userId: string) {
  const session = await prisma.studySession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw createError('Session not found', 404, 'NOT_FOUND');
  if (session.status !== 'active') {
    throw createError('Session is not active', 409, 'SESSION_LOCKED');
  }

  // Get the next unrated card in queue order
  const nextItem = await prisma.sessionQueue.findFirst({
    where: { sessionId, ratedAt: null },
    orderBy: { position: 'asc' },
    include: {
      card: {
        select: {
          id: true,
          front: true,
          deckId: true,
          // NEVER include 'back' here — constitutional rule FR-014
        },
      },
    },
  });

  if (!nextItem) {
    return { done: true };
  }

  const totalCards = await prisma.sessionQueue.count({ where: { sessionId } });
  const ratedCards = await prisma.sessionQueue.count({
    where: { sessionId, ratedAt: { not: null } },
  });

  return {
    done: false,
    card: nextItem.card,
    position: ratedCards + 1,
    total: totalCards,
  };
}

export async function rateCard(
  sessionId: string,
  cardId: string,
  rating: Rating,
  userId: string,
) {
  const session = await prisma.studySession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw createError('Session not found', 404, 'NOT_FOUND');
  if (session.status !== 'active') {
    throw createError('Session is already completed', 409, 'SESSION_LOCKED');
  }

  // Get current card progress
  const progress = await prisma.cardProgress.findUnique({
    where: { cardId_userId: { cardId, userId } },
  });
  if (!progress) throw createError('Card progress not found', 404, 'NOT_FOUND');

  // Calculate new schedule
  const smProgress = {
    interval: progress.intervalDays,
    easeFactor: progress.easeFactor,
    repetitions: progress.repetitions,
    state: progress.state as 'new' | 'learning' | 'review' | 'relearning',
  };
  const result = calculateNextReview(smProgress, rating as 'again' | 'hard' | 'good' | 'easy');

  // Execute in a single transaction: update progress + log + mark queue item
  await prisma.$transaction([
    prisma.cardProgress.update({
      where: { cardId_userId: { cardId, userId } },
      data: {
        intervalDays: result.interval,
        easeFactor: result.easeFactor,
        repetitions: result.repetitions,
        state: result.state,
        dueDate: result.dueDate,
        lastReviewedAt: new Date(),
      },
    }),
    prisma.reviewLog.create({
      data: {
        cardId,
        userId,
        sessionId,
        rating,
        scheduledDays: result.interval,
      },
    }),
    prisma.sessionQueue.update({
      where: { sessionId_cardId: { sessionId, cardId } },
      data: { ratedAt: new Date() },
    }),
    // Update session rating counters
    prisma.studySession.update({
      where: { id: sessionId },
      data: {
        cardsStudied: { increment: 1 },
        ratingAgain: rating === 'again' ? { increment: 1 } : undefined,
        ratingHard: rating === 'hard' ? { increment: 1 } : undefined,
        ratingGood: rating === 'good' ? { increment: 1 } : undefined,
        ratingEasy: rating === 'easy' ? { increment: 1 } : undefined,
      },
    }),
  ]);

  return {
    nextInterval: result.interval,
    nextDueDate: result.dueDate,
    state: result.state,
    easeFactor: result.easeFactor,
  };
}

export async function completeSession(sessionId: string, userId: string) {
  const session = await prisma.studySession.findFirst({
    where: { id: sessionId, userId },
    include: { queue: true },
  });
  if (!session) throw createError('Session not found', 404, 'NOT_FOUND');
  if (session.status === 'completed') {
    throw createError('Session already completed', 409, 'SESSION_LOCKED');
  }

  const now = new Date();
  const elapsed = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000); // seconds

  const updated = await prisma.studySession.update({
    where: { id: sessionId },
    data: { status: 'completed', endedAt: now },
  });

  // Next due date for the deck
  const nextDue = await prisma.cardProgress.findFirst({
    where: { userId, card: { deckId: session.deckId }, state: { notIn: ['new'] } },
    orderBy: { dueDate: 'asc' },
  });

  return {
    sessionId,
    cardsStudied: updated.cardsStudied,
    elapsedSeconds: elapsed,
    ratings: {
      again: updated.ratingAgain,
      hard: updated.ratingHard,
      good: updated.ratingGood,
      easy: updated.ratingEasy,
    },
    nextDueDate: nextDue?.dueDate ?? null,
  };
}

export async function abandonSession(sessionId: string, userId: string) {
  const session = await prisma.studySession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw createError('Session not found', 404, 'NOT_FOUND');
  if (session.status !== 'active') {
    throw createError('Session is not active', 409, 'SESSION_LOCKED');
  }

  // Abandon: preserve all already-rated CardProgress (no rollback), just mark status
  await prisma.studySession.update({
    where: { id: sessionId },
    data: { status: 'abandoned', endedAt: new Date() },
  });

  return { message: 'Session abandoned. Progress on rated cards has been preserved.' };
}

export async function getSessionSummary(sessionId: string, userId: string) {
  const session = await prisma.studySession.findFirst({
    where: { id: sessionId, userId },
    include: { deck: { select: { name: true } } },
  });
  if (!session) throw createError('Session not found', 404, 'NOT_FOUND');

  const elapsed = session.endedAt
    ? Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000)
    : null;

  return {
    sessionId,
    deckName: session.deck.name,
    status: session.status,
    cardsStudied: session.cardsStudied,
    elapsedSeconds: elapsed,
    ratings: {
      again: session.ratingAgain,
      hard: session.ratingHard,
      good: session.ratingGood,
      easy: session.ratingEasy,
    },
    startedAt: session.startedAt,
    endedAt: session.endedAt,
  };
}
