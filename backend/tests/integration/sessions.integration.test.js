"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Session Integration Test
 * Tests the full session lifecycle via HTTP endpoints.
 * Requires a real database connection.
 *
 * Run with: DATABASE_URL=... npx vitest run tests/integration
 */
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = __importDefault(require("pg"));
const app_js_1 = __importDefault(require("../../src/app.js"));
const pool = new pg_1.default.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
vitest_1.describe.skipIf(!process.env.DATABASE_URL)('Session Integration', () => {
    let authToken;
    let userId;
    let deckId;
    let sessionId;
    const cardIds = [];
    const testEmail = `test-session-${Date.now()}@test.com`;
    (0, vitest_1.beforeAll)(async () => {
        // Register a test user
        const reg = await (0, supertest_1.default)(app_js_1.default)
            .post('/api/v1/auth/register')
            .send({ email: testEmail, password: 'testpassword' });
        (0, vitest_1.expect)(reg.status).toBe(201);
        authToken = reg.body.data.accessToken;
        userId = reg.body.data.user.id;
        // Create a deck
        const deckRes = await (0, supertest_1.default)(app_js_1.default)
            .post('/api/v1/decks')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ name: 'Test Deck', description: 'Integration test deck' });
        (0, vitest_1.expect)(deckRes.status).toBe(201);
        deckId = deckRes.body.data.id;
        // Create 3 cards
        for (let i = 0; i < 3; i++) {
            const cardRes = await (0, supertest_1.default)(app_js_1.default)
                .post(`/api/v1/decks/${deckId}/cards`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ front: `Front ${i + 1}`, back: `Back ${i + 1}` });
            (0, vitest_1.expect)(cardRes.status).toBe(201);
            cardIds.push(cardRes.body.data.id);
        }
    });
    (0, vitest_1.afterAll)(async () => {
        // Cleanup test user (cascades to all related data)
        await prisma.user.deleteMany({ where: { email: testEmail } });
        await prisma.$disconnect();
    });
    (0, vitest_1.it)('starts a session and gets a queue of 3 new cards', async () => {
        const res = await (0, supertest_1.default)(app_js_1.default)
            .post('/api/v1/sessions')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ deckId });
        (0, vitest_1.expect)(res.status).toBe(201);
        sessionId = res.body.data.sessionId;
        (0, vitest_1.expect)(sessionId).toBeTruthy();
        (0, vitest_1.expect)(res.body.data.totalCards).toBe(3);
    });
    (0, vitest_1.it)('next-card NEVER returns card.back', async () => {
        const res = await (0, supertest_1.default)(app_js_1.default)
            .get(`/api/v1/sessions/${sessionId}/next-card`)
            .set('Authorization', `Bearer ${authToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.data.done).toBe(false);
        (0, vitest_1.expect)(res.body.data.card).toBeDefined();
        (0, vitest_1.expect)(res.body.data.card.back).toBeUndefined(); // Constitutional rule FR-014
        (0, vitest_1.expect)(res.body.data.card.front).toBeTruthy();
    });
    (0, vitest_1.it)('rates all 3 cards with different ratings', async () => {
        const ratings = ['again', 'good', 'easy'];
        for (let i = 0; i < 3; i++) {
            // Get next card
            const nextRes = await (0, supertest_1.default)(app_js_1.default)
                .get(`/api/v1/sessions/${sessionId}/next-card`)
                .set('Authorization', `Bearer ${authToken}`);
            (0, vitest_1.expect)(nextRes.status).toBe(200);
            if (nextRes.body.data.done)
                break;
            const cardId = nextRes.body.data.card.id;
            const rating = ratings[i % 3];
            const rateRes = await (0, supertest_1.default)(app_js_1.default)
                .post(`/api/v1/sessions/${sessionId}/rate`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ cardId, rating });
            (0, vitest_1.expect)(rateRes.status).toBe(200);
            (0, vitest_1.expect)(rateRes.body.data.nextInterval).toBeGreaterThanOrEqual(1);
            (0, vitest_1.expect)(rateRes.body.data.nextDueDate).toBeTruthy();
        }
    });
    (0, vitest_1.it)('verifies CardProgress was updated in the database', async () => {
        const progresses = await prisma.cardProgress.findMany({
            where: { userId, card: { deckId } },
        });
        (0, vitest_1.expect)(progresses.length).toBe(3);
        const ratedCards = progresses.filter((p) => p.state !== 'new');
        (0, vitest_1.expect)(ratedCards.length).toBeGreaterThan(0);
        // All rated cards should have lastReviewedAt set
        for (const p of ratedCards) {
            (0, vitest_1.expect)(p.lastReviewedAt).not.toBeNull();
        }
    });
    (0, vitest_1.it)('completes the session and returns a summary', async () => {
        // Exhaust remaining cards
        let attempts = 0;
        while (attempts < 10) {
            const nextRes = await (0, supertest_1.default)(app_js_1.default)
                .get(`/api/v1/sessions/${sessionId}/next-card`)
                .set('Authorization', `Bearer ${authToken}`);
            if (nextRes.body.data.done)
                break;
            const cardId = nextRes.body.data.card.id;
            await (0, supertest_1.default)(app_js_1.default)
                .post(`/api/v1/sessions/${sessionId}/rate`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ cardId, rating: 'good' });
            attempts++;
        }
        const completeRes = await (0, supertest_1.default)(app_js_1.default)
            .post(`/api/v1/sessions/${sessionId}/complete`)
            .set('Authorization', `Bearer ${authToken}`);
        (0, vitest_1.expect)(completeRes.status).toBe(200);
        (0, vitest_1.expect)(completeRes.body.data.cardsStudied).toBeGreaterThanOrEqual(3);
    });
    (0, vitest_1.it)('returns SESSION_LOCKED when rating a completed session', async () => {
        const rateRes = await (0, supertest_1.default)(app_js_1.default)
            .post(`/api/v1/sessions/${sessionId}/rate`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ cardId: cardIds[0], rating: 'good' });
        (0, vitest_1.expect)(rateRes.status).toBe(409);
        (0, vitest_1.expect)(rateRes.body.error.code).toBe('SESSION_LOCKED');
    });
    (0, vitest_1.it)('can retrieve the session summary', async () => {
        const res = await (0, supertest_1.default)(app_js_1.default)
            .get(`/api/v1/sessions/${sessionId}/summary`)
            .set('Authorization', `Bearer ${authToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        const summary = res.body.data;
        (0, vitest_1.expect)(summary.status).toBe('completed');
        (0, vitest_1.expect)(summary.ratings).toHaveProperty('again');
        (0, vitest_1.expect)(summary.ratings).toHaveProperty('good');
        (0, vitest_1.expect)(summary.ratings).toHaveProperty('easy');
    });
    (0, vitest_1.it)('verifies ReviewLog entries were created', async () => {
        const logs = await prisma.reviewLog.findMany({
            where: { userId, session: { deckId } },
        });
        (0, vitest_1.expect)(logs.length).toBeGreaterThanOrEqual(3);
        // Each log must have scheduledDays > 0
        for (const log of logs) {
            (0, vitest_1.expect)(log.scheduledDays).toBeGreaterThanOrEqual(1);
        }
    });
});
//# sourceMappingURL=sessions.integration.test.js.map