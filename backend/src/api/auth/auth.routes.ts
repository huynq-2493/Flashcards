import { Router } from 'express';
import { z } from 'zod';
import * as authService from './auth.service.js';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
  const { email, password } = RegisterSchema.parse(req.body);
  const result = await authService.register(email, password);
  res.status(201).json({ data: result });
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = LoginSchema.parse(req.body);
  const result = await authService.login(email, password);
  res.json({ data: result });
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = RefreshSchema.parse(req.body);
  const result = await authService.refresh(refreshToken);
  res.json({ data: result });
});

// POST /api/v1/auth/logout — stateless JWT; client discards tokens
router.post('/logout', (_req, res) => {
  res.json({ data: { message: 'Logged out' } });
});

export default router;
