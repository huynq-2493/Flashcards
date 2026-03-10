import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';

const router = Router();

const UpdateSettingsSchema = z.object({
  dailyNewCardsLimit: z.number().int().min(1).max(200).optional(),
  dailyReviewLimit: z.number().int().min(1).max(500).optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reminderChannel: z.enum(['email', 'push']).optional(),
  timezone: z.string().min(1).optional(),
});

// GET /api/v1/settings
router.get('/', authenticate, async (req, res) => {
  const settings = await prisma.userSettings.upsert({
    where: { userId: req.user!.id },
    update: {},
    create: { userId: req.user!.id },
  });
  res.json({ data: settings });
});

// PATCH /api/v1/settings
router.patch('/', authenticate, async (req, res) => {
  const data = UpdateSettingsSchema.parse(req.body);
  const settings = await prisma.userSettings.upsert({
    where: { userId: req.user!.id },
    update: data,
    create: { userId: req.user!.id, ...data },
  });
  res.json({ data: settings });
});

// POST /api/v1/notifications/subscribe — Web Push subscription
router.post('/subscribe', authenticate, async (req, res) => {
  const SubscribeSchema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  });
  const subscription = SubscribeSchema.parse(req.body);

  await prisma.userSettings.upsert({
    where: { userId: req.user!.id },
    update: { webPushSubscription: subscription as object, reminderChannel: 'push' },
    create: { userId: req.user!.id, webPushSubscription: subscription as object, reminderChannel: 'push' },
  });

  res.json({ data: { message: 'Push subscription saved' } });
});

export default router;
