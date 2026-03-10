# Flashcards Learning – Spaced Repetition System
## Spec-Kit Prompts

---

## `/speckit.constitution` — Establish Project Principles

```
You are helping me build a Flashcards Learning application based on the Spaced Repetition System (SRS).

Establish the core constitution — guiding principles, values, and non-negotiable constraints — for this project:

**Product Overview:**
- App Name: Flashcards Learning
- Core Purpose: Help users memorize information efficiently using spaced repetition
- Core Loop: User creates a Deck → adds Cards → starts a Practice Session → rates each card (Again / Hard / Good / Easy) → system auto-schedules the next review date based on the rating

**Define the following constitutional pillars:**

1. **Core Principles**
   - What values guide every design and engineering decision? (e.g., simplicity, science-backed learning, user autonomy)
   - What is the single most important metric of success for users?

2. **Domain Boundaries**
   - What does this system do? (in-scope)
   - What does this system NOT do? (out-of-scope, e.g., AI-generated content, social features, gamification)

3. **Technical Constraints**
   - Language/framework preferences (e.g., React + Node.js, or mobile-first Flutter, etc.)
   - Data persistence requirements (local-first vs. cloud-synced)
   - Must the SRS algorithm be standard (SM-2) or custom?

4. **User Personas**
   - Who are the primary users? (e.g., language learners, students, professionals)
   - What are their key pain points with existing flashcard apps?

5. **Quality Attributes**
   - Performance: Session must load within 1 second
   - Reliability: Review schedule must never be lost
   - Usability: A new user must be able to complete their first study session within 2 minutes of signup

6. **Decision Log Format**
   - How will architectural decisions be documented? (ADR format recommended)

Output: A structured Markdown document titled "Project Constitution" covering all six pillars above.
```

---

## `/speckit.specify` — Create Baseline Specification

```
Based on the Project Constitution for Flashcards Learning (Spaced Repetition), create a comprehensive baseline specification.

**System Description:**
Users create Decks (collections of Cards). Each Card has a front (question/prompt) and back (answer). Users run Practice Sessions where each card is shown one at a time. After revealing the answer, the user rates their recall: Again / Hard / Good / Easy. The system uses these ratings to calculate the next review date for each card (SM-2 or FSRS algorithm).

**Specify the following:**

### 1. Entity Data Models
Define the full data schema for:
- `User` (id, email, created_at, settings)
- `Deck` (id, user_id, name, description, created_at, updated_at, card_count)
- `Card` (id, deck_id, front, back, media_url?, tags[], created_at, updated_at)
- `CardProgress` (id, card_id, user_id, due_date, interval_days, ease_factor, repetitions, last_reviewed_at, state: new|learning|review|relearning)
- `StudySession` (id, user_id, deck_id, started_at, ended_at, cards_studied, ratings_summary)
- `ReviewLog` (id, card_id, user_id, session_id, rating: again|hard|good|easy, reviewed_at, scheduled_days)

### 2. Functional Requirements
Write user stories in the format: "As a [persona], I want to [action] so that [benefit]"
Cover these domains:
- Deck management (create, edit, delete, import/export)
- Card management (create, bulk-add, edit, delete, add media)
- Study Session flow (start session, show card front, reveal back, submit rating)
- Scheduling (SM-2 algorithm logic per rating, due-card queue)
- Progress & Statistics (deck stats, card heatmap, retention rate, streak)
- Settings (daily goal, notification reminders, algorithm parameters)

### 3. API Contract (REST or GraphQL)
Define endpoints/mutations for each domain above. Include HTTP method, path, request body, response shape, and error codes.

### 4. SRS Algorithm Specification
Document the SM-2 scheduling rules:
- Again → reset interval to 1 day, decrease ease factor
- Hard → multiply interval by 1.2, slight ease decrease
- Good → multiply interval by ease factor
- Easy → multiply interval by ease factor × 1.3, increase ease factor
Include the formula for ease_factor adjustment and minimum/maximum bounds.

### 5. UI/UX Specification
For each screen, define:
- Screen name and route
- Key UI components
- User interactions and transitions
- Empty states and error states

Screens: Dashboard, Deck List, Deck Detail, Card Editor, Study Session, Session Summary, Statistics

### 6. Acceptance Criteria
For each functional requirement, define testable acceptance criteria in Given/When/Then format.

Output: A full Markdown specification document with all 6 sections above.
```

---

## `/speckit.plan` — Create Implementation Plan

```
Based on the Flashcards Learning specification (Spaced Repetition System), create a phased implementation plan.

**Project Context:**
- Entities: User, Deck, Card, CardProgress, StudySession, ReviewLog
- Core feature: SRS scheduling with Again/Hard/Good/Easy ratings
- Target: Web application (or mobile — adapt as needed)

**Create an implementation plan structured as follows:**

### Phase 0: Foundation (Week 1)
- Project scaffolding (monorepo or separate frontend/backend)
- Database setup and migration tooling
- Authentication system (JWT or session-based)
- CI/CD pipeline skeleton
- Design system / component library setup

### Phase 1: Core Data Layer (Week 2)
- Implement all database schemas and migrations
- Seed data for development
- Repository/service layer for Deck and Card CRUD
- Unit tests for data layer

### Phase 2: SRS Engine (Week 2–3)
- Implement SM-2 algorithm as a pure, testable module
- CardProgress initialization for new cards
- Due-card queue calculation (cards due today + overdue)
- Rating processor: recalculate interval, ease_factor, due_date
- Full unit test coverage for the SRS engine

### Phase 3: Study Session Feature (Week 3–4)
- Session creation and lifecycle management
- Card serving logic (new cards + due cards, configurable ratio)
- Rating submission and progress update
- Session completion and summary generation
- Integration tests for the full session flow

### Phase 4: Deck & Card Management UI (Week 4–5)
- Deck list, create, edit, delete screens
- Card list view and inline editor
- Bulk card import (CSV/text format)
- Media attachment support (images)

### Phase 5: Study Session UI (Week 5–6)
- Session start screen with deck selection
- Card display: front view → reveal back → rating buttons
- Progress indicator (cards remaining, session stats)
- Session summary screen with performance breakdown
- Keyboard shortcuts for rating (1=Again, 2=Hard, 3=Good, 4=Easy)

### Phase 6: Statistics & Progress (Week 6–7)
- Dashboard with daily due count, streak, and retention rate
- Per-deck statistics (maturity distribution, average ease)
- Calendar heatmap of study activity
- Forecast chart: projected due cards for next 30 days

### Phase 7: Polish & Launch (Week 7–8)
- Notification/reminder system (browser push or email)
- Settings page (daily new card limit, algorithm params)
- Performance optimization (query indexing, lazy loading)
- End-to-end test suite
- Production deployment

**For each phase, specify:**
- Goals and deliverables
- Dependencies on previous phases
- Definition of Done
- Risk factors and mitigation

Output: A structured Markdown plan document with all 8 phases.
```

---

## `/speckit.tasks` — Generate Actionable Tasks

```
Based on the Flashcards Learning implementation plan, break down each phase into granular, developer-ready tasks.

**Format each task as:**
- [ ] TASK-{ID}: {Title}
  - **Type:** feature | bug | chore | test | docs
  - **Phase:** {phase number}
  - **Estimate:** {story points or hours}
  - **Depends on:** {TASK-IDs}
  - **Description:** {1-2 sentence description of what needs to be done}
  - **Acceptance Criteria:** {bullet list of done conditions}

**Generate tasks for all phases. Include at minimum:**

#### Phase 0 – Foundation
- TASK-001: Initialize project repository and folder structure
- TASK-002: Configure database connection and ORM (e.g., Prisma / TypeORM)
- TASK-003: Implement user registration and login API
- TASK-004: Set up JWT authentication middleware
- TASK-005: Configure CI pipeline (lint, test, build)
- TASK-006: Set up frontend project with routing and design tokens

#### Phase 1 – Data Layer
- TASK-007: Create database migration for User, Deck, Card tables
- TASK-008: Create database migration for CardProgress, StudySession, ReviewLog tables
- TASK-009: Implement Deck CRUD service and API endpoints
- TASK-010: Implement Card CRUD service and API endpoints
- TASK-011: Write unit tests for Deck and Card services
- TASK-012: Create development seed data script

#### Phase 2 – SRS Engine
- TASK-013: Implement SM-2 algorithm module (pure function, no side effects)
- TASK-014: Write unit tests for SM-2: all four rating paths (Again/Hard/Good/Easy)
- TASK-015: Implement CardProgress initialization for new cards
- TASK-016: Implement due-card queue query (due_date <= today, ordered by due_date)
- TASK-017: Implement ReviewLog recording after each rating

#### Phase 3 – Study Session
- TASK-018: Implement POST /sessions endpoint (create session for a deck)
- TASK-019: Implement GET /sessions/:id/next-card endpoint
- TASK-020: Implement POST /sessions/:id/rate endpoint (submit rating, update CardProgress)
- TASK-021: Implement POST /sessions/:id/complete endpoint (finalize session)
- TASK-022: Write integration tests for complete session flow
- TASK-023: Handle edge case: session with 0 due cards

#### Phase 4 – Deck & Card UI
- TASK-024: Build Deck List screen (empty state, create button)
- TASK-025: Build Create/Edit Deck modal (name, description, validation)
- TASK-026: Build Deck Detail screen with card list and pagination
- TASK-027: Build Card Editor (front/back fields, save, cancel)
- TASK-028: Implement CSV bulk import for cards
- TASK-029: Add delete confirmation dialogs for Deck and Card

#### Phase 5 – Study Session UI
- TASK-030: Build Session Start screen (deck info, due count, start button)
- TASK-031: Build Card Display component (front side, flip animation)
- TASK-032: Build Rating Button Bar (Again / Hard / Good / Easy with color coding)
- TASK-033: Build Session Progress Bar (X of N cards)
- TASK-034: Build Session Summary screen (correct%, by-rating breakdown, next due)
- TASK-035: Implement keyboard shortcuts for ratings (1/2/3/4 keys)
- TASK-036: Handle session interruption and resume

#### Phase 6 – Statistics
- TASK-037: Build Dashboard widget: today's due card count and streak counter
- TASK-038: Build retention rate chart (line chart, last 30 days)
- TASK-039: Build card maturity distribution bar chart (new/learning/review/mature)
- TASK-040: Build study activity calendar heatmap
- TASK-041: Build 30-day forecast chart for upcoming due cards

#### Phase 7 – Polish
- TASK-042: Implement daily reminder notification (browser push or email)
- TASK-043: Build Settings page (new cards/day limit, max reviews/day)
- TASK-044: Add database indexes on CardProgress.due_date and Card.deck_id
- TASK-045: Write end-to-end tests for critical user journeys
- TASK-046: Write user-facing documentation / onboarding tooltips
- TASK-047: Production deployment and smoke testing

Output: A complete task list in the format above, organized by phase, ready to be imported into a project tracker (GitHub Issues, Linear, Jira).
```

---

## `/speckit.implement` — Execute Implementation

```
You are now implementing the Flashcards Learning application (Spaced Repetition System).

Follow the spec and tasks defined in the previous steps. Use the implementation guidelines below.

---

### Context Reminder
- **Entities:** User, Deck, Card, CardProgress, StudySession, ReviewLog
- **Core Algorithm:** SM-2 spaced repetition (Again / Hard / Good / Easy ratings)
- **Session Flow:** Start session → serve due card → user rates → update schedule → repeat → session summary

---

### Implementation Guidelines

#### 1. When implementing the SRS Engine (TASK-013 to TASK-017):
Implement `calculateNextReview(cardProgress, rating)` as a pure function:
```typescript
type Rating = 'again' | 'hard' | 'good' | 'easy';

interface CardProgress {
  interval: number;       // days until next review
  easeFactor: number;     // default 2.5, min 1.3
  repetitions: number;    // consecutive successful reviews
  state: 'new' | 'learning' | 'review' | 'relearning';
}

interface ReviewResult {
  interval: number;
  easeFactor: number;
  repetitions: number;
  state: CardProgress['state'];
  dueDate: Date;
}
```
Rules:
- `again`: interval = 1, repetitions = 0, easeFactor -= 0.20, state = 'relearning'
- `hard`: interval = interval × 1.2, easeFactor -= 0.15, state = 'review'
- `good`: interval = interval × easeFactor, repetitions++, state = 'review'
- `easy`: interval = interval × easeFactor × 1.3, easeFactor += 0.15, repetitions++, state = 'review'
- Clamp easeFactor: min 1.3, max 2.5 (optional upper cap)
- For new cards: first `good` → interval = 1, first `easy` → interval = 4

Write tests covering: all four ratings from `new` state, all four from `review` state, ease factor clamping.

#### 2. When implementing the Study Session API (TASK-018 to TASK-022):
The `GET /sessions/:id/next-card` endpoint must:
- Return cards in this priority order: overdue → due today → new cards (up to daily limit)
- Include `card.front` only (not `card.back`) to prevent cheating
- Return `{ done: true }` when no more cards remain in the session queue
- Lock the session after `complete` is called

The `POST /sessions/:id/rate` endpoint must:
- Accept `{ cardId, rating }`
- Call `calculateNextReview()` and persist the updated `CardProgress`
- Append a `ReviewLog` entry
- Return the updated `CardProgress` so the client can show scheduling feedback ("Next review: in 3 days")

#### 3. When implementing the Card Display UI (TASK-031 to TASK-035):
- Card flip must be CSS-animated (transform: rotateY), not a page navigation
- Rating buttons must only appear AFTER the card is flipped (back revealed)
- Use color coding: Again=red, Hard=orange, Good=green, Easy=teal/blue
- Show estimated next interval on each button hover: e.g., "Good — 3 days"
- Pressing a rating button should immediately fetch the next card without full page reload

#### 4. When implementing Statistics (TASK-037 to TASK-041):
All statistics queries must:
- Be scoped to the authenticated user
- Be pre-aggregated where possible (do not compute in-memory for large datasets)
- Use the `ReviewLog` table as the source of truth for historical data
- Use the `CardProgress` table for current scheduling state

#### 5. General Implementation Rules:
- **Never expose `card.back` in the next-card API response**
- **Always validate user ownership** before any Deck/Card/Session mutation
- **Use database transactions** when updating CardProgress + inserting ReviewLog
- **All timestamps must be stored in UTC**; display in user's local timezone
- **Error responses** must follow: `{ error: { code: string, message: string } }`
- **Write tests first** (TDD) for the SRS engine; feature-first for UI components

---

### Execution Order
Implement in this strict order to avoid blockers:
1. TASK-001 → TASK-006 (Foundation)
2. TASK-007 → TASK-012 (Data layer, required by all features)
3. TASK-013 → TASK-017 (SRS engine, required by session)
4. TASK-018 → TASK-023 (Session API, required by session UI)
5. TASK-024 → TASK-029 (Deck/Card UI, can partially parallel with step 4)
6. TASK-030 → TASK-036 (Session UI, requires step 4)
7. TASK-037 → TASK-041 (Stats, requires ReviewLog data from step 4)
8. TASK-042 → TASK-047 (Polish & deploy)

For each task, confirm: schema matches spec → logic matches algorithm → tests pass → PR description references TASK-ID.
```

---

*Generated for: Flashcards Learning – Spaced Repetition System*
*Spec-Kit Version: 1.0 | Date: 2026-03-04*
