# Implementation Plan: Flashcards Learning – Spaced Repetition System

**Branch**: `1-flashcards-srs` | **Date**: 2026-03-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/1-flashcards-srs/spec.md`

---

## Summary

Build a web application that enables users to create Decks of flashcards, study them in timed sessions, and rate each card using the SM-2 spaced repetition algorithm (Again / Hard / Good / Easy). The system automatically schedules the next review date for each card, ensuring efficient long-term retention. The stack is React + TypeScript (frontend) and Node.js + TypeScript + Prisma + PostgreSQL (backend), deployed via Docker.

---

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS, React 18
**Primary Dependencies**: Express 4, Prisma 5, React Query 5, TailwindCSS 3, Vitest, Supertest, Playwright
**Storage**: PostgreSQL 16 (cloud-synced, server-authoritative)
**Testing**: Vitest (unit/integration), Playwright (E2E), Supertest (API integration)
**Target Platform**: Web (desktop-first, responsive for tablet; no native mobile in v1)
**Project Type**: web-service + web-app (REST API backend + SPA frontend)
**Performance Goals**: < 500ms p95 for rating submission + next-card, < 1s p95 for session start
**Constraints**: Zero `CardProgress` data loss; all timestamps in UTC; ownership validation on every mutation
**Scale/Scope**: ~10k users, 50+ cards/deck typical, 7 screens, 47 tasks across 8 phases

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Constitutional Rule | Status | Notes |
|---|---|---|---|
| 1 | SM-2 algorithm encapsulated as pure function | ✅ PASS | Planned as `calculateNextReview()` in isolated module |
| 2 | SRS engine implemented test-first (TDD, NON-NEGOTIABLE) | ✅ PASS | TASK-014 (tests) precedes TASK-013 (implementation) |
| 3 | `CardProgress` updates use DB transactions | ✅ PASS | Enforced in Phase 3 session API design |
| 4 | User ownership validated on all mutations | ✅ PASS | Auth middleware + service-layer guard |
| 5 | `card.back` never exposed in next-card API | ✅ PASS | Documented in FR-014 and Session API contract |
| 6 | Timestamps stored in UTC | ✅ PASS | Enforced in Prisma schema and API conventions |
| 7 | No AI content generation | ✅ PASS | Out-of-scope per constitution |
| 8 | No social/gamification features beyond streaks | ✅ PASS | Out-of-scope per constitution |
| 9 | REST API only (no GraphQL) | ✅ PASS | Spec defines REST endpoints only |
| 10 | Cloud-synced (no local-only storage) | ✅ PASS | PostgreSQL is authoritative for all scheduling state |

**Gate Result**: ✅ ALL PASS — proceed to Phase 0 research.

---

## Project Structure

### Documentation (this feature)

```text
specs/1-flashcards-srs/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   ├── auth.md
│   ├── decks.md
│   ├── cards.md
│   ├── sessions.md
│   └── stats.md
└── tasks.md             ← /speckit.tasks output (separate command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   │   ├── auth/
│   │   ├── decks/
│   │   ├── cards/
│   │   ├── sessions/
│   │   └── stats/
│   ├── lib/
│   │   └── srs/
│   │       ├── sm2.ts              ← Pure SM-2 function
│   │       └── sm2.test.ts         ← TDD tests (written first)
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── ownership.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── app.ts
└── tests/
    ├── unit/
    └── integration/

frontend/
├── src/
│   ├── components/
│   │   ├── ui/                     ← Design system atoms
│   │   ├── deck/
│   │   ├── card/
│   │   └── session/
│   ├── pages/
│   │   ├── dashboard/
│   │   ├── decks/
│   │   ├── study/
│   │   └── stats/
│   ├── hooks/
│   ├── services/                   ← API client layer
│   └── main.tsx
└── tests/
    └── e2e/
```

**Structure Decision**: Option 2 (separate `backend/` and `frontend/` directories) chosen because the REST API and the React SPA have independent build pipelines, deployment targets, and test runners. The SRS engine lives at `backend/src/lib/srs/` to keep it isolated, pure, and trivially testable.

---

## Complexity Tracking

No constitutional violations. All design choices map directly to constitutional requirements.

---

## Implementation Phases

---

### Phase 0: Foundation (Week 1)

#### Goals & Deliverables
Set up the complete project skeleton so every developer can clone, install, and run both services with a single command. No business logic is implemented in this phase.

| Deliverable | Description |
|---|---|
| Monorepo root with `backend/` and `frontend/` | Separate Node.js projects with shared TypeScript config |
| PostgreSQL connection via Prisma | `.env` template, `DATABASE_URL` wired, `prisma migrate dev` working |
| User registration & login API | `POST /auth/register`, `POST /auth/login` returning JWT |
| JWT middleware | `Authorization: Bearer` validation on all protected routes |
| CI pipeline | GitHub Actions: lint → type-check → test → build on every PR |
| Frontend skeleton | React + Vite + TailwindCSS + React Router + React Query configured |
| Design tokens | Colour palette, typography scale, spacing scale defined in `tailwind.config` |

#### Dependencies
- None (this is the foundation for all other phases)

#### Definition of Done
- [ ] `docker compose up` starts PostgreSQL and both services with no errors
- [ ] `POST /auth/register` and `POST /auth/login` return correct JWT responses
- [ ] Protected endpoint returns 401 without a valid token
- [ ] Frontend renders a login page at `/login` and a protected route redirects to login
- [ ] CI pipeline is green on the initial commit
- [ ] `README.md` documents local setup in ≤ 10 steps

#### Risk Factors & Mitigation
| Risk | Likelihood | Mitigation |
|---|---|---|
| Docker networking issues across dev environments | Medium | Provide `.env.example` with all required vars; document Docker version requirement (≥ 24) |
| JWT secret management in CI | Low | Use GitHub Actions secrets; never commit to repo |
| Frontend build config drift from backend | Low | Share `tsconfig.base.json` from root; enforce in CI |

---

### Phase 1: Core Data Layer (Week 2)

#### Goals & Deliverables
Define and migrate the full database schema. Implement CRUD services for Decks and Cards with full unit test coverage. The API is usable via HTTP but has no frontend yet.

| Deliverable | Description |
|---|---|
| Prisma migrations for all 6 entities | User, Deck, Card, CardProgress, StudySession, ReviewLog tables |
| Deck service + API | `GET/POST /decks`, `GET/PATCH/DELETE /decks/:id`, `GET /decks/:id/export` |
| Card service + API | `GET/POST /decks/:id/cards`, `GET/PATCH/DELETE /decks/:id/cards/:cardId` |
| Ownership guard middleware | Validates `deck.user_id === req.user.id` on all Deck/Card operations |
| Unit tests: Deck & Card services | 100% branch coverage for service layer |
| Dev seed script | `npm run seed` creates 2 users, 3 decks, 30 cards for local testing |

#### Dependencies
- Phase 0: Database connection, authentication, JWT middleware

#### Definition of Done
- [ ] All 6 Prisma migrations run cleanly on a fresh database
- [ ] `GET /decks` returns only the authenticated user's decks
- [ ] `DELETE /decks/:id` cascades to delete all Cards, CardProgress, ReviewLogs
- [ ] Attempting to access another user's deck returns `403 FORBIDDEN`
- [ ] Unit tests pass with 100% coverage on service layer
- [ ] `npm run seed` populates the database with usable test data

#### Risk Factors & Mitigation
| Risk | Likelihood | Mitigation |
|---|---|---|
| Schema changes breaking later phases | High | Lock schema after Phase 1 review; require ADR for any post-P1 schema change |
| `card_count` becoming stale | Medium | Use a Prisma `_count` relation instead of a stored counter; or use a DB trigger |
| Cascade delete accidentally deleting too much | Low | Write an integration test that verifies exact cascade behaviour before merge |

---

### Phase 2: SRS Engine (Week 2–3)

#### Goals & Deliverables
Implement the SM-2 algorithm as a fully-tested, pure TypeScript module. No HTTP endpoints yet — this is purely business logic. Tests are written **before** implementation (TDD).

| Deliverable | Description |
|---|---|
| `sm2.test.ts` (written first) | Tests for all 16 paths (4 ratings × 4 states) + edge cases |
| `sm2.ts` — `calculateNextReview()` | Pure function: `(CardProgress, Rating) → ReviewResult` |
| `CardProgress` initializer | `initCardProgress(cardId, userId)` creates a new record with SM-2 defaults |
| Due-card queue query | `getDueCards(userId, deckId, limit)` — overdue first, then due today, then new |
| ReviewLog writer | `writeReviewLog(sessionId, cardId, rating, result)` — called within transactions |

#### Dependencies
- Phase 1: `CardProgress` and `ReviewLog` tables must exist

#### Definition of Done
- [ ] All SM-2 unit tests are written and reviewed **before** `sm2.ts` implementation starts
- [ ] All 16 rating × state paths produce correct `interval`, `ease_factor`, `due_date`
- [ ] `ease_factor` clamped to [1.3, 2.5] in all tests
- [ ] Fuzz factor (±5% for intervals > 7 days) is tested with seeded randomness
- [ ] `getDueCards()` returns cards in correct priority order (overdue → due → new)
- [ ] Zero side effects in `calculateNextReview()` — verified by mutation tests

#### Risk Factors & Mitigation
| Risk | Likelihood | Mitigation |
|---|---|---|
| Floating-point rounding causing scheduling drift | Medium | Use `Math.ceil()` for intervals; add regression tests for boundary values |
| Fuzz factor causing test flakiness | Medium | Inject a seeded random function for tests; use real random only in production |
| SM-2 edge cases not covered (e.g., interval = 0 for new cards) | Medium | Add explicit tests for `state = new` first review; document all edge cases in `research.md` |

---

### Phase 3: Study Session Feature (Week 3–4)

#### Goals & Deliverables
Implement the full session lifecycle as a backend API. The SRS engine (Phase 2) is integrated here. All session state changes use database transactions.

| Deliverable | Description |
|---|---|
| `POST /sessions` | Create a session, build the due-card queue, store queue in DB |
| `GET /sessions/:id/next-card` | Return next card (front only; never back) |
| `POST /sessions/:id/rate` | Accept rating, call `calculateNextReview()`, update `CardProgress` + append `ReviewLog` in one transaction |
| `POST /sessions/:id/complete` | Finalise session, write summary to `StudySession` |
| `POST /sessions/:id/abandon` | Mark session abandoned; preserve progress on already-rated cards |
| Session summary endpoint | `GET /sessions/:id/summary` — return stats breakdown |
| Integration test suite | Tests full session flow: start → rate all → complete → verify `CardProgress` |

#### Dependencies
- Phase 2: SM-2 engine, `getDueCards()`, `writeReviewLog()`
- Phase 1: All tables, Deck/Card ownership guards

#### Definition of Done
- [ ] Starting a session with 0 due cards returns `422 NO_CARDS_DUE` with next due date
- [ ] `GET /sessions/:id/next-card` never includes `card.back` in response body
- [ ] Rating a card updates `CardProgress` and inserts `ReviewLog` atomically (transaction test)
- [ ] Calling `POST /sessions/:id/rate` after session is completed returns `409 SESSION_LOCKED`
- [ ] Integration test: rate 10 cards, complete session, verify all 10 `CardProgress` records updated
- [ ] Session abandon preserves `CardProgress` for already-rated cards

#### Risk Factors & Mitigation
| Risk | Likelihood | Mitigation |
|---|---|---|
| Concurrent ratings from two browser tabs | Low | Use DB-level unique constraint on (session_id, card_id) in ReviewLog; return 409 on duplicate |
| Transaction rollback leaving `CardProgress` in inconsistent state | Low | Add integration test that forces a mid-transaction error and verifies rollback |
| Session queue becoming stale mid-session (cards added to deck while studying) | Low | Snapshot the queue at session creation time; do not re-query during the session |

---

### Phase 4: Deck & Card Management UI (Week 4–5)

#### Goals & Deliverables
Build the React frontend for all content management screens. The backend APIs from Phases 1–3 are consumed here.

| Deliverable | Description |
|---|---|
| Deck List screen (`/decks`) | Grid of deck cards with due badge, create FAB, search |
| Create/Edit Deck modal | Controlled form with inline validation; React Query mutation |
| Deck Detail screen (`/decks/:id`) | Card list with pagination, state badge filter, due count, "Study Now" button |
| Card Editor (`/decks/:id/cards/new` and `edit`) | Front/back textareas, image upload, tag input, live preview |
| CSV bulk import | File picker → upload → progress toast → result summary (X imported, Y skipped) |
| Delete confirmations | Confirm dialog for both Deck and Card deletion with cascade warning |

#### Dependencies
- Phase 3: All session and card APIs must be available (or mocked via MSW for parallel dev)

#### Definition of Done
- [ ] Creating a deck and adding 3 cards completes in < 3 minutes by a first-time user
- [ ] Deleting a deck shows the cascade warning message with the correct card count
- [ ] CSV import of 50-row file shows success toast with imported/skipped counts
- [ ] Card editor shows live preview that matches the study session card layout
- [ ] Deck Detail shows correct `due_today` count from the API
- [ ] All screens have tested empty states (no decks, no cards)

#### Risk Factors & Mitigation
| Risk | Likelihood | Mitigation |
|---|---|---|
| File upload UX confusion (no progress feedback) | Medium | Show upload progress bar; disable import button during upload |
| Image attachment increasing page load time | Medium | Lazy-load card images; enforce 5MB client-side size check before upload |
| Tag input usability (comma-separated) | Low | Use a tag input component with keyboard shortcuts (Enter/comma to add, Backspace to remove) |

---

### Phase 5: Study Session UI (Week 5–6)

#### Goals & Deliverables
Build the core study experience. This is the most interaction-dense and performance-sensitive part of the UI.

| Deliverable | Description |
|---|---|
| Session Start screen | Deck info, due card count, new card count, "Start Session" button |
| Card Display with flip animation | Front-only → Space to flip → CSS rotateY animation (300ms) |
| Rating Button Bar | Again/Hard/Good/Easy with colour coding; shows next interval on hover |
| Progress Bar | "Card X of N" linear progress bar |
| Session Summary screen | Stats row, donut chart breakdown, next due date, CTA buttons |
| Keyboard shortcuts | `Space` = flip; `1/2/3/4` = Again/Hard/Good/Easy |
| Session interruption handling | Detect browser close / route change; prompt resume or abandon |

#### Dependencies
- Phase 3: Session API (start, next-card, rate, complete, abandon, summary)
- Phase 0: Design tokens for colour system

#### Definition of Done
- [ ] Card flip animation plays at 60fps (measured with browser DevTools)
- [ ] Rating buttons only appear after the card is flipped (back revealed)
- [ ] Pressing `1/2/3/4` keys submits the rating without requiring mouse
- [ ] Rating + next card load in < 500ms (tested with network throttling at "Fast 3G")
- [ ] Next interval preview is shown on button hover (e.g., "Good — 1 day")
- [ ] Navigating away mid-session prompts the "Abandon session?" dialog
- [ ] Session Summary shows correct per-rating counts matching the session API

#### Risk Factors & Mitigation
| Risk | Likelihood | Mitigation |
|---|---|---|
| Card flip animation lag on low-end devices | Medium | Use `will-change: transform` CSS hint; test on simulated mobile CPU in DevTools |
| Keyboard shortcuts conflicting with browser shortcuts | Low | Only activate shortcuts when session screen is mounted; `Escape` exits, not `q` |
| Optimistic UI causing state mismatch if rating request fails | Medium | Use React Query mutation with rollback on error; show retry banner |

---

### Phase 6: Statistics & Progress (Week 6–7)

#### Goals & Deliverables
Build the statistics screens and dashboard. All data is pre-aggregated on the backend; the frontend renders charts only.

| Deliverable | Description |
|---|---|
| Dashboard screen (`/dashboard`) | Due count, streak, retention rate gauge, mini heatmap, deck preview list |
| Retention rate line chart | Rolling 30-day line chart using `ReviewLog` data |
| Card maturity distribution chart | Stacked bar showing New/Learning/Review/Mature per deck |
| 90-day activity heatmap | Calendar grid with colour intensity = cards reviewed/day |
| 30-day forecast bar chart | Predicted due card count per day for next 30 days |
| Per-deck stats table | Deck name, total cards, retention, avg interval, last studied |

#### Dependencies
- Phase 3: `ReviewLog` and `CardProgress` data must be populated
- Phase 5: At least one completed session must exist for meaningful stats

#### Definition of Done
- [ ] Dashboard loads in < 2 seconds with 500 review log entries
- [ ] Heatmap correctly shows activity on days with reviews; empty on days without
- [ ] Retention rate formula: `(hard+good+easy) / total` matches backend calculation
- [ ] Forecast chart correctly shows 0 for days in the past (today − 1)
- [ ] Hovering a heatmap cell shows tooltip: "March 4, 2026 — 45 cards reviewed"
- [ ] Empty state shown correctly when user has 0 reviews

#### Risk Factors & Mitigation
| Risk | Likelihood | Mitigation |
|---|---|---|
| Statistics queries slow on large `ReviewLog` tables | High | Add composite index on `(user_id, reviewed_at)` in Phase 1 migration; test with 10k rows |
| Chart library bundle size inflating initial load | Medium | Use lightweight chart library (e.g., Recharts or Chart.js); lazy-load stats page |
| Streak calculation off-by-one on timezone boundaries | High | Calculate streak using user's local date (from `timezone` in settings), not UTC date |

---

### Phase 7: Polish & Launch (Week 7–8)

#### Goals & Deliverables
Harden the application, add notifications, optimise performance, and deploy to production.

| Deliverable | Description |
|---|---|
| Daily reminder notifications | Browser push (Web Push API) or email (via SMTP/SendGrid) based on user preference |
| Settings page (`/settings`) | Daily new card limit, max reviews/day, reminder toggle + time, reminder channel |
| Database indexes | Composite indexes on `CardProgress(user_id, due_date)`, `ReviewLog(user_id, reviewed_at)`, `Card(deck_id)` |
| E2E test suite | Playwright tests for 5 critical journeys (see below) |
| Onboarding tooltips | Tooltip overlay on first session for new users |
| Production deployment | Docker Compose on VPS or Railway/Render PaaS; health check endpoint; automated deploy on `main` merge |
| Smoke test script | Post-deploy script verifying register → study → summary works end-to-end |

**E2E Critical Journeys:**
1. Register → Create Deck → Add 3 Cards → Study all → Session Summary
2. Bulk import 20 cards via CSV → Verify card count
3. Study session: rate all "Again" → verify all cards are rescheduled for tomorrow
4. Dashboard shows correct due count after completing a session
5. Delete deck → Verify all cards and history are removed

#### Dependencies
- All previous phases must have passing tests
- Production environment credentials (database URL, JWT secret, SMTP credentials)

#### Definition of Done
- [ ] All 5 E2E test journeys pass in CI against a clean database
- [ ] `POST /notifications/subscribe` registers a Web Push subscription
- [ ] Reminder notification is sent exactly once at the configured time when due cards > 0
- [ ] All 3 database indexes exist in the production migration
- [ ] Application is accessible at production URL with HTTPS
- [ ] Smoke test passes within 2 minutes of production deployment
- [ ] `p95` API response time ≤ 300ms measured under load test (50 concurrent users)

#### Risk Factors & Mitigation
| Risk | Likelihood | Mitigation |
|---|---|---|
| Web Push browser support gaps (especially iOS Safari < 16.4) | High | Offer email as the default channel; Web Push as opt-in progressive enhancement |
| Production database migration failing mid-deploy | Medium | Always run migrations in a separate pre-deploy step; never auto-migrate on app start |
| E2E tests flaky due to timing issues | Medium | Use Playwright `waitForResponse()` instead of `waitForTimeout()`; avoid arbitrary sleeps |
| Cold start latency on PaaS (Railway/Render free tier) | High | Use a paid instance or configure a health-check ping to prevent sleep |

---

## Phase Dependencies Map

```
Phase 0: Foundation
    └── Phase 1: Data Layer
            ├── Phase 2: SRS Engine
            │       └── Phase 3: Study Session API
            │               ├── Phase 4: Deck & Card UI (can partially parallel)
            │               ├── Phase 5: Study Session UI
            │               └── Phase 6: Statistics & Progress
            │                       └── Phase 7: Polish & Launch
            └── Phase 4: Deck & Card UI (CRUD endpoints ready in P1)
```

**Parallelisation opportunity**: Phase 4 (Deck/Card UI) can begin against Phase 1 API endpoints while Phase 2 and 3 are in progress, using MSW (Mock Service Worker) to mock session endpoints not yet built.

---

## Total Timeline

| Phase | Week | Key Output |
|---|---|---|
| 0 — Foundation | Week 1 | Running skeleton, auth, CI |
| 1 — Data Layer | Week 2 | All schemas, Deck/Card CRUD |
| 2 — SRS Engine | Week 2–3 | SM-2 pure function + tests |
| 3 — Session API | Week 3–4 | Full session backend |
| 4 — Deck/Card UI | Week 4–5 | Management screens |
| 5 — Session UI | Week 5–6 | Core study experience |
| 6 — Statistics | Week 6–7 | Dashboard + charts |
| 7 — Polish & Launch | Week 7–8 | E2E, deploy, notifications |

**Total**: 8 weeks (1 developer) or 4–5 weeks (2 developers with Phase 4/5/6 parallelised)
