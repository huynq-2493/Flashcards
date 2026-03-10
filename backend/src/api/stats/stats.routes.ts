import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireDeckOwnership } from '../../middleware/ownership.js';
import * as statsService from './stats.service.js';

const router = Router();

// GET /api/v1/stats/dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  const data = await statsService.getDashboardStats(req.user!.id);
  res.json({ data });
});

// GET /api/v1/stats/heatmap?days=90
router.get('/heatmap', authenticate, async (req, res) => {
  const days = Number(req.query.days) || 90;
  const data = await statsService.getHeatmap(req.user!.id, days);
  res.json({ data });
});

// GET /api/v1/stats/forecast?days=30
router.get('/forecast', authenticate, async (req, res) => {
  const days = Number(req.query.days) || 30;
  const data = await statsService.getForecast(req.user!.id, days);
  res.json({ data });
});

// GET /api/v1/stats/retention?days=30
router.get('/retention', authenticate, async (req, res) => {
  const days = Number(req.query.days) || 30;
  const data = await statsService.getRetentionTrend(req.user!.id, days);
  res.json({ data });
});

// GET /api/v1/decks/:id/stats — mounted under /api/v1/decks in app.ts
router.get('/:id/stats', authenticate, requireDeckOwnership, async (req, res) => {
  const data = await statsService.getDeckStats(req.params.id, req.user!.id);
  if (!data) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deck not found' } });
    return;
  }
  res.json({ data });
});

export default router;
