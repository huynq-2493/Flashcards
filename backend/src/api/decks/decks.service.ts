import prisma from '../../lib/prisma.js';
import { createError } from '../../middleware/errorHandler.js';
import { initCardProgress } from '../../lib/srs/sm2.js';

// ─── Decks ───────────────────────────────────────────────────────────────────

export async function listDecks(userId: string) {
  return prisma.deck.findMany({
    where: { userId },
    include: { _count: { select: { cards: true } } },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function createDeck(userId: string, name: string, description?: string) {
  return prisma.deck.create({
    data: { userId, name, description },
    include: { _count: { select: { cards: true } } },
  });
}

export async function getDeck(id: string, userId: string) {
  const deck = await prisma.deck.findFirst({
    where: { id, userId },
    include: { _count: { select: { cards: true } } },
  });
  if (!deck) throw createError('Deck not found', 404, 'NOT_FOUND');
  return deck;
}

export async function updateDeck(id: string, userId: string, data: { name?: string; description?: string }) {
  const deck = await prisma.deck.findFirst({ where: { id, userId } });
  if (!deck) throw createError('Deck not found', 404, 'NOT_FOUND');
  return prisma.deck.update({
    where: { id },
    data,
    include: { _count: { select: { cards: true } } },
  });
}

export async function deleteDeck(id: string, userId: string) {
  const deck = await prisma.deck.findFirst({ where: { id, userId } });
  if (!deck) throw createError('Deck not found', 404, 'NOT_FOUND');
  // Cascade delete handled by Prisma schema (onDelete: Cascade)
  await prisma.deck.delete({ where: { id } });
}

export async function exportDeckAsCsv(id: string, userId: string): Promise<string> {
  const deck = await prisma.deck.findFirst({
    where: { id, userId },
    include: { cards: { select: { front: true, back: true } } },
  });
  if (!deck) throw createError('Deck not found', 404, 'NOT_FOUND');

  const lines = ['front,back'];
  for (const card of deck.cards) {
    const front = `"${card.front.replace(/"/g, '""')}"`;
    const back = `"${card.back.replace(/"/g, '""')}"`;
    lines.push(`${front},${back}`);
  }
  return lines.join('\n');
}

// ─── Cards ────────────────────────────────────────────────────────────────────

export async function listCards(
  deckId: string,
  userId: string,
  filters?: { state?: string },
) {
  // Verify ownership first
  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
  if (!deck) throw createError('Deck not found', 404, 'NOT_FOUND');

  return prisma.card.findMany({
    where: {
      deckId,
      ...(filters?.state
        ? { progress: { some: { userId, state: filters.state as 'new' | 'learning' | 'review' | 'relearning' } } }
        : {}),
    },
    include: {
      progress: { where: { userId }, select: { state: true, dueDate: true, intervalDays: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createCard(
  deckId: string,
  userId: string,
  front: string,
  back: string,
  mediaUrl?: string,
  tags?: string[],
) {
  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
  if (!deck) throw createError('Deck not found', 404, 'NOT_FOUND');

  const now = new Date();
  const progressData = initCardProgress('placeholder', userId, now);

  const card = await prisma.card.create({
    data: {
      deckId,
      front,
      back,
      mediaUrl,
      tags: tags ?? [],
      progress: {
        create: {
          userId,
          dueDate: progressData.dueDate,
          intervalDays: progressData.interval,
          easeFactor: progressData.easeFactor,
          repetitions: progressData.repetitions,
          state: progressData.state,
        },
      },
    },
    include: {
      progress: { where: { userId } },
    },
  });

  return card;
}

export async function getCard(cardId: string, deckId: string, userId: string) {
  const card = await prisma.card.findFirst({
    where: { id: cardId, deckId, deck: { userId } },
    include: { progress: { where: { userId } } },
  });
  if (!card) throw createError('Card not found', 404, 'NOT_FOUND');
  return card;
}

export async function updateCard(
  cardId: string,
  deckId: string,
  userId: string,
  data: { front?: string; back?: string; mediaUrl?: string; tags?: string[] },
) {
  const card = await prisma.card.findFirst({
    where: { id: cardId, deckId, deck: { userId } },
  });
  if (!card) throw createError('Card not found', 404, 'NOT_FOUND');
  return prisma.card.update({ where: { id: cardId }, data });
}

export async function deleteCard(cardId: string, deckId: string, userId: string) {
  const card = await prisma.card.findFirst({
    where: { id: cardId, deckId, deck: { userId } },
  });
  if (!card) throw createError('Card not found', 404, 'NOT_FOUND');
  await prisma.card.delete({ where: { id: cardId } });
}

export async function getCardProgress(cardId: string, userId: string) {
  const progress = await prisma.cardProgress.findUnique({
    where: { cardId_userId: { cardId, userId } },
  });
  if (!progress) throw createError('Card progress not found', 404, 'NOT_FOUND');
  return progress;
}
