import { Request, Response, NextFunction } from 'express';
import { Deck } from '@prisma/client';
import prisma from '../lib/prisma.js';

// Extend Express Request with deck
declare module 'express-serve-static-core' {
  interface Request {
    deck?: Deck;
  }
}

export async function requireDeckOwnership(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.user?.id;
  const deckId = req.params.id || req.params.deckId;

  if (!userId) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  if (!deckId) {
    next();
    return;
  }

  const deck = await prisma.deck.findUnique({ where: { id: deckId } });

  if (!deck) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Deck not found' } });
    return;
  }

  if (deck.userId !== userId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied to this deck' } });
    return;
  }

  req.deck = deck;
  next();
}
