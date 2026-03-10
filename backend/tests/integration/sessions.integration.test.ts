/**
 * Session Integration Test
 * Tests the full session lifecycle via HTTP endpoints.
 * Requires a real database connection.
 *
 * Run with: DATABASE_URL=... npx vitest run tests/integration
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import app from '../../src/app.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

describe.skipIf(!process.env.DATABASE_URL)('Session Integration', () => {
  let authToken: string;
  let userId: string;
  let deckId: string;
  let sessionId: string;
  const cardIds: string[] = [];
  const testEmail = `test-session-${Date.now()}@test.com`;

  beforeAll(async () => {
    // Register a test user
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: 'testpassword' });
    expect(reg.status).toBe(201);
    authToken = reg.body.data.accessToken;
    userId = reg.body.data.user.id;

    // Create a deck
    const deckRes = await request(app)
      .post('/api/v1/decks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Deck', description: 'Integration test deck' });
    expect(deckRes.status).toBe(201);
    deckId = deckRes.body.data.id;

    // Create 3 cards
    for (let i = 0; i < 3; i++) {
      const cardRes = await request(app)
        .post(`/api/v1/decks/${deckId}/cards`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ front: `Front ${i + 1}`, back: `Back ${i + 1}` });
      expect(cardRes.status).toBe(201);
      cardIds.push(cardRes.body.data.id);
    }
  });

  afterAll(async () => {
    // Cleanup test user (cascades to all related data)
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  it('starts a session and gets a queue of 3 new cards', async () => {
    const res = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ deckId });
    expect(res.status).toBe(201);
    sessionId = res.body.data.sessionId;
    expect(sessionId).toBeTruthy();
    expect(res.body.data.totalCards).toBe(3);
  });

  it('next-card NEVER returns card.back', async () => {
    const res = await request(app)
      .get(`/api/v1/sessions/${sessionId}/next-card`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.done).toBe(false);
    expect(res.body.data.card).toBeDefined();
    expect(res.body.data.card.back).toBeUndefined(); // Constitutional rule FR-014
    expect(res.body.data.card.front).toBeTruthy();
  });

  it('rates all 3 cards with different ratings', async () => {
    const ratings = ['again', 'good', 'easy'];

    for (let i = 0; i < 3; i++) {
      // Get next card
      const nextRes = await request(app)
        .get(`/api/v1/sessions/${sessionId}/next-card`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(nextRes.status).toBe(200);

      if (nextRes.body.data.done) break;

      const cardId = nextRes.body.data.card.id;
      const rating = ratings[i % 3];

      const rateRes = await request(app)
        .post(`/api/v1/sessions/${sessionId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cardId, rating });
      expect(rateRes.status).toBe(200);
      expect(rateRes.body.data.nextInterval).toBeGreaterThanOrEqual(1);
      expect(rateRes.body.data.nextDueDate).toBeTruthy();
    }
  });

  it('verifies CardProgress was updated in the database', async () => {
    const progresses = await prisma.cardProgress.findMany({
      where: { userId, card: { deckId } },
    });
    expect(progresses.length).toBe(3);

    const ratedCards = progresses.filter((p) => p.state !== 'new');
    expect(ratedCards.length).toBeGreaterThan(0);

    // All rated cards should have lastReviewedAt set
    for (const p of ratedCards) {
      expect(p.lastReviewedAt).not.toBeNull();
    }
  });

  it('completes the session and returns a summary', async () => {
    // Exhaust remaining cards
    let attempts = 0;
    while (attempts < 10) {
      const nextRes = await request(app)
        .get(`/api/v1/sessions/${sessionId}/next-card`)
        .set('Authorization', `Bearer ${authToken}`);
      if (nextRes.body.data.done) break;
      const cardId = nextRes.body.data.card.id;
      await request(app)
        .post(`/api/v1/sessions/${sessionId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cardId, rating: 'good' });
      attempts++;
    }

    const completeRes = await request(app)
      .post(`/api/v1/sessions/${sessionId}/complete`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.cardsStudied).toBeGreaterThanOrEqual(3);
  });

  it('returns SESSION_LOCKED when rating a completed session', async () => {
    const rateRes = await request(app)
      .post(`/api/v1/sessions/${sessionId}/rate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ cardId: cardIds[0], rating: 'good' });
    expect(rateRes.status).toBe(409);
    expect(rateRes.body.error.code).toBe('SESSION_LOCKED');
  });

  it('can retrieve the session summary', async () => {
    const res = await request(app)
      .get(`/api/v1/sessions/${sessionId}/summary`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    const summary = res.body.data;
    expect(summary.status).toBe('completed');
    expect(summary.ratings).toHaveProperty('again');
    expect(summary.ratings).toHaveProperty('good');
    expect(summary.ratings).toHaveProperty('easy');
  });

  it('verifies ReviewLog entries were created', async () => {
    const logs = await prisma.reviewLog.findMany({
      where: { userId, session: { deckId } },
    });
    expect(logs.length).toBeGreaterThanOrEqual(3);

    // Each log must have scheduledDays > 0
    for (const log of logs) {
      expect(log.scheduledDays).toBeGreaterThanOrEqual(1);
    }
  });
});
