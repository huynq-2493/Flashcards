import { parse } from 'csv-parse/sync';
import prisma from '../../lib/prisma.js';
import { createError } from '../../middleware/errorHandler.js';
import { initCardProgress } from '../../lib/srs/sm2.js';

const MAX_IMPORT_ROWS = 500;

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function importCardsFromCsv(
  deckId: string,
  userId: string,
  csvBuffer: Buffer,
): Promise<ImportResult> {
  // Verify deck ownership
  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
  if (!deck) throw createError('Deck not found', 404, 'NOT_FOUND');

  let rows: Record<string, string>[];
  try {
    rows = parse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];
  } catch {
    throw createError('Invalid CSV format', 400, 'INVALID_CSV');
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    throw createError(`Maximum ${MAX_IMPORT_ROWS} cards per import`, 400, 'TOO_MANY_ROWS');
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const now = new Date();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const front = row['front']?.trim();
    const back = row['back']?.trim();

    if (!front || !back) {
      skipped++;
      errors.push(`Row ${i + 2}: missing 'front' or 'back' column`);
      continue;
    }

    if (front.length > 1000 || back.length > 1000) {
      skipped++;
      errors.push(`Row ${i + 2}: 'front' or 'back' exceeds 1000 characters`);
      continue;
    }

    const progressData = initCardProgress('placeholder', userId, now);

    try {
      await prisma.card.create({
        data: {
          deckId,
          front,
          back,
          tags: [],
          progress: {
            create: {
              userId,
              dueDate: progressData.dueDate,
              intervalDays: progressData.interval,
              easeFactor: progressData.easeFactor,
              repetitions: progressData.repetitions,
              state: progressData.state,
            },
          },
        },
      });
      imported++;
    } catch {
      skipped++;
      errors.push(`Row ${i + 2}: failed to create card`);
    }
  }

  return { imported, skipped, errors };
}
