# Tasks: Flashcards Learning – Spaced Repetition System

**Feature**: `1-flashcards-srs`
**Input**: `specs/1-flashcards-srs/` (plan.md, spec.md, data-model.md, research.md, quickstart.md, contracts/)
**Generated**: 2026-03-04
**Total Tasks**: 55 | **User Stories**: 6 | **Phases**: 9

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state dependencies)
- **[Story]**: User story this task belongs to (US1–US6)
- File paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project skeleton, tooling, and CI — no business logic

- [ ] T001 Initialise monorepo with `backend/` and `frontend/` directories; add root `package.json` with workspaces, `turbo.json`, and shared `tsconfig.base.json`
- [ ] T002 [P] Bootstrap backend: `cd backend && npm init -y`; install Express 4, Prisma 5, TypeScript 5, `ts-node`, `dotenv`, `bcrypt`, `jsonwebtoken`, `zod`; add `backend/tsconfig.json`
- [ ] T003 [P] Bootstrap frontend: `npm create vite@latest frontend -- --template react-ts`; install TailwindCSS 3, React Router 6, React Query 5 (TanStack), `axios`; add `frontend/tsconfig.json`
- [ ] T004 [P] Configure ESLint + Prettier for both `backend/` and `frontend/`; add `.eslintrc.cjs`, `.prettierrc`, `.editorconfig` at repository root
- [ ] T005 [P] Add `docker-compose.yml` at repository root: PostgreSQL 16 service with named volume, health-check, and `DATABASE_URL` env var; add `.env.example` template
- [ ] T006 Create GitHub Actions CI workflow in `.github/workflows/ci.yml`: lint → type-check → unit tests → build on every push and PR

**Checkpoint**: `docker compose up` starts PostgreSQL; `npm run lint` and `npm run build` are green in CI

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Auth, database schema, and base middleware — MUST complete before any user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Initialise Prisma in `backend/`: run `npx prisma init`; configure `DATABASE_URL` in `.env`; create full `backend/prisma/schema.prisma` with all 8 models: `User`, `UserSettings`, `Deck`, `Card`, `CardProgress`, `StudySession`, `SessionQueue`, `ReviewLog` and enums `CardState`, `SessionStatus`, `Rating` — include all composite indexes (`@@index([userId, dueDate])` on `CardProgress`; `@@index([userId, reviewedAt])` on `ReviewLog`)
- [ ] T008 [P] Run `npx prisma migrate dev --name init` to generate and apply the initial migration; add `backend/prisma/seed.ts` that creates 2 users (`alice@test.com`, `bob@test.com`), 3 decks per user, and 30 cards per deck; add `npm run seed` script
- [ ] T009 [P] Implement `backend/src/middleware/auth.ts`: JWT `Authorization: Bearer` validation; attach `req.user = { id, email }` on success; return `401 UNAUTHORIZED` on invalid/missing token; export `authenticate` middleware
- [ ] T010 [P] Implement `backend/src/middleware/ownership.ts`: `requireDeckOwnership` middleware that queries `Deck.userId === req.user.id`; returns `403 FORBIDDEN` on mismatch; attach `req.deck` to request
- [ ] T011 [P] Implement `backend/src/middleware/errorHandler.ts`: centralised Express error handler; maps `ZodError` → 400, `PrismaClientKnownRequestError P2025` → 404, uncaught errors → 500; always returns `{ error: { code, message } }` JSON
- [ ] T012 Implement `backend/src/api/auth/auth.routes.ts` and `auth.service.ts`: `POST /api/v1/auth/register` (bcrypt cost 12, return access + refresh JWT), `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh` (validate refresh token, issue new pair), `POST /api/v1/auth/logout` (invalidate refresh token); wire routes in `backend/src/app.ts`
- [ ] T013 [P] Implement `backend/src/lib/prisma.ts`: singleton Prisma client instance with connection pool settings; export as default

**Checkpoint**: `POST /auth/register` and `POST /auth/login` return correct JWT responses; protected endpoint returns 401 without token; migrations run clean on fresh DB

---

## Phase 3: User Story 1 — First Study Session (Priority: P1) 🎯 MVP

**Goal**: A new user can register, create a deck, add cards, start a session, rate all cards, and reach the Session Summary screen — delivering the full SRS core loop end-to-end.

**Independent Test**: Register a new account → create one deck → add 3 cards → `POST /sessions` → `GET next-card` three times (each time confirm `card.back` is absent) → `POST rate` three times → `POST complete` → `GET summary` shows 3 cards studied. No other user story required.

### Implementation for User Story 1

- [ ] T014 [P] [US1] Write `backend/src/lib/srs/sm2.test.ts` (TDD — tests FIRST, all must FAIL before T015): cover all 16 paths (4 ratings × 4 card states: new/learning/review/relearning); include edge cases: `ease_factor` clamp at 1.3 minimum and 2.5 maximum; fuzz factor injection via `randomFn`; `interval` floor/ceil for boundary values; first "Again" on a new card sets `state = relearning`; first "Good" on a new card sets `state = learning`
- [ ] T015 [US1] Implement `backend/src/lib/srs/sm2.ts`: export `calculateNextReview(progress: CardProgress, rating: Rating, randomFn?: () => number): ReviewResult`; implement SM-2 formula; clamp `ease_factor` to [1.3, 2.5]; apply ±5% fuzz via injected `randomFn` only when `interval > 7`; export `initCardProgress(cardId: string, userId: string): CardProgress` with SM-2 defaults; all T014 tests must now pass — depends on T014
- [ ] T016 [US1] Implement `backend/src/lib/srs/queue.ts`: export `getDueCards(prisma, userId, deckId, limit): Promise<Card[]>` — query `CardProgress` where `dueDate <= today AND userId = userId AND card.deckId = deckId`; order: overdue first (oldest `dueDate`), then due today, then new cards (`state = new`) up to `limit` — depends on T007, T015
- [ ] T017 [US1] Implement `backend/src/api/sessions/sessions.service.ts`: `createSession(userId, deckId)` — call `getDueCards()`, snapshot queue to `SessionQueue` table, insert `StudySession` row; `getNextCard(sessionId, userId)` — return next unrated `SessionQueue` item, selecting `card.id, card.front, card.deckId` ONLY (never `card.back`); `rateCard(sessionId, cardId, rating, userId)` — call `calculateNextReview()`, update `CardProgress` + insert `ReviewLog` + mark queue item rated in ONE Prisma transaction; `completeSession(sessionId, userId)` — update `StudySession.status = completed`, compute summary; `abandonSession(sessionId, userId)` — update status but preserve all already-rated `CardProgress` — depends on T015, T016
- [ ] T018 [US1] Implement `backend/src/api/sessions/sessions.routes.ts`: wire all 6 session endpoints: `POST /api/v1/sessions`, `GET /api/v1/sessions/:id/next-card`, `POST /api/v1/sessions/:id/rate`, `POST /api/v1/sessions/:id/complete`, `POST /api/v1/sessions/:id/abandon`, `GET /api/v1/sessions/:id/summary`; apply `authenticate` middleware on all; validate `sessionId` ownership (session must belong to `req.user.id`); return `422` with `{ nextDueDate }` when 0 cards due; return `409 SESSION_LOCKED` if rating submitted to completed session — depends on T009, T017
- [ ] T019 [P] [US1] Implement `frontend/src/services/sessions.ts`: typed API client functions wrapping `axios` for all 6 session endpoints; export `StartSessionResponse`, `NextCardResponse` (no `back` field in type), `RateCardRequest`, `SessionSummary` TypeScript interfaces — depends on T018
- [ ] T020 [P] [US1] Implement `frontend/src/pages/study/StudySessionPage.tsx`: full session UI — show `card.front`; "Show Answer" button reveals back (stored in local state after manual flip call, NOT from next-card API); render `AgainHardGoodEasy` rating bar only after flip; call `rateCard` mutation on button click; show progress bar "Card X of N"; navigate to `SummaryPage` on session complete — depends on T019
- [ ] T021 [US1] Implement `frontend/src/pages/study/SessionSummaryPage.tsx`: display total cards studied, time elapsed, count per rating (Again/Hard/Good/Easy), next scheduled review date; "Back to Deck" and "Study Again" CTA buttons — depends on T020
- [ ] T022 [US1] Implement keyboard shortcuts in `StudySessionPage.tsx`: `Space` = flip card; `1` = Again, `2` = Hard, `3` = Good, `4` = Easy (only active after flip); event listeners mounted/unmounted with `useEffect` — depends on T020
- [ ] T023 [US1] Add session interruption guard in `StudySessionPage.tsx`: use React Router `useBlocker` hook to intercept route changes during an active session; show "Abandon session?" confirm dialog; call `abandonSession` API on confirm; allow navigation on cancel — depends on T020

**Checkpoint**: Register → create deck → add cards → complete a full study session → reach Summary screen. All SM-2 unit tests pass. `GET /next-card` response is verified to never contain `card.back`.

---

## Phase 4: User Story 2 — Deck & Card Management (Priority: P1)

**Goal**: A user can create, edit, and delete Decks and Cards to build their study library. Fully testable independently of the study session.

**Independent Test**: Create a deck → add 5 cards → edit one card → delete one card → verify deck shows 4 cards and the edited content. Attempt to access another user's deck by URL → receive 403.

### Implementation for User Story 2

- [ ] T024 [P] [US2] Implement `backend/src/api/decks/decks.service.ts`: `createDeck(userId, name, description)`, `listDecks(userId)` (returns `_count.cards` via Prisma relation), `getDeck(id, userId)`, `updateDeck(id, userId, data)`, `deleteDeck(id, userId)` (cascade via Prisma), `exportDeckAsCsv(id, userId)` — returns CSV string `front,back` per card — depends on T007, T008
- [ ] T025 [P] [US2] Implement `backend/src/api/decks/decks.routes.ts`: `GET /api/v1/decks`, `POST /api/v1/decks`, `GET /api/v1/decks/:id`, `PATCH /api/v1/decks/:id`, `DELETE /api/v1/decks/:id`, `GET /api/v1/decks/:id/export`; apply `authenticate` + `requireDeckOwnership` (except POST/GET list); validate with Zod: name max 100 chars, description max 500 chars — depends on T009, T010, T024
- [ ] T026 [P] [US2] Implement `backend/src/api/cards/cards.service.ts`: `createCard(deckId, userId, front, back, mediaUrl?, tags?)`, `listCards(deckId, userId, filters?)`, `getCard(cardId, deckId, userId)`, `updateCard(cardId, deckId, userId, data)`, `deleteCard(cardId, deckId, userId)` — all verify deck ownership before acting; `createCard` also inserts initial `CardProgress` via `initCardProgress()` — depends on T015, T024
- [ ] T027 [P] [US2] Implement `backend/src/api/cards/cards.routes.ts`: `GET /api/v1/decks/:id/cards`, `POST /api/v1/decks/:id/cards`, `GET /api/v1/decks/:id/cards/:cardId`, `PATCH /api/v1/decks/:id/cards/:cardId`, `DELETE /api/v1/decks/:id/cards/:cardId`; validate front/back max 1000 chars; apply `authenticate` + `requireDeckOwnership` — depends on T025, T026
- [ ] T028 [US2] Implement `frontend/src/services/decks.ts` and `frontend/src/services/cards.ts`: typed API client functions for all Deck and Card endpoints; export TypeScript interfaces `Deck`, `DeckWithCount`, `Card`, `CreateDeckInput`, `CreateCardInput` — depends on T025, T027
- [ ] T029 [P] [US2] Implement `frontend/src/pages/decks/DeckListPage.tsx`: grid of `DeckCard` components showing name, `card_count`, due badge; FAB "Create Deck" opens `CreateDeckModal`; empty state with CTA when user has 0 decks; uses React Query `useQuery` — depends on T028
- [ ] T030 [P] [US2] Implement `frontend/src/pages/decks/DeckDetailPage.tsx`: card list with state badge (New/Learning/Review/Relearning) filter tabs; `due_today` count; "Study Now" button (disabled when 0 due); "Add Card" button; pagination; delete deck button with confirmation dialog showing cascade warning — depends on T028
- [ ] T031 [P] [US2] Implement `frontend/src/pages/cards/CardEditorPage.tsx`: front/back `<textarea>` with character counters; image upload field (JPG/PNG/GIF/WebP, max 5MB — client-side validation before upload); tag input with Enter/comma to add and Backspace to remove; live preview pane mirroring study session card layout; save/cancel buttons — depends on T028
- [ ] T032 [US2] Implement `frontend/src/components/deck/CreateDeckModal.tsx` and `EditDeckModal.tsx`: controlled React Hook Form forms with inline validation; call `createDeck`/`updateDeck` mutations; invalidate `useQuery` on success; show error toast on failure — depends on T028, T029

**Checkpoint**: Full CRUD for Decks and Cards works in both backend and frontend. Ownership validation blocks cross-user access. Deck list shows correct `card_count` via `_count`.

---

## Phase 5: User Story 3 — Spaced Repetition Scheduling (Priority: P1)

**Goal**: The SM-2 algorithm correctly schedules every card. All 16 rating × state paths produce spec-correct outputs. This story's core was implemented in Phase 3 (T014–T015); this phase adds validation endpoints and ensures integration with the full card lifecycle.

**Independent Test**: Create a card → rate "Good" (interval = 1 day) → simulate next day → rate "Good" again (interval = 1 × 2.5 = 2.5 → ceil = 3 days) → verify `CardProgress.dueDate` and `interval` match SM-2 formula exactly.

### Implementation for User Story 3

- [ ] T033 [US3] Add `backend/src/api/sessions/sessions.service.ts` integration test in `backend/tests/integration/sessions.integration.test.ts`: test full flow — seed deck with 3 cards; `POST /sessions`; call `next-card` 3×; `POST rate` with ratings `again, good, easy`; `POST complete`; query DB and assert each `CardProgress.interval`, `ease_factor`, `dueDate`, `state` matches SM-2 spec — confirms T015 SM-2 logic is correctly wired through the full HTTP stack — depends on T018
- [ ] T034 [US3] Add `backend/src/lib/srs/sm2.test.ts` edge-case additions (if not already covered in T014): fuzz factor test with `randomFn = () => 0.05` and `randomFn = () => -0.05`; boundary: `interval = 7` (no fuzz), `interval = 8` (fuzz applied); floating-point: `interval = 4, easeFactor = 2.5` → `10` not `9.99...` — depends on T015
- [ ] T035 [US3] Implement `backend/src/api/cards/cards.service.ts` method `getCardProgress(cardId, userId): CardProgress` and expose `GET /api/v1/decks/:id/cards/:cardId/progress` endpoint returning `{ state, interval, easeFactor, dueDate, repetitions }` — used by frontend card detail and study session hover preview — depends on T027
- [ ] T036 [P] [US3] Update `frontend/src/pages/study/StudySessionPage.tsx`: show interval preview on rating button hover — "Again — tomorrow", "Hard — 2 days", "Good — 4 days", "Easy — 8 days"; fetch preview from local `calculateNextReview()` equivalent or from `CardProgress` in session state — depends on T020, T035

**Checkpoint**: All 16 SM-2 paths produce spec-correct outputs. Integration test verifies `CardProgress` is updated correctly through the full HTTP stack. Interval preview shown on rating buttons.

---

## Phase 6: User Story 4 — Progress & Statistics (Priority: P2)

**Goal**: A user can see their learning progress via dashboard stats, retention rate, activity heatmap, and per-deck statistics.

**Independent Test**: Complete 5 sessions over 3 simulated days → view Dashboard (correct streak, due count, retention rate) → view Statistics (heatmap highlights correct dates, forecast shows future due cards).

### Implementation for User Story 6

- [ ] T037 [P] [US4] Implement `backend/src/api/stats/stats.service.ts`: `getDashboardStats(userId)` — query `CardProgress` for `due_today` count, compute streak from consecutive `ReviewLog` dates grouped by `date(reviewed_at AT TIME ZONE user.timezone)`, compute retention as `(hard+good+easy) / total` from last 30 days; `getHeatmap(userId, days=90)` — aggregate `ReviewLog` by date; `getForecast(userId, days=30)` — aggregate `CardProgress.dueDate` future counts; `getRetentionTrend(userId, days=30)` — rolling daily retention rate — depends on T008
- [ ] T038 [P] [US4] Implement `backend/src/api/stats/stats.routes.ts`: `GET /api/v1/stats/dashboard`, `GET /api/v1/stats/heatmap`, `GET /api/v1/stats/forecast`, `GET /api/v1/stats/retention`, `GET /api/v1/decks/:id/stats`; all require `authenticate`; return `{ data, generatedAt }` envelope — depends on T009, T037
- [ ] T039 [P] [US4] Implement `frontend/src/services/stats.ts`: typed API client for all stats endpoints; export interfaces `DashboardStats`, `HeatmapEntry`, `ForecastEntry`, `RetentionPoint`, `DeckStats`; use React Query with `staleTime: 60_000` (stats are not real-time) — depends on T038
- [ ] T040 [P] [US4] Implement `frontend/src/pages/dashboard/DashboardPage.tsx`: due count tile, streak tile, retention rate gauge; mini activity heatmap (last 7 days); deck preview list sorted by `due_today` descending; "Study" button per deck; empty state for new users; lazy-load Recharts — depends on T039
- [ ] T041 [US4] Implement `frontend/src/pages/stats/StatsPage.tsx`: lazy-loaded via `React.lazy()` + `Suspense`; 90-day activity heatmap (`CalendarHeatmap` component) with hover tooltip "Date — N cards reviewed"; 30-day forecast bar chart (Recharts `BarChart`); retention trend line chart (Recharts `LineChart`); per-deck stats table with sort; card state distribution stacked bar chart — depends on T039, T040

**Checkpoint**: Dashboard shows correct due count, streak, and retention after completing sessions. Heatmap highlights active study days. Charts lazy-load without blocking initial render. Streak uses user timezone, not UTC.

---

## Phase 7: User Story 5 — Bulk Card Import (Priority: P2)

**Goal**: A user can upload a CSV file to bulk-create cards in a deck. Valid rows are imported; invalid rows are skipped with a count summary shown.

**Independent Test**: Upload 10-row CSV with `front,back` columns → verify 10 cards created. Upload CSV with 2 rows missing `back` → verify "8 imported, 2 skipped". Upload `.docx` → verify error message. Upload 501-row CSV → verify max-row error.

### Implementation for User Story 5

- [ ] T042 [P] [US5] Implement `backend/src/api/cards/import.service.ts`: `importCardsFromCsv(deckId, userId, csvBuffer)` — parse CSV with `csv-parse`; validate each row: `front` and `back` required; skip invalid rows; reject if row count > 500; use `prisma.$transaction([...createMany])` for atomic batch insert; also call `initCardProgress()` for each new card; return `{ imported: number, skipped: number, errors: string[] }` — depends on T026
- [ ] T043 [P] [US5] Add `POST /api/v1/decks/:id/import` route in `backend/src/api/cards/cards.routes.ts`: accept `multipart/form-data` with `file` field (use `multer` with `memoryStorage`); validate MIME type `text/csv`; call `importCardsFromCsv()`; return 200 with `{ imported, skipped }` or 400 with error — depends on T042
- [ ] T044 [US5] Implement `frontend/src/components/card/CsvImportModal.tsx`: file picker restricted to `.csv`; client-side size check ≤ 5MB; upload with `axios` progress event → animated progress bar; on success show toast "N imported, N skipped"; on error show inline error message; "Cancel" button aborts upload (`AbortController`); invalidate card list query on success — depends on T043, T030

**Checkpoint**: CSV import works end-to-end. 500-row limit enforced. Invalid rows skipped with accurate count. Non-CSV files rejected with clear error.

---

## Phase 8: User Story 6 — Notifications & Reminders (Priority: P3)

**Goal**: A user can enable a daily reminder that fires only when they have due cards, via their chosen channel (email default, Web Push opt-in).

**Independent Test**: Enable email reminder at current time + 2 minutes → wait → verify notification email received. Enable reminder but set all cards' `dueDate` to tomorrow → verify no notification sent. Disable reminder → verify no notification sent.

### Implementation for User Story 6

- [ ] T045 [P] [US6] Implement `backend/src/api/settings/settings.routes.ts` and `settings.service.ts`: `GET /api/v1/settings` returns `UserSettings`; `PATCH /api/v1/settings` updates `dailyNewCards`, `maxReviewsPerDay`, `reminderEnabled`, `reminderTime`, `reminderChannel`, `timezone`; apply `authenticate`; validate with Zod — depends on T009, T007
- [ ] T046 [P] [US6] Implement `backend/src/lib/notifications/reminder.job.ts`: cron job (using `node-cron`) that runs every minute; queries users where `reminderEnabled = true AND reminderTime <= now()`; for each user queries `CardProgress` for `dueDate <= today`; if `count > 0` sends notification via `reminderChannel`; email via `nodemailer` SMTP; Web Push via `web-push` library; marks `lastReminderSentAt = now()` to prevent duplicate sends within 24 hours — depends on T045
- [ ] T047 [P] [US6] Add `POST /api/v1/notifications/subscribe` endpoint in `backend/src/api/settings/settings.routes.ts`: accept Web Push subscription object `{ endpoint, keys: { p256dh, auth } }`; save to `UserSettings.webPushSubscription` (JSON column); requires `authenticate` — depends on T045
- [ ] T048 [US6] Implement `frontend/src/pages/settings/SettingsPage.tsx`: daily new card limit input (1–100); max reviews/day input (1–500); reminder toggle; time picker; channel selector (Email / Web Push); "Request Push Permission" button that calls `Notification.requestPermission()` and `POST /notifications/subscribe`; save button calls `PATCH /settings`; uses React Hook Form with Zod validation — depends on T045, T047

**Checkpoint**: Settings page saves and loads correctly. Reminder fires exactly once per day when due cards > 0. No notification sent when no due cards or reminders disabled. Web Push and email both handled.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, performance hardening, onboarding, and production deployment

- [ ] T049 [P] Write `frontend/tests/e2e/core-loop.spec.ts` (Playwright): E2E journey 1 — Register → Create Deck → Add 3 Cards → Start Session → Rate all → Session Summary shows 3 cards; use `waitForResponse()`, never `waitForTimeout()`
- [ ] T050 [P] Write `frontend/tests/e2e/bulk-import.spec.ts` (Playwright): E2E journey 2 — Login → Open deck → Import 20-row CSV → Verify `card_count = 20`; also test malformed CSV shows error
- [ ] T051 [P] Write `frontend/tests/e2e/scheduling.spec.ts` (Playwright): E2E journey 3 — Rate all cards "Again" → verify all rescheduled for tomorrow; check due count on dashboard drops to 0
- [ ] T052 [P] Write `frontend/tests/e2e/ownership.spec.ts` (Playwright): E2E journey 4 — Log in as alice; attempt to fetch bob's deck by ID; verify 403; verify deck list shows only alice's decks
- [ ] T053 [P] Write `frontend/tests/e2e/deck-delete.spec.ts` (Playwright): E2E journey 5 — Create deck with 5 cards → delete deck → verify deck and all cards gone; confirm no orphaned `CardProgress` records
- [ ] T054 Add onboarding tooltip overlay in `frontend/src/components/onboarding/OnboardingOverlay.tsx`: shown only on first session for new users (tracked in `localStorage`); highlights "Add Card" button, "Study Now" button, and rating bar; dismissable with "Got it" button — depends on T023
- [ ] T055 Create `Dockerfile` for backend and `Dockerfile` for frontend; update `docker-compose.yml` with both app services behind a Caddy reverse proxy; add `GET /api/v1/health` endpoint returning `{ status: "ok", db: "connected", ts: ISO8601 }`; write `scripts/smoke-test.sh` that performs register → add card → study → complete and asserts all 200 responses

**Checkpoint**: All 5 E2E journeys pass in CI against a clean database. Application accessible at production URL with HTTPS. Smoke test passes within 2 minutes of deploy.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup          → no dependencies
Phase 2: Foundational   → Phase 1
Phase 3: US1 (Session)  → Phase 2 (auth + schema + Prisma)
Phase 4: US2 (Decks)    → Phase 2 (can parallel with Phase 3 after T013)
Phase 5: US3 (SRS)      → Phase 3 (SM-2 already in T014-T015, adds integration)
Phase 6: US4 (Stats)    → Phase 2 + Phase 3 (needs ReviewLog data)
Phase 7: US5 (Import)   → Phase 4 (needs Card service T026)
Phase 8: US6 (Notifs)   → Phase 2 (needs UserSettings) + Phase 6 (due count)
Phase 9: Polish         → Phases 3–8 all complete
```

### User Story Dependencies

| Story | Depends on | Can parallel with |
|---|---|---|
| US1 — Study Session | Foundational (Phase 2) | US2 backend after T013 |
| US2 — Deck/Card CRUD | Foundational (Phase 2) | US1 (different files) |
| US3 — SRS Scheduling | US1 Phase 3 (T014–T015 already in P3) | US2 frontend |
| US4 — Statistics | Foundational + US1 (needs `ReviewLog`) | US2, US3 |
| US5 — Bulk Import | US2 (needs `cards.service.ts`) | US4, US6 |
| US6 — Notifications | Foundational + US4 (due card count) | US5 |

### Critical TDD Constraint

> **T014 (SM-2 tests) MUST be committed and all tests MUST be failing before T015 (SM-2 implementation) begins. This is a constitutional non-negotiable.**

### Within Each Story

1. Backend service → Backend routes → Frontend service → Frontend UI
2. Tests (if requested) written before implementation
3. Ownership validation verified before merging any mutation endpoint

---

## Parallel Execution Examples

### Phase 2 (Foundational) — run in parallel

```
T007 Schema + migrations
T008 Seed script                  (different file from T007 once schema exists)
T009 auth.ts middleware           [P]
T010 ownership.ts middleware      [P]
T011 errorHandler.ts              [P]
T013 prisma.ts singleton          [P]
T012 auth routes (sequential: needs T009, T013)
```

### Phase 3 (US1 Study Session) — sequential then parallel

```
T014 sm2.test.ts (FIRST — all must FAIL)
T015 sm2.ts implementation (after T014)
T016 queue.ts getDueCards (after T015)
T017 sessions.service.ts (after T015, T016)
T018 sessions.routes.ts (after T017)
─── backend complete ───
T019 frontend/services/sessions.ts  [P]   (after T018)
T020 StudySessionPage.tsx           [P]   (after T019)
T021 SessionSummaryPage.tsx         [P]   (after T020)
T022 Keyboard shortcuts             (after T020)
T023 Route guard / abandon dialog   (after T020)
```

### Phase 4 (US2 Decks) — parallel backend, then parallel frontend

```
T024 decks.service.ts   [P]
T025 decks.routes.ts    [P]   (after T024)
T026 cards.service.ts   [P]
T027 cards.routes.ts    [P]   (after T026)
─── backend complete ───
T028 services/decks.ts + cards.ts   (after T025, T027)
T029 DeckListPage.tsx    [P]        (after T028)
T030 DeckDetailPage.tsx  [P]        (after T028)
T031 CardEditorPage.tsx  [P]        (after T028)
T032 CreateDeckModal.tsx (after T029)
```

### Phase 9 (Polish) — all E2E tests parallel

```
T049 core-loop.spec.ts       [P]
T050 bulk-import.spec.ts     [P]
T051 scheduling.spec.ts      [P]
T052 ownership.spec.ts       [P]
T053 deck-delete.spec.ts     [P]
T054 OnboardingOverlay.tsx   [P]
T055 Docker + smoke-test     (sequential: needs all E2E to pass first)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL** — blocks all stories)
3. Complete Phase 3: User Story 1 (T014 → T015 → T016 → T017 → T018 → T019 → T020 → T021)
4. **STOP and VALIDATE**: Complete the independent test for US1 manually
5. Deploy/demo the core SRS loop

### Incremental Delivery

1. Setup + Foundational → Foundation ready for all stories
2. US1 (P1) → Core loop works → **MVP Demo**
3. US2 (P1) → Deck/Card management → **Content creation works**
4. US3 (P1) → SRS integration tests → **Scheduling verified end-to-end**
5. US4 (P2) → Statistics → **Progress visibility**
6. US5 (P2) → Bulk import → **Power user feature**
7. US6 (P3) → Notifications → **Habit formation**
8. Polish → E2E + Deploy → **Production ready**

### Parallel Team Strategy (2 developers)

After Phase 2 (Foundational) is complete:

- **Developer A**: Phase 3 (US1 — session backend + UI)
- **Developer B**: Phase 4 (US2 — deck/card backend + UI)

Both can proceed independently. US3 validation (T033–T036) runs after US1 backend completes. US4 (Stats) can begin after US1 produces `ReviewLog` entries.

---

## Notes

- `[P]` tasks operate on different files and have no dependency on in-progress tasks — safe to run in parallel
- `[US?]` label maps each task to its user story for traceability
- **Never** expose `card.back` in `GET /sessions/:id/next-card` — validated in T017 and T033
- **TDD order for SM-2**: T014 before T015 — constitutional non-negotiable
- All session mutations (rate, complete, abandon) use `prisma.$transaction` — verified in T033
- `card_count` uses Prisma `_count` (no stored column) — implemented in T024
- Timezone-aware streak calculation uses `UserSettings.timezone` — implemented in T037
- Commit after each task or logical group; stop at any phase checkpoint to validate independently
