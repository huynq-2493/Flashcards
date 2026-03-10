import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import * as sessionsService from './sessions.service.js';

const router = Router();

const RatingSchema = z.object({
  cardId: z.string().uuid(),
  rating: z.enum(['again', 'hard', 'good', 'easy']),
});

// POST /api/v1/sessions — start a new session
router.post('/', authenticate, async (req, res) => {
  const { deckId } = z.object({ deckId: z.string().uuid() }).parse(req.body);
  const result = await sessionsService.createSession(req.user!.id, deckId);
  res.status(201).json({ data: result });
});

// GET /api/v1/sessions/:id/next-card — get next card (NEVER includes card.back)
router.get('/:id/next-card', authenticate, async (req, res) => {
  const result = await sessionsService.getNextCard(req.params.id, req.user!.id);
  res.json({ data: result });
});

// POST /api/v1/sessions/:id/rate — submit a rating
router.post('/:id/rate', authenticate, async (req, res) => {
  const { cardId, rating } = RatingSchema.parse(req.body);
  const result = await sessionsService.rateCard(req.params.id, cardId, rating as import('@prisma/client').Rating, req.user!.id);
  res.json({ data: result });
});

// POST /api/v1/sessions/:id/complete
router.post('/:id/complete', authenticate, async (req, res) => {
  const result = await sessionsService.completeSession(req.params.id, req.user!.id);
  res.json({ data: result });
});

// POST /api/v1/sessions/:id/abandon
router.post('/:id/abandon', authenticate, async (req, res) => {
  const result = await sessionsService.abandonSession(req.params.id, req.user!.id);
  res.json({ data: result });
});

// GET /api/v1/sessions/:id/summary
router.get('/:id/summary', authenticate, async (req, res) => {
  const result = await sessionsService.getSessionSummary(req.params.id, req.user!.id);
  res.json({ data: result });
});

export default router;
