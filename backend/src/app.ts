import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import multer from 'multer';

import authRoutes from './api/auth/auth.routes.js';
import decksRoutes from './api/decks/decks.routes.js';
import statsRoutes from './api/stats/stats.routes.js';
import sessionsRoutes from './api/sessions/sessions.routes.js';
import settingsRoutes from './api/settings/settings.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authenticate } from './middleware/auth.js';
import { requireDeckOwnership } from './middleware/ownership.js';
import { importCardsFromCsv } from './api/cards/import.service.js';
import { startReminderJob } from './lib/notifications/reminder.job.js';

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/decks', decksRoutes);
app.use('/api/v1/sessions', sessionsRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/notifications', settingsRoutes); // /notifications/subscribe lives in settings router

// ─── CSV Import ───────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are supported'));
    }
  },
});

app.post(
  '/api/v1/decks/:id/import',
  authenticate,
  requireDeckOwnership,
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: { code: 'MISSING_FILE', message: 'No file uploaded' } });
      return;
    }
    const result = await importCardsFromCsv(req.params.id, req.user!.id, req.file.buffer);
    res.json({ data: result });
  },
);

// ─── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3001);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.info(`[Server] Listening on http://localhost:${PORT}`);

    if (process.env.NODE_ENV === 'production') {
      startReminderJob();
    }
  });
}

export default app;
