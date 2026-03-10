import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import { requireDeckOwnership } from '../../middleware/ownership.js';
import * as decksService from './decks.service.js';

const router = Router();

const CreateDeckSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const UpdateDeckSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

const CreateCardSchema = z.object({
  front: z.string().min(1).max(1000),
  back: z.string().min(1).max(1000),
  mediaUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
});

const UpdateCardSchema = z.object({
  front: z.string().min(1).max(1000).optional(),
  back: z.string().min(1).max(1000).optional(),
  mediaUrl: z.string().url().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

// ─── Decks ────────────────────────────────────────────────────────────────────

// GET /api/v1/decks
router.get('/', authenticate, async (req, res) => {
  const decks = await decksService.listDecks(req.user!.id);
  res.json({ data: decks });
});

// POST /api/v1/decks
router.post('/', authenticate, async (req, res) => {
  const { name, description } = CreateDeckSchema.parse(req.body);
  const deck = await decksService.createDeck(req.user!.id, name, description);
  res.status(201).json({ data: deck });
});

// GET /api/v1/decks/:id
router.get('/:id', authenticate, requireDeckOwnership, async (req, res) => {
  const deck = await decksService.getDeck(req.params.id, req.user!.id);
  res.json({ data: deck });
});

// PATCH /api/v1/decks/:id
router.patch('/:id', authenticate, requireDeckOwnership, async (req, res) => {
  const data = UpdateDeckSchema.parse(req.body);
  const deck = await decksService.updateDeck(req.params.id, req.user!.id, data as { name?: string; description?: string });
  res.json({ data: deck });
});

// DELETE /api/v1/decks/:id
router.delete('/:id', authenticate, requireDeckOwnership, async (req, res) => {
  await decksService.deleteDeck(req.params.id, req.user!.id);
  res.status(204).send();
});

// GET /api/v1/decks/:id/export — returns CSV
router.get('/:id/export', authenticate, requireDeckOwnership, async (req, res) => {
  const csv = await decksService.exportDeckAsCsv(req.params.id, req.user!.id);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="deck-${req.params.id}.csv"`);
  res.send(csv);
});

// ─── Cards ────────────────────────────────────────────────────────────────────

// GET /api/v1/decks/:id/cards
router.get('/:id/cards', authenticate, requireDeckOwnership, async (req, res) => {
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const cards = await decksService.listCards(req.params.id, req.user!.id, { state });
  res.json({ data: cards });
});

// POST /api/v1/decks/:id/cards
router.post('/:id/cards', authenticate, requireDeckOwnership, async (req, res) => {
  const { front, back, mediaUrl, tags } = CreateCardSchema.parse(req.body);
  const card = await decksService.createCard(req.params.id, req.user!.id, front, back, mediaUrl, tags);
  res.status(201).json({ data: card });
});

// GET /api/v1/decks/:id/cards/:cardId
router.get('/:id/cards/:cardId', authenticate, requireDeckOwnership, async (req, res) => {
  const card = await decksService.getCard(req.params.cardId, req.params.id, req.user!.id);
  res.json({ data: card });
});

// PATCH /api/v1/decks/:id/cards/:cardId
router.patch('/:id/cards/:cardId', authenticate, requireDeckOwnership, async (req, res) => {
  const data = UpdateCardSchema.parse(req.body);
  const card = await decksService.updateCard(req.params.cardId, req.params.id, req.user!.id, data as { front?: string; back?: string; mediaUrl?: string; tags?: string[] });
  res.json({ data: card });
});

// DELETE /api/v1/decks/:id/cards/:cardId
router.delete('/:id/cards/:cardId', authenticate, requireDeckOwnership, async (req, res) => {
  await decksService.deleteCard(req.params.cardId, req.params.id, req.user!.id);
  res.status(204).send();
});

// GET /api/v1/decks/:id/cards/:cardId/progress
router.get('/:id/cards/:cardId/progress', authenticate, requireDeckOwnership, async (req, res) => {
  const progress = await decksService.getCardProgress(req.params.cardId, req.user!.id);
  res.json({ data: progress });
});

export default router;
