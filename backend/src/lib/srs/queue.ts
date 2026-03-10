import { PrismaClient } from '@prisma/client';

/**
 * Get due cards for a study session.
 * Priority order: overdue → due today → new cards (up to limit)
 */
export async function getDueCards(
  prisma: PrismaClient,
  userId: string,
  deckId: string,
  dailyNewLimit: number,
): Promise<{ id: string; front: string; back: string; deckId: string }[]> {
  const today = new Date();
  today.setUTCHours(23, 59, 59, 999); // end of today

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // Overdue and due-today cards from CardProgress
  const dueProgress = await prisma.cardProgress.findMany({
    where: {
      userId,
      card: { deckId },
      dueDate: { lte: today },
      state: { notIn: ['new'] },
    },
    orderBy: { dueDate: 'asc' }, // oldest overdue first
    include: { card: { select: { id: true, front: true, back: true, deckId: true } } },
  });

  // New cards (up to daily limit)
  const newProgress = await prisma.cardProgress.findMany({
    where: {
      userId,
      card: { deckId },
      state: 'new',
    },
    take: dailyNewLimit,
    orderBy: { id: 'asc' }, // stable ordering for new cards
    include: { card: { select: { id: true, front: true, back: true, deckId: true } } },
  });

  const allProgress = [...dueProgress, ...newProgress];
  return allProgress.map((p) => p.card);
}
