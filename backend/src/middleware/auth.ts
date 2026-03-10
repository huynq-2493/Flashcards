import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;  // userId
  email: string;
  type: 'access' | 'refresh';
}

// Extend Express Request
declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; email: string };
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const payload = jwt.verify(token, secret) as JwtPayload;

    if (payload.type !== 'access') {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token type' } });
      return;
    }

    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (_err) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
}
