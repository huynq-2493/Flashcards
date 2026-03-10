import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';
import { initCardProgress } from '../lib/srs/sm2.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const USERS = [
  { email: 'alice@test.com', password: 'password123' },
  { email: 'bob@test.com', password: 'password123' },
];

const DECKS_PER_USER = [
  { name: 'Japanese Vocabulary', description: 'JLPT N5 core vocabulary' },
  { name: 'Capital Cities', description: 'World capitals — 195 countries' },
  { name: 'JavaScript Concepts', description: 'Core JS/TS concepts' },
];

const CARDS_PER_DECK = [
  { front: '犬 (inu)', back: 'Dog' },
  { front: '猫 (neko)', back: 'Cat' },
  { front: '魚 (sakana)', back: 'Fish' },
  { front: '水 (mizu)', back: 'Water' },
  { front: '火 (hi)', back: 'Fire' },
  { front: 'France', back: 'Paris' },
  { front: 'Germany', back: 'Berlin' },
  { front: 'Japan', back: 'Tokyo' },
  { front: 'Brazil', back: 'Brasília' },
  { front: 'Australia', back: 'Canberra' },
];

async function main() {
  // eslint-disable-next-line no-console
  console.log('🌱 Seeding database...');

  for (const userData of USERS) {
    const passwordHash = await bcrypt.hash(userData.password, 12);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        passwordHash,
        settings: { create: {} },
      },
    });

    // eslint-disable-next-line no-console
    console.log(`  ✓ User: ${user.email}`);

    for (const deckData of DECKS_PER_USER) {
      const deck = await prisma.deck.upsert({
        where: { id: `${user.id}-${deckData.name}`.slice(0, 36) },
        update: {},
        create: {
          userId: user.id,
          name: deckData.name,
          description: deckData.description,
        },
      });

      const now = new Date();
      const progressData = initCardProgress('placeholder', user.id, now);

      for (const cardData of CARDS_PER_DECK) {
        const existing = await prisma.card.findFirst({
          where: { deckId: deck.id, front: cardData.front },
        });

        if (!existing) {
          await prisma.card.create({
            data: {
              deckId: deck.id,
              front: cardData.front,
              back: cardData.back,
              tags: [],
              progress: {
                create: {
                  userId: user.id,
                  dueDate: progressData.dueDate,
                  intervalDays: progressData.interval,
                  easeFactor: progressData.easeFactor,
                  repetitions: progressData.repetitions,
                  state: progressData.state,
                },
              },
            },
          });
        }
      }

      // eslint-disable-next-line no-console
      console.log(`    ✓ Deck: "${deck.name}" with ${CARDS_PER_DECK.length} cards`);
    }
  }

  // eslint-disable-next-line no-console
  console.log('\n✅ Seed complete!');
  // eslint-disable-next-line no-console
  console.log('   alice@test.com / password123');
  // eslint-disable-next-line no-console
  console.log('   bob@test.com   / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
