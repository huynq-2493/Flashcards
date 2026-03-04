# Data Model: Flashcards Learning – SRS

**Phase**: 1 — Design
**Date**: 2026-03-04
**Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

---

## Entity Relationship Overview

```
User ──< Deck ──< Card ──< CardProgress
  │              │
  │              └──< SessionQueue
  │
  └──< StudySession ──< ReviewLog
              │
              └── (references Card)
```

---

## Prisma Schema

```prisma
// backend/src/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ──────────────────────────────────────────────
// User
// ──────────────────────────────────────────────
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String    @map("password_hash")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  settings     UserSettings?
  decks        Deck[]
  sessions     StudySession[]
  reviewLogs   ReviewLog[]
  cardProgress CardProgress[]

  @@map("users")
}

model UserSettings {
  id                  String   @id @default(uuid())
  userId              String   @unique @map("user_id")
  dailyNewCardsLimit  Int      @default(20) @map("daily_new_cards_limit")
  dailyReviewLimit    Int      @default(100) @map("daily_review_limit")
  reminderEnabled     Boolean  @default(false) @map("reminder_enabled")
  reminderTime        String   @default("08:00") @map("reminder_time") // HH:MM UTC
  reminderChannel     String   @default("email") @map("reminder_channel") // email | push
  timezone            String   @default("UTC")
  updatedAt           DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_settings")
}

// ──────────────────────────────────────────────
// Deck
// ──────────────────────────────────────────────
model Deck {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  name        String   @db.VarChar(100)
  description String?  @db.VarChar(500)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user     User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  cards    Card[]
  sessions StudySession[]

  @@index([userId])
  @@map("decks")
}

// ──────────────────────────────────────────────
// Card
// ──────────────────────────────────────────────
model Card {
  id        String   @id @default(uuid())
  deckId    String   @map("deck_id")
  front     String   @db.VarChar(1000)
  back      String   @db.VarChar(1000)
  mediaUrl  String?  @map("media_url")
  tags      String[] // PostgreSQL text array
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  deck          Deck           @relation(fields: [deckId], references: [id], onDelete: Cascade)
  progress      CardProgress[]
  reviewLogs    ReviewLog[]
  sessionQueues SessionQueue[]

  @@index([deckId])
  @@map("cards")
}

// ──────────────────────────────────────────────
// CardProgress  (one row per card × user)
// ──────────────────────────────────────────────
model CardProgress {
  id             String   @id @default(uuid())
  cardId         String   @map("card_id")
  userId         String   @map("user_id")
  dueDate        DateTime @map("due_date") @db.Date
  intervalDays   Int      @default(0) @map("interval_days")
  easeFactor     Float    @default(2.5) @map("ease_factor")
  repetitions    Int      @default(0)
  lastReviewedAt DateTime? @map("last_reviewed_at")
  state          CardState @default(new)

  card Card @relation(fields: [cardId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([cardId, userId])
  @@index([userId, dueDate])   // critical for due-card queue
  @@index([userId, state])
  @@map("card_progress")
}

enum CardState {
  new
  learning
  review
  relearning
}

// ──────────────────────────────────────────────
// StudySession
// ──────────────────────────────────────────────
model StudySession {
  id           String        @id @default(uuid())
  userId       String        @map("user_id")
  deckId       String        @map("deck_id")
  status       SessionStatus @default(active)
  startedAt    DateTime      @default(now()) @map("started_at")
  endedAt      DateTime?     @map("ended_at")
  cardsStudied Int           @default(0) @map("cards_studied")
  ratingAgain  Int           @default(0) @map("rating_again")
  ratingHard   Int           @default(0) @map("rating_hard")
  ratingGood   Int           @default(0) @map("rating_good")
  ratingEasy   Int           @default(0) @map("rating_easy")

  user       User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  deck       Deck           @relation(fields: [deckId], references: [id], onDelete: Cascade)
  reviewLogs ReviewLog[]
  queue      SessionQueue[]

  @@index([userId, status])
  @@map("study_sessions")
}

enum SessionStatus {
  active
  completed
  abandoned
}

// ──────────────────────────────────────────────
// SessionQueue  (snapshot of cards for this session)
// ──────────────────────────────────────────────
model SessionQueue {
  id        String    @id @default(uuid())
  sessionId String    @map("session_id")
  cardId    String    @map("card_id")
  position  Int       // display order in the session
  ratedAt   DateTime? @map("rated_at")

  session StudySession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  card    Card         @relation(fields: [cardId], references: [id], onDelete: Cascade)

  @@unique([sessionId, cardId])
  @@index([sessionId, ratedAt]) // quickly find unrated cards
  @@map("session_queue")
}

// ──────────────────────────────────────────────
// ReviewLog  (immutable audit log; stats source of truth)
// ──────────────────────────────────────────────
model ReviewLog {
  id            String   @id @default(uuid())
  cardId        String   @map("card_id")
  userId        String   @map("user_id")
  sessionId     String   @map("session_id")
  rating        Rating
  reviewedAt    DateTime @default(now()) @map("reviewed_at")
  scheduledDays Int      @map("scheduled_days") // resulting interval after this review

  card    Card         @relation(fields: [cardId], references: [id], onDelete: Cascade)
  user    User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  session StudySession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([userId, reviewedAt])  // critical for heatmap + retention rate queries
  @@index([cardId, reviewedAt])
  @@map("review_logs")
}

enum Rating {
  again
  hard
  good
  easy
}
```

---

## Entity Details

### `User`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK, auto-generated | |
| `email` | VARCHAR | UNIQUE, NOT NULL | Lowercase enforced at service layer |
| `password_hash` | TEXT | NOT NULL | bcrypt hash, cost factor 12 |
| `created_at` | TIMESTAMPTZ | NOT NULL, default NOW() | UTC |
| `updated_at` | TIMESTAMPTZ | NOT NULL, auto-update | UTC |

---

### `UserSettings` (1:1 with User)

| Field | Type | Default | Notes |
|---|---|---|---|
| `daily_new_cards_limit` | INT | 20 | Range: 1–200 |
| `daily_review_limit` | INT | 100 | Range: 1–500 |
| `reminder_enabled` | BOOLEAN | false | |
| `reminder_time` | VARCHAR(5) | `"08:00"` | HH:MM in user's timezone |
| `reminder_channel` | VARCHAR | `"email"` | `email` or `push` |
| `timezone` | VARCHAR | `"UTC"` | IANA timezone string |

Auto-created with defaults on first login (upsert pattern).

---

### `Deck`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → User, NOT NULL | Index for `GET /decks` query |
| `name` | VARCHAR(100) | NOT NULL | |
| `description` | VARCHAR(500) | NULLABLE | |
| `card_count` | — | Computed via `_count` | Not stored; avoids stale counter |
| `created_at` | TIMESTAMPTZ | NOT NULL | UTC |
| `updated_at` | TIMESTAMPTZ | NOT NULL | UTC |

---

### `Card`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `deck_id` | UUID | FK → Deck, NOT NULL | Index; cascade delete |
| `front` | VARCHAR(1000) | NOT NULL | Question / prompt side |
| `back` | VARCHAR(1000) | NOT NULL | Answer side; NEVER returned in next-card API |
| `media_url` | TEXT | NULLABLE | CDN URL for optional image |
| `tags` | TEXT[] | NOT NULL, default `{}` | PostgreSQL text array |
| `created_at` | TIMESTAMPTZ | NOT NULL | UTC |
| `updated_at` | TIMESTAMPTZ | NOT NULL | UTC |

---

### `CardProgress`

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `card_id` | UUID | FK → Card | UNIQUE with `user_id` |
| `user_id` | UUID | FK → User | UNIQUE with `card_id` |
| `due_date` | DATE | today | UTC date; display converts to local |
| `interval_days` | INT | 0 | Days until next review; 0 = new card |
| `ease_factor` | FLOAT | 2.5 | SM-2 multiplier; clamped [1.3, 2.5] |
| `repetitions` | INT | 0 | Consecutive successful reviews |
| `last_reviewed_at` | TIMESTAMPTZ | NULL | Set on every rating |
| `state` | ENUM | `new` | `new` \| `learning` \| `review` \| `relearning` |

**Unique constraint**: `(card_id, user_id)` — one progress record per card per user.
**Critical index**: `(user_id, due_date)` — powers the due-card queue query.

**Initialization** (called when a card is added to a deck the user owns):
```typescript
{
  due_date: today(),
  interval_days: 0,
  ease_factor: 2.5,
  repetitions: 0,
  state: 'new',
  last_reviewed_at: null
}
```

---

### `StudySession`

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → User | |
| `deck_id` | UUID | FK → Deck | |
| `status` | ENUM | `active` | `active` \| `completed` \| `abandoned` |
| `started_at` | TIMESTAMPTZ | NOW() | UTC |
| `ended_at` | TIMESTAMPTZ | NULL | Set on complete or abandon |
| `cards_studied` | INT | 0 | Incremented on each rating |
| `rating_again` | INT | 0 | Count of "again" ratings |
| `rating_hard` | INT | 0 | Count of "hard" ratings |
| `rating_good` | INT | 0 | Count of "good" ratings |
| `rating_easy` | INT | 0 | Count of "easy" ratings |

---

### `SessionQueue`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `session_id` | UUID | FK → StudySession |
| `card_id` | UUID | FK → Card |
| `position` | INT | Sort order for display |
| `rated_at` | TIMESTAMPTZ | NULL until rated; used to find next unrated card |

**Unique constraint**: `(session_id, card_id)` — prevents double-queuing.

---

### `ReviewLog`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `card_id` | UUID | FK → Card |
| `user_id` | UUID | FK → User |
| `session_id` | UUID | FK → StudySession |
| `rating` | ENUM | `again` \| `hard` \| `good` \| `easy` |
| `reviewed_at` | TIMESTAMPTZ | UTC; immutable after insert |
| `scheduled_days` | INT | Resulting interval after this review (for forecast queries) |

**Immutable**: rows are never updated after insert. This table is the source of truth for all historical statistics.

---

## State Transitions

### `CardProgress.state`

```
new
 │
 ├─ again ──→ relearning
 ├─ hard  ──→ learning
 ├─ good  ──→ learning (then review after next good)
 └─ easy  ──→ review

learning
 ├─ again ──→ relearning
 ├─ hard  ──→ learning
 ├─ good  ──→ review
 └─ easy  ──→ review

review
 ├─ again ──→ relearning
 ├─ hard  ──→ review (reduced interval)
 ├─ good  ──→ review (normal interval)
 └─ easy  ──→ review (extended interval)

relearning
 ├─ again ──→ relearning
 ├─ hard  ──→ review
 ├─ good  ──→ review
 └─ easy  ──→ review
```

### `StudySession.status`

```
active ──→ completed
       └─→ abandoned
```

---

## Validation Rules

| Entity | Field | Rule |
|---|---|---|
| Deck | `name` | Required; 1–100 characters; stripped of leading/trailing whitespace |
| Deck | `description` | Optional; max 500 characters |
| Card | `front` | Required; 1–1000 characters |
| Card | `back` | Required; 1–1000 characters |
| Card | `media_url` | Optional; must be a valid HTTPS URL if present |
| CardProgress | `ease_factor` | Clamped to [1.3, 2.5] after every rating |
| CardProgress | `interval_days` | Minimum 1 (after first review); maximum 365 |
| UserSettings | `daily_new_cards_limit` | Integer in [1, 200] |
| UserSettings | `daily_review_limit` | Integer in [1, 500] |
| UserSettings | `reminder_time` | Matches `HH:MM` pattern |
| UserSettings | `timezone` | Valid IANA timezone string |
