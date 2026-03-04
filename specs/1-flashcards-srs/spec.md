# Feature Specification: Flashcards Learning – Spaced Repetition System

**Feature Branch**: `1-flashcards-srs`
**Created**: 2026-03-04
**Status**: Draft
**Constitution**: [.specify/memory/constitution.md](../../.specify/memory/constitution.md)

---

## User Scenarios & Testing *(mandatory)*

---

### User Story 1 — First Study Session (Priority: P1)

A new user registers, creates their first Deck, adds at least one Card, and completes a full study session by rating each card. This is the entire core loop of the application.

**Why this priority**: Without the ability to study cards, the product has no value. All other features exist to support or enhance this loop.

**Independent Test**: Can be fully tested by registering a new account, creating one deck with 3 cards, starting a session, rating each card, and reaching the Session Summary screen — delivering the core SRS value end-to-end.

**Acceptance Scenarios**:

1. **Given** a registered user with a deck containing 3 new cards, **When** they start a study session, **Then** each card is shown one at a time starting with the front side only.
2. **Given** a card is displayed front-side up, **When** the user taps "Show Answer", **Then** the back side is revealed and the four rating buttons (Again / Hard / Good / Easy) become visible.
3. **Given** the user submits a rating, **When** the rating is processed, **Then** the card's next review date is updated according to the SM-2 algorithm and the next card is shown immediately.
4. **Given** all cards in the session have been rated, **When** the last card is rated, **Then** the Session Summary screen is shown with the count of cards studied and a breakdown by rating.
5. **Given** a session has ended, **When** the user views their deck, **Then** the cards are no longer listed as "due today" (they have scheduled future review dates).

---

### User Story 2 — Deck and Card Management (Priority: P1)

A user creates, edits, and organises their Decks and Cards to build a personalised study library.

**Why this priority**: Without content (Decks and Cards), there is nothing to study. This is a prerequisite for the core loop.

**Independent Test**: Can be fully tested by creating a deck, adding 5 cards with front/back content, editing one card's text, deleting one card, and verifying the deck shows 4 cards.

**Acceptance Scenarios**:

1. **Given** an authenticated user on the Deck List screen, **When** they submit the Create Deck form with a name, **Then** a new deck appears in their deck list with 0 cards.
2. **Given** a deck exists, **When** the user adds a card with front and back text, **Then** the card appears in the deck's card list and the deck's `card_count` increments by 1.
3. **Given** a card exists, **When** the user edits the card's front or back text and saves, **Then** the card displays the updated content and the previous content is no longer shown.
4. **Given** a card exists, **When** the user confirms deletion, **Then** the card is permanently removed and the deck's `card_count` decrements by 1.
5. **Given** an authenticated user, **When** they attempt to access another user's deck by manipulating the URL, **Then** they receive a 403 Forbidden response and are redirected to their own deck list.

---

### User Story 3 — Spaced Repetition Scheduling (Priority: P1)

The system automatically calculates and schedules the next review date for each card based on the user's rating, implementing the SM-2 algorithm.

**Why this priority**: Correct scheduling is the product's core value proposition. Without it, the app is just a random flashcard quiz, not a spaced repetition system.

**Independent Test**: Can be fully tested by creating a card, rating it "Good" (interval should become 1 day), rating it "Good" again the next day (interval multiplied by ease factor ≈ 2.5 days), and verifying the due dates match SM-2 formula outputs.

**Acceptance Scenarios**:

1. **Given** a new card (never reviewed), **When** the user rates it "Again", **Then** `interval = 1 day`, `ease_factor` decreases by 0.20 (min 1.3), `state = relearning`, `due_date = today + 1`.
2. **Given** a new card, **When** the user rates it "Good", **Then** `interval = 1 day`, `repetitions = 1`, `state = learning`, `due_date = today + 1`.
3. **Given** a card in `review` state with `interval = 4` and `ease_factor = 2.5`, **When** rated "Good", **Then** `interval = 4 × 2.5 = 10 days`, `due_date = today + 10`.
4. **Given** a card in `review` state, **When** rated "Easy", **Then** `interval = interval × ease_factor × 1.3`, `ease_factor += 0.15` (max 2.5).
5. **Given** a card's `ease_factor` is at 1.3 (minimum), **When** rated "Again", **Then** `ease_factor` stays at 1.3 and does not decrease further.
6. **Given** a user opens a study session, **When** the due card queue is built, **Then** overdue cards appear first, followed by cards due today, followed by new cards (up to the daily new card limit).

---

### User Story 4 — Progress & Statistics (Priority: P2)

A user monitors their learning progress through statistics including retention rate, study streak, and card maturity distribution.

**Why this priority**: Statistics motivate continued usage and help users identify weak areas. Important for retention but the core loop works without it.

**Independent Test**: Can be fully tested by completing 5 study sessions over 3 days and verifying that the dashboard shows the correct due count, streak, and that the heatmap reflects study activity on those dates.

**Acceptance Scenarios**:

1. **Given** a user has completed at least one session, **When** they view the Dashboard, **Then** they see today's due card count, current study streak (days), and overall retention rate as a percentage.
2. **Given** a user has reviewed cards over the past 30 days, **When** they view the Statistics screen, **Then** a calendar heatmap correctly highlights each day they studied.
3. **Given** a deck with cards in various states, **When** the user views Deck Statistics, **Then** they see the count of cards in each state: New, Learning, Review, Relearning.
4. **Given** a user rates cards "Again" on 2 out of 10 reviews in a 30-day window, **When** they view retention rate, **Then** retention rate is displayed as 80%.
5. **Given** a user studies 5 days in a row and then misses a day, **When** they view the Dashboard, **Then** the streak resets to 0 and a missed-day indicator appears on the heatmap.

---

### User Story 5 — Bulk Card Import (Priority: P2)

A user imports many cards at once from a CSV file to quickly populate a deck.

**Why this priority**: Reduces the friction of creating large decks (100+ cards). Highly requested by language learners and students, but not required for the core loop.

**Independent Test**: Can be fully tested by uploading a 10-row CSV with `front,back` columns, verifying all 10 cards are created in the deck, and testing a malformed CSV to verify error feedback.

**Acceptance Scenarios**:

1. **Given** a valid CSV file with `front` and `back` columns and 10 rows, **When** the user uploads it to a deck, **Then** 10 cards are created and the deck's `card_count` increases by 10.
2. **Given** a CSV with some rows missing the `back` column, **When** the user uploads it, **Then** valid rows are imported, invalid rows are skipped, and the user is shown a summary: "8 imported, 2 skipped".
3. **Given** a non-CSV file (e.g., `.docx`), **When** the user attempts to upload it, **Then** an error message is shown: "Only CSV files are supported."
4. **Given** a CSV with more than 500 rows, **When** the user uploads it, **Then** an error is shown: "Maximum 500 cards per import."

---

### User Story 6 — Notifications & Reminders (Priority: P3)

A user receives a daily reminder to study when they have cards due.

**Why this priority**: Improves habit formation and daily retention but is non-critical for the core product functionality.

**Independent Test**: Can be fully tested by enabling reminders at a set time, waiting for that time, and verifying the notification arrives only when due cards exist.

**Acceptance Scenarios**:

1. **Given** a user has enabled reminders and has due cards, **When** the scheduled time arrives, **Then** a notification is sent via the user's chosen channel (browser push or email).
2. **Given** a user has enabled reminders but has no due cards for the day, **When** the scheduled time arrives, **Then** no notification is sent.
3. **Given** a user has disabled reminders, **When** the scheduled time arrives, **Then** no notification is sent regardless of due card count.

---

### Edge Cases

- What happens when a session is started and the user closes the browser mid-session? → Session remains in `started` state; on next visit, the user is prompted to resume or abandon.
- What happens when a deck has 0 due cards and the user tries to start a session? → A message is shown: "Nothing due today. Come back tomorrow!" with the next scheduled due date.
- What if `ease_factor` would drop below 1.3? → It is clamped to exactly 1.3; it never goes lower.
- What if two sessions are started for the same deck simultaneously (e.g., two browser tabs)? → The second start returns the existing open session ID, not a new session.
- What if a card is deleted while a session is in progress and that card hasn't been rated yet? → The card is skipped gracefully; the session continues with the remaining cards.
- What happens if a user imports a CSV with duplicate card fronts? → Duplicates are imported as separate cards (no deduplication in v1); a warning is shown.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Deck Management
- **FR-001**: System MUST allow authenticated users to create a Deck with a name (required, max 100 chars) and optional description (max 500 chars).
- **FR-002**: System MUST allow users to edit the name and description of their own Decks.
- **FR-003**: System MUST allow users to delete their own Decks; deletion MUST cascade-delete all associated Cards, CardProgress records, and ReviewLogs.
- **FR-004**: System MUST display a real-time `card_count` for each Deck.
- **FR-005**: System MUST allow users to export a Deck as a CSV file (`front,back` columns).
- **FR-006**: System MUST enforce that users can only access, modify, or delete their own Decks (ownership validation on every mutation).

#### Card Management
- **FR-007**: System MUST allow users to create a Card within a Deck with `front` (required, max 1000 chars) and `back` (required, max 1000 chars) fields.
- **FR-008**: System MUST allow users to attach a single image to a Card (`media_url`); supported formats: JPG, PNG, GIF, WebP; max size 5MB.
- **FR-009**: System MUST allow users to assign comma-separated tags to a Card.
- **FR-010**: System MUST allow bulk import of Cards into a Deck via CSV file (max 500 rows per import).
- **FR-011**: System MUST allow users to edit and delete their own Cards.

#### Study Session
- **FR-012**: System MUST allow a user to start a Study Session for a specific Deck.
- **FR-013**: System MUST serve cards in priority order: overdue → due today → new cards (up to the daily new card limit defined in settings).
- **FR-014**: The next-card API MUST return only `card.front` — never `card.back` — until the user explicitly requests the answer reveal.
- **FR-015**: System MUST accept a rating (again/hard/good/easy) for each card and immediately update `CardProgress` and insert a `ReviewLog` entry within a single database transaction.
- **FR-016**: System MUST return the next card within 500ms of receiving a rating.
- **FR-017**: System MUST generate a Session Summary when all queued cards have been rated, showing: total cards studied, time elapsed, count per rating, and next scheduled review date for the deck.
- **FR-018**: System MUST allow a user to abandon an in-progress session; progress on already-rated cards within that session MUST be preserved.

#### SRS Scheduling
- **FR-019**: System MUST implement the SM-2 algorithm as a pure, stateless function with inputs `(CardProgress, Rating)` and output `ReviewResult`.
- **FR-020**: System MUST initialize `CardProgress` for every new Card with: `interval = 0`, `ease_factor = 2.5`, `repetitions = 0`, `state = new`, `due_date = today`.
- **FR-021**: System MUST clamp `ease_factor` to a minimum of 1.3 and a maximum of 2.5 after every rating.
- **FR-022**: System MUST store all timestamps in UTC and convert to the user's local timezone for display only.

#### Statistics
- **FR-023**: System MUST calculate and display the user's current study streak (consecutive days with at least one card reviewed).
- **FR-024**: System MUST calculate retention rate as: `(reviews rated hard/good/easy) / (total reviews)` over the last 30 days, displayed as a percentage.
- **FR-025**: System MUST display a 30-day study activity heatmap using `ReviewLog.reviewed_at` data.
- **FR-026**: System MUST display card maturity distribution per Deck: count of cards in each `CardProgress.state` (new, learning, review, relearning).

#### Settings
- **FR-027**: System MUST allow users to configure a daily new card limit (default: 20, range: 1–200).
- **FR-028**: System MUST allow users to configure a daily maximum review limit (default: 100, range: 1–500).
- **FR-029**: System MUST allow users to enable/disable daily study reminders and set a preferred reminder time.
- **FR-030**: System MUST allow users to choose their reminder channel: browser push notification or email.

### Key Entities

- **User**: Represents an authenticated account. Owns all Decks and study progress. Has configurable settings for daily limits and reminders.
- **Deck**: A named collection of Cards belonging to one User. Tracks a live `card_count`. Can be studied in a Session.
- **Card**: A single flashcard with a front (question) and back (answer), optionally with an image and tags. Belongs to exactly one Deck.
- **CardProgress**: The SRS scheduling state for one Card for one User. Contains all variables required to run the SM-2 algorithm: `interval`, `ease_factor`, `repetitions`, `state`, `due_date`. One record per (card, user) pair.
- **StudySession**: Represents one sitting of studying. Has a lifecycle: started → active → completed or abandoned. Records which deck was studied and summary stats.
- **ReviewLog**: An immutable record of every rating event. Source of truth for all historical statistics (retention rate, heatmap). One row appended per card-rating action.

---

## API Contract

> **Base URL**: `/api/v1`
> **Auth**: All endpoints require `Authorization: Bearer <JWT>` unless noted.
> **Error format**: `{ "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }`

---

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user (no auth required) |
| POST | `/auth/login` | Login and receive JWT tokens (no auth required) |
| POST | `/auth/refresh` | Refresh access token using refresh token |
| POST | `/auth/logout` | Revoke refresh token |

**POST `/auth/register`**
```json
// Request
{ "email": "user@example.com", "password": "securePassword123" }

// Response 201
{ "user": { "id": "uuid", "email": "user@example.com", "created_at": "2026-03-04T00:00:00Z" } }

// Errors
// 409 CONFLICT: { "error": { "code": "EMAIL_TAKEN", "message": "Email already registered" } }
// 422 UNPROCESSABLE: { "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

**POST `/auth/login`**
```json
// Request
{ "email": "user@example.com", "password": "securePassword123" }

// Response 200
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in": 900
}

// Errors
// 401: { "error": { "code": "INVALID_CREDENTIALS", "message": "Email or password incorrect" } }
```

---

### Decks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/decks` | List all decks for the authenticated user |
| POST | `/decks` | Create a new deck |
| GET | `/decks/:deckId` | Get deck details with stats |
| PATCH | `/decks/:deckId` | Update deck name/description |
| DELETE | `/decks/:deckId` | Delete deck and all associated data |
| GET | `/decks/:deckId/export` | Export deck as CSV download |

**POST `/decks`**
```json
// Request
{ "name": "Japanese N5 Vocabulary", "description": "500 basic words" }

// Response 201
{
  "id": "uuid",
  "name": "Japanese N5 Vocabulary",
  "description": "500 basic words",
  "card_count": 0,
  "created_at": "2026-03-04T10:00:00Z",
  "updated_at": "2026-03-04T10:00:00Z"
}

// Errors
// 422: VALIDATION_ERROR (name required, max 100 chars)
```

**GET `/decks/:deckId`**
```json
// Response 200
{
  "id": "uuid",
  "name": "Japanese N5 Vocabulary",
  "description": "500 basic words",
  "card_count": 50,
  "stats": {
    "due_today": 12,
    "new": 30,
    "learning": 5,
    "review": 14,
    "relearning": 1
  },
  "created_at": "...",
  "updated_at": "..."
}

// Errors
// 403: FORBIDDEN (deck belongs to another user)
// 404: DECK_NOT_FOUND
```

---

### Cards

| Method | Path | Description |
|--------|------|-------------|
| GET | `/decks/:deckId/cards` | List cards in a deck (paginated) |
| POST | `/decks/:deckId/cards` | Create a single card |
| POST | `/decks/:deckId/cards/import` | Bulk import cards via CSV |
| GET | `/decks/:deckId/cards/:cardId` | Get a single card |
| PATCH | `/decks/:deckId/cards/:cardId` | Update a card |
| DELETE | `/decks/:deckId/cards/:cardId` | Delete a card |

**POST `/decks/:deckId/cards`**
```json
// Request
{
  "front": "犬",
  "back": "dog",
  "media_url": "https://cdn.example.com/images/dog.jpg",
  "tags": ["animals", "N5"]
}

// Response 201
{
  "id": "uuid",
  "deck_id": "uuid",
  "front": "犬",
  "back": "dog",
  "media_url": "https://cdn.example.com/images/dog.jpg",
  "tags": ["animals", "N5"],
  "created_at": "...",
  "updated_at": "..."
}
```

**POST `/decks/:deckId/cards/import`**
```
// Request: multipart/form-data
// Field: file (CSV, max 5MB, max 500 rows, columns: front, back)

// Response 200
{
  "imported": 48,
  "skipped": 2,
  "errors": [
    { "row": 3, "reason": "Missing 'back' column" },
    { "row": 17, "reason": "Front text exceeds 1000 characters" }
  ]
}

// Errors
// 422: INVALID_FILE_TYPE, FILE_TOO_LARGE, EXCEEDS_ROW_LIMIT
```

**GET `/decks/:deckId/cards`**
```json
// Query params: ?page=1&limit=50&tag=N5&state=new
// Response 200
{
  "data": [ { "id": "...", "front": "...", "back": "...", "tags": [], "state": "new" } ],
  "pagination": { "page": 1, "limit": 50, "total": 120, "total_pages": 3 }
}
```

---

### Study Sessions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sessions` | Start a new study session |
| GET | `/sessions/:sessionId/next-card` | Get the next card to study |
| POST | `/sessions/:sessionId/reveal` | Mark card answer as revealed (for logging) |
| POST | `/sessions/:sessionId/rate` | Submit a rating for the current card |
| POST | `/sessions/:sessionId/complete` | Complete the session |
| POST | `/sessions/:sessionId/abandon` | Abandon the session |
| GET | `/sessions/:sessionId/summary` | Get session summary |

**POST `/sessions`**
```json
// Request
{ "deck_id": "uuid" }

// Response 201
{
  "id": "uuid",
  "deck_id": "uuid",
  "status": "active",
  "queue_size": 15,
  "started_at": "2026-03-04T10:00:00Z"
}

// Errors
// 404: DECK_NOT_FOUND
// 409: SESSION_ALREADY_ACTIVE (returns existing session_id)
// 422: NO_CARDS_DUE { "message": "No cards due. Next due: 2026-03-05" }
```

**GET `/sessions/:sessionId/next-card`**
```json
// Response 200
{
  "card_id": "uuid",
  "front": "犬",
  "media_url": null,
  "progress": { "cards_remaining": 14, "cards_rated": 1 }
}

// Response 200 when queue exhausted
{ "done": true, "cards_rated": 15 }
```

**POST `/sessions/:sessionId/rate`**
```json
// Request
{ "card_id": "uuid", "rating": "good" }

// Response 200
{
  "card_progress": {
    "state": "review",
    "interval_days": 1,
    "ease_factor": 2.5,
    "due_date": "2026-03-05",
    "next_review_label": "Tomorrow"
  }
}

// Errors
// 400: INVALID_RATING (must be: again|hard|good|easy)
// 409: CARD_ALREADY_RATED_IN_SESSION
```

**GET `/sessions/:sessionId/summary`**
```json
// Response 200
{
  "session_id": "uuid",
  "deck_name": "Japanese N5 Vocabulary",
  "started_at": "...",
  "ended_at": "...",
  "duration_seconds": 420,
  "cards_studied": 15,
  "ratings": {
    "again": 2,
    "hard": 1,
    "good": 9,
    "easy": 3
  },
  "next_due_date": "2026-03-05"
}
```

---

### Statistics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats/dashboard` | Dashboard summary for the user |
| GET | `/stats/heatmap` | 30-day study activity heatmap |
| GET | `/stats/forecast` | Due card forecast for next 30 days |
| GET | `/decks/:deckId/stats` | Per-deck statistics |

**GET `/stats/dashboard`**
```json
// Response 200
{
  "due_today": 23,
  "streak_days": 7,
  "retention_rate_30d": 84.5,
  "total_reviews_30d": 340,
  "new_cards_today": 18,
  "total_decks": 4
}
```

**GET `/stats/heatmap`**
```json
// Query: ?days=30
// Response 200
{
  "data": [
    { "date": "2026-02-03", "count": 45 },
    { "date": "2026-02-04", "count": 0 },
    ...
  ]
}
```

---

### Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/settings` | Get user settings |
| PATCH | `/settings` | Update user settings |

**PATCH `/settings`**
```json
// Request
{
  "daily_new_cards_limit": 20,
  "daily_review_limit": 100,
  "reminder_enabled": true,
  "reminder_time": "08:00",
  "reminder_channel": "email"
}

// Response 200
{ ...updated settings object... }
```

---

## SRS Algorithm Specification

### SM-2 Algorithm — `calculateNextReview(progress, rating)`

#### Inputs
| Field | Type | Description |
|---|---|---|
| `progress.interval` | `number` | Days since last review (0 for new cards) |
| `progress.ease_factor` | `number` | Multiplier, default 2.5, min 1.3, max 2.5 |
| `progress.repetitions` | `number` | Count of consecutive successful reviews |
| `progress.state` | `string` | `new` \| `learning` \| `review` \| `relearning` |
| `rating` | `string` | `again` \| `hard` \| `good` \| `easy` |

#### Output: `ReviewResult`
| Field | Type | Description |
|---|---|---|
| `interval` | `number` | New interval in days |
| `ease_factor` | `number` | Updated ease factor |
| `repetitions` | `number` | Updated repetition count |
| `state` | `string` | Updated card state |
| `due_date` | `Date` | `today + interval` (UTC midnight) |

---

#### Rating Rules

**For cards in `new` or `learning` state (first pass):**

| Rating | Interval | Ease Factor Δ | Repetitions | New State |
|--------|----------|---------------|-------------|-----------|
| Again  | 1 day    | −0.20         | 0 (reset)   | relearning |
| Hard   | 1 day    | −0.15         | unchanged   | learning   |
| Good   | 1 day    | no change     | +1          | learning → review if rep ≥ 1 |
| Easy   | 4 days   | +0.15         | +1          | review     |

**For cards in `review` or `relearning` state:**

| Rating | Interval Formula                          | Ease Factor Δ | Repetitions | New State  |
|--------|-------------------------------------------|---------------|-------------|------------|
| Again  | 1 day                                     | −0.20         | 0 (reset)   | relearning |
| Hard   | `ceil(interval × 1.2)`                   | −0.15         | unchanged   | review     |
| Good   | `ceil(interval × ease_factor)`           | no change     | +1          | review     |
| Easy   | `ceil(interval × ease_factor × 1.3)`    | +0.15         | +1          | review     |

---

#### Ease Factor Formula

$$
\text{ease\_factor}_{\text{new}} = \text{clamp}(\text{ease\_factor}_{\text{old}} + \Delta, \; 1.3, \; 2.5)
$$

Where $\Delta$:
- `again` → $-0.20$
- `hard` → $-0.15$
- `good` → $0$
- `easy` → $+0.15$

**Clamp bounds**: minimum `1.3`, maximum `2.5`

---

#### Special Rules
- Minimum interval after any rating: **1 day**
- Maximum interval: **365 days** (cards due in more than 1 year reset to 365 days)
- First `good` on a new card: `interval = 1`, `state = learning`
- After `interval ≥ 21 days`, a card is considered **"Mature"** (for display purposes only; no algorithmic change)
- Fuzz factor: Add ±5% to intervals > 7 days to prevent cards from clustering on the same review date (e.g., interval = 10 days → randomly adjusted to 9–11 days)

---

## UI/UX Specification

---

### Screen 1: Dashboard (`/dashboard`)

**Purpose**: Entry point after login. Shows today's workload and overall progress.

**Key UI Components**:
- **Study Today Card**: Large prominent card showing "X cards due". Primary CTA button: "Study Now"
- **Streak Counter**: Flame icon + day count (e.g., "🔥 7-day streak")
- **Retention Rate**: Circular gauge showing percentage (last 30 days)
- **Deck List Preview**: Top 3 decks with their due card counts; link to full Deck List
- **Recent Activity**: Mini heatmap (last 7 days) showing study intensity

**Interactions & Transitions**:
- Tapping "Study Now" navigates to the deck with the most due cards and immediately starts a session
- Tapping a Deck in the preview navigates to that Deck's Detail screen
- If `due_today = 0`: "Study Today Card" shows "All caught up! 🎉" with next due date

**Empty State** (new user, no decks): Full-screen welcome illustration with "Create your first deck to start learning" and a prominent "Create Deck" button.

**Error State**: If stats fail to load, show skeleton loaders that gracefully degrade to "--" values; never show a blank screen.

---

### Screen 2: Deck List (`/decks`)

**Purpose**: Browse and manage all of the user's decks.

**Key UI Components**:
- **Search/Filter Bar**: Filter decks by name
- **Deck Cards Grid**: Each card shows: deck name, `card_count`, `due_today` badge (orange if > 0), last studied date
- **Create Deck FAB**: Floating Action Button (+) at bottom-right
- **Create Deck Modal**: Inline modal with name (required) and description (optional) fields; inline validation

**Interactions & Transitions**:
- Tapping a Deck Card navigates to Deck Detail
- Tapping the FAB opens the Create Deck modal with focus on the name input
- Long-press (or three-dot menu) on a Deck Card reveals: Edit / Delete options
- Delete shows a confirmation dialog: "Delete 'Deck Name'? This will permanently delete all 50 cards and study history."

**Empty State**: "No decks yet. Create your first deck!" with a centered Create Deck button.

---

### Screen 3: Deck Detail (`/decks/:deckId`)

**Purpose**: View and manage cards within a specific deck; access deck stats and start a session.

**Key UI Components**:
- **Deck Header**: Deck name, description, `card_count`, "Study Now" button (disabled + tooltip if 0 due cards)
- **Progress Bar**: Visual bar showing proportion of cards in each state (new/learning/review) using colour coding
- **Card List Table**: Columns: Front (truncated), Back (truncated), State badge, Due Date; paginated (50 per page)
- **Card Actions**: Edit (pencil icon) and Delete (trash icon) per row
- **Add Card Button**: Opens Card Editor inline or as a modal
- **Import CSV Button**: Opens file picker; shows progress and result toast

**Interactions & Transitions**:
- Tapping "Study Now" starts a session and navigates to the Study Session screen
- Tapping a card row opens the Card Editor in edit mode
- Tapping the state badge filters the card list by that state

**Empty State** (no cards): "This deck has no cards. Add your first card or import from CSV."

**Error State**: If deck fails to load → "Something went wrong. Tap to retry."

---

### Screen 4: Card Editor (`/decks/:deckId/cards/new` and `/decks/:deckId/cards/:cardId/edit`)

**Purpose**: Create or edit a single card.

**Key UI Components**:
- **Front Field**: Textarea (max 1000 chars), character counter
- **Back Field**: Textarea (max 1000 chars), character counter
- **Image Attachment**: "Add Image" button; shows thumbnail preview on upload; "Remove" option
- **Tags Field**: Comma-separated tag input with autocomplete from existing tags in the deck
- **Live Preview**: Real-time card preview showing front/back as they'll appear during study
- **Save / Cancel Buttons**

**Interactions & Transitions**:
- Saving a new card appends it to the Deck Detail card list and resets the editor for creating another card (with a "Done" option to exit)
- Saving an edit navigates back to Deck Detail
- Unsaved changes → leaving the screen shows a "Discard changes?" confirmation

**Validation**: Front and Back fields are required; error messages appear inline beneath each field on failed save attempt.

---

### Screen 5: Study Session (`/sessions/:sessionId`)

**Purpose**: The core learning experience. Shows one card at a time and collects ratings.

**Key UI Components**:
- **Progress Bar**: "Card X of N" with a visual linear progress bar at the top
- **Card Flip Container**: A large centred card with smooth CSS flip animation (Y-axis rotation)
  - **Front Side**: Shows `card.front` text and optional image
  - **Back Side** (revealed): Shows `card.back` text; appears after flip
- **"Show Answer" Button**: Centered below the front card; hidden after flip
- **Rating Buttons Bar**: Appears only after answer is revealed
  - `Again` (red) | `Hard` (orange) | `Good` (green) | `Easy` (teal)
  - Each button shows estimated next interval on hover: e.g., "Good — 1 day"
- **Abandon Session Link**: Small text link at top-right; triggers confirmation dialog

**Interactions & Transitions**:
- Tapping "Show Answer" (or pressing Space) triggers the card flip animation (300ms)
- After flip, rating buttons slide up from the bottom (200ms)
- Tapping a rating button immediately submits the rating and transitions to the next card (card slides out left, new card slides in from right)
- Keyboard shortcuts: `Space` = Show Answer; `1` = Again, `2` = Hard, `3` = Good, `4` = Easy
- After the last card is rated, automatically navigate to Session Summary

**Error State**: If next-card request fails → "Connection lost. Tap to retry" banner; session state is preserved.

---

### Screen 6: Session Summary (`/sessions/:sessionId/summary`)

**Purpose**: Post-session review of performance; motivates the user and sets expectations for next review.

**Key UI Components**:
- **Headline**: "Session Complete! 🎉" or "Good effort! Keep going 💪" (based on retention)
- **Stats Row**: Cards studied | Time elapsed | Retention rate (good+easy / total)
- **Rating Breakdown Donut Chart**: Visual proportion of Again / Hard / Good / Easy
- **Next Review Info**: "Next cards due: Tomorrow" (or specific date if > 1 day away)
- **CTA Buttons**:
  - "Study Another Deck" → Deck List
  - "Back to Dashboard" → Dashboard

**Interactions & Transitions**:
- Page slides in from the right as the last card slides out
- Tapping "Study Another Deck" navigates to Deck List
- Stats animate in (count-up animation) for engagement

---

### Screen 7: Statistics (`/stats`)

**Purpose**: Deep-dive into learning progress over time.

**Key UI Components**:
- **Retention Rate Line Chart**: Rolling 30-day retention percentage, one data point per day
- **Study Activity Heatmap**: Calendar grid (last 90 days); colour intensity = cards reviewed per day
- **Card Maturity Distribution**: Stacked bar chart showing New / Learning / Review / Mature proportions across all decks
- **30-Day Forecast Chart**: Bar chart showing predicted due card count per day for the next 30 days
- **Per-Deck Stats Table**: Deck name | Total cards | Retention | Avg interval | Last studied

**Interactions & Transitions**:
- Hovering/tapping a heatmap cell shows a tooltip: "March 4, 2026 — 45 cards reviewed"
- Hovering a forecast bar shows: "March 10 — 32 cards due"
- Tapping a row in the Per-Deck Stats Table navigates to that Deck's Detail screen

**Empty State**: If no reviews yet → "Start studying to see your progress here" with an illustration.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can complete their first full study session (register → create deck → add 3 cards → study all 3 → view summary) in **under 4 minutes**.
- **SC-002**: Rating a card and seeing the next card loads in **under 500 milliseconds** for 95% of requests.
- **SC-003**: A study session with 20 cards can be completed in **under 8 minutes** (average 24 seconds per card including read time).
- **SC-004**: Users who study daily for 30 days achieve a **retention rate ≥ 80%** as measured by the ReviewLog.
- **SC-005**: Zero `CardProgress` records are lost during any normal operation, migration, or deployment.
- **SC-006**: The due-card count displayed on the Dashboard matches the actual number of cards returned by the session queue for **100% of users at all times** (no stale cache discrepancy).
- **SC-007**: A CSV import of 500 cards completes in **under 10 seconds**.
- **SC-008**: The application is available **≥ 99.5%** of the time measured monthly.
- **SC-009**: At least **90% of users** who create a deck and add cards successfully complete a study session within the same day (measured by funnel analytics).
- **SC-010**: The SRS scheduling algorithm produces the correct output for **100% of test cases** as defined in the SM-2 unit test suite (all 4 ratings × all 4 states × edge cases).
