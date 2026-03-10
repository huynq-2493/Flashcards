import prisma from '../../lib/prisma.js';

export async function getDashboardStats(userId: string) {
  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // Due today count
  const dueToday = await prisma.cardProgress.count({
    where: {
      userId,
      dueDate: { lte: today },
      state: { not: 'new' },
    },
  });

  // New cards available
  const newCards = await prisma.cardProgress.count({
    where: { userId, state: 'new' },
  });

  // Retention rate (last 30 days) — (hard+good+easy) / total reviews
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const recentLogs = await prisma.reviewLog.groupBy({
    by: ['rating'],
    where: { userId, reviewedAt: { gte: thirtyDaysAgo } },
    _count: { rating: true },
  });

  const ratingMap = Object.fromEntries(recentLogs.map((r) => [r.rating, r._count.rating]));
  const totalReviews = Object.values(ratingMap).reduce((a, b) => a + b, 0);
  const successfulReviews = (ratingMap['hard'] ?? 0) + (ratingMap['good'] ?? 0) + (ratingMap['easy'] ?? 0);
  const retentionRate = totalReviews > 0 ? Math.round((successfulReviews / totalReviews) * 100) : null;

  // Study streak — count consecutive days with at least one review
  const streak = await calculateStreak(userId);

  return { dueToday, newCards, retentionRate, streak, generatedAt: new Date() };
}

async function calculateStreak(userId: string): Promise<number> {
  // Get the user's timezone for local date grouping
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const timezone = settings?.timezone ?? 'UTC';

  // Get all review dates in user's timezone, most recent first
  const logs = await prisma.$queryRaw<{ review_date: string }[]>`
    SELECT DISTINCT
      TO_CHAR(
        "reviewed_at" AT TIME ZONE ${timezone},
        'YYYY-MM-DD'
      ) AS review_date
    FROM review_logs
    WHERE user_id = ${userId}
    ORDER BY review_date DESC
    LIMIT 365
  `;

  if (logs.length === 0) return 0;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Check if the user studied today or yesterday (to handle timezones)
  const latestReview = logs[0].review_date;
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (latestReview !== todayStr && latestReview !== yesterdayStr) {
    return 0; // streak broken
  }

  let streak = 0;
  const dateSet = new Set(logs.map((l) => l.review_date));

  const checkDate = new Date(latestReview);
  while (dateSet.has(checkDate.toISOString().slice(0, 10))) {
    streak++;
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  }

  return streak;
}

export async function getHeatmap(userId: string, days = 90) {
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - days);

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const timezone = settings?.timezone ?? 'UTC';

  const results = await prisma.$queryRaw<{ date: string; count: number }[]>`
    SELECT
      TO_CHAR("reviewed_at" AT TIME ZONE ${timezone}, 'YYYY-MM-DD') AS date,
      COUNT(*)::int AS count
    FROM review_logs
    WHERE user_id = ${userId}
      AND "reviewed_at" >= ${startDate}
    GROUP BY date
    ORDER BY date ASC
  `;

  return results;
}

export async function getForecast(userId: string, days = 30) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setUTCDate(endDate.getUTCDate() + days);

  const results = await prisma.$queryRaw<{ date: string; count: number }[]>`
    SELECT
      TO_CHAR("due_date", 'YYYY-MM-DD') AS date,
      COUNT(*)::int AS count
    FROM card_progress
    WHERE user_id = ${userId}
      AND "due_date" >= ${today}
      AND "due_date" <= ${endDate}
      AND state != 'new'
    GROUP BY date
    ORDER BY date ASC
  `;

  return results;
}

export async function getRetentionTrend(userId: string, days = 30) {
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - days);

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const timezone = settings?.timezone ?? 'UTC';

  const results = await prisma.$queryRaw<{ date: string; total: number; successful: number }[]>`
    SELECT
      TO_CHAR("reviewed_at" AT TIME ZONE ${timezone}, 'YYYY-MM-DD') AS date,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE rating IN ('hard', 'good', 'easy'))::int AS successful
    FROM review_logs
    WHERE user_id = ${userId}
      AND "reviewed_at" >= ${startDate}
    GROUP BY date
    ORDER BY date ASC
  `;

  return results.map((r) => ({
    date: r.date,
    total: r.total,
    successful: r.successful,
    rate: r.total > 0 ? Math.round((r.successful / r.total) * 100) : 0,
  }));
}

export async function getDeckStats(deckId: string, userId: string) {
  // Verify ownership
  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
  if (!deck) return null;

  const cardStates = await prisma.cardProgress.groupBy({
    by: ['state'],
    where: { userId, card: { deckId } },
    _count: { state: true },
  });

  const stateMap = Object.fromEntries(cardStates.map((s) => [s.state, s._count.state]));

  const totalCards = await prisma.card.count({ where: { deckId } });

  const lastSession = await prisma.studySession.findFirst({
    where: { userId, deckId, status: 'completed' },
    orderBy: { endedAt: 'desc' },
  });

  return {
    deckId,
    deckName: deck.name,
    totalCards,
    states: {
      new: stateMap['new'] ?? 0,
      learning: stateMap['learning'] ?? 0,
      review: stateMap['review'] ?? 0,
      relearning: stateMap['relearning'] ?? 0,
    },
    lastStudied: lastSession?.endedAt ?? null,
  };
}
