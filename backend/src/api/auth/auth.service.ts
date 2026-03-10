import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma.js';
import { createError } from '../../middleware/errorHandler.js';
import type { JwtPayload } from '../../middleware/auth.js';

const BCRYPT_ROUNDS = 12;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return secret;
}

function signAccessToken(userId: string, email: string): string {
  const payload: JwtPayload = { sub: userId, email, type: 'access' };
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'],
  });
}

function signRefreshToken(userId: string, email: string): string {
  const payload: JwtPayload = { sub: userId, email, type: 'refresh' };
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  });
}

export async function register(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw createError('Email already registered', 409, 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      settings: { create: {} }, // create default settings
    },
    select: { id: true, email: true, createdAt: true },
  });

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id, user.email);

  return { user, accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id, user.email);

  return {
    user: { id: user.id, email: user.email, createdAt: user.createdAt },
    accessToken,
    refreshToken,
  };
}

export async function refresh(refreshToken: string) {
  let payload: JwtPayload;
  try {
    payload = jwt.verify(refreshToken, getJwtSecret()) as JwtPayload;
  } catch {
    throw createError('Invalid or expired refresh token', 401, 'INVALID_TOKEN');
  }

  if (payload.type !== 'refresh') {
    throw createError('Invalid token type', 401, 'INVALID_TOKEN');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw createError('User not found', 401, 'INVALID_TOKEN');
  }

  const newAccessToken = signAccessToken(user.id, user.email);
  const newRefreshToken = signRefreshToken(user.id, user.email);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}
