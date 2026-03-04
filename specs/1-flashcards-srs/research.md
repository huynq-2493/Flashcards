# Research: Flashcards Learning – SRS Implementation

**Phase**: 0 — Research
**Date**: 2026-03-04
**Plan**: [plan.md](plan.md)

---

## Research Questions & Decisions

---

### 1. SRS Algorithm: SM-2 vs FSRS

**Question**: Should we implement SM-2 (classic) or FSRS (Free Spaced Repetition Scheduler, the modern Anki algorithm)?

**Decision**: SM-2 for v1.

**Rationale**:
- SM-2 is widely understood, well-documented, and has decades of published research backing its effectiveness
- FSRS requires computing memory state with a 17-parameter model and needs a large review history to calibrate — unsuitable for new users with no data
- SM-2 can be implemented as a ~50-line pure function; FSRS requires a statistical model
- FSRS can be added in v2 as an opt-in upgrade path without breaking existing `CardProgress` records

**Alternatives Considered**:
- **FSRS 4.5**: More accurate retention prediction at long intervals, but complex calibration requirement makes it a poor fit for v1 users with small decks
- **Leitner Box System**: Simpler but less granular (5 boxes vs continuous intervals); rejected for lower retention accuracy

**References**:
- [SM-2 Algorithm by Piotr Wozniak](https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method)
- [FSRS Paper](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm)

---

### 2. Backend Framework: Express vs Fastify vs Hono

**Question**: Which Node.js HTTP framework provides the best balance of simplicity, ecosystem maturity, and performance for a REST API?

**Decision**: Express 4.

**Rationale**:
- Express has the largest ecosystem, most StackOverflow answers, and widest team familiarity
- For 10k users with simple REST endpoints, Express throughput (30k req/s) is more than sufficient
- Fastify is faster but adds complexity for limited v1 gain; Hono is newer with less ecosystem support

**Alternatives Considered**:
- **Fastify**: 2-3× faster than Express, but TypeScript decorators and plugin system increase initial complexity
- **Hono**: Edge-native, excellent TypeScript DX, but limited ecosystem for Prisma integration patterns

---

### 3. ORM: Prisma vs Drizzle vs TypeORM

**Question**: Which ORM best fits PostgreSQL + TypeScript + migration-first workflow?

**Decision**: Prisma 5.

**Rationale**:
- Prisma's schema-first approach generates type-safe clients automatically — eliminates an entire class of runtime type errors
- `prisma migrate dev` provides clear, versioned migration history
- Prisma's query API (findMany with `where`, `include`, `_count`) handles all required queries (due-card queue, stats aggregation)
- The `$transaction()` API is clean and explicit — essential for the `CardProgress + ReviewLog` atomic write requirement

**Alternatives Considered**:
- **Drizzle**: Lighter and more SQL-like, but schema sync tooling is less mature; migration story less clear
- **TypeORM**: Decorator-based approach introduces more boilerplate; entity class mutations can cause subtle bugs

---

### 4. Frontend: Vite vs Create React App vs Next.js

**Question**: Which React setup is appropriate for a web SPA?

**Decision**: Vite + React 18.

**Rationale**:
- Vite provides near-instant HMR; no build config complexity for a pure SPA
- This app has no SSR requirements (all data is user-authenticated, no SEO needed)
- Next.js would add complexity (routing conventions, server components) without benefit for a fully-authenticated SPA
- CRA is deprecated

**Alternatives Considered**:
- **Next.js (App Router)**: Overkill for an authenticated SPA; server components incompatible with heavy client-side interactivity (card flip, keyboard shortcuts, session state)
- **Remix**: Good SPA support but less familiar; adds form-centric patterns that don't match session flow

---

### 5. State Management: React Query vs SWR vs Zustand + fetch

**Question**: How should the frontend manage server state (deck lists, card data, session state)?

**Decision**: React Query (TanStack Query v5) only; no separate global state store.

**Rationale**:
- 95% of app state is server state (decks, cards, session queue, stats) — React Query handles it perfectly
- Session flow state (current card, flip state, rating buttons visible) is local component state — no global store needed
- Zustand or Redux would add unnecessary complexity for a relatively small UI

**Alternatives Considered**:
- **SWR**: Simpler but less powerful (no mutation rollback, weaker cache invalidation)
- **Zustand + fetch**: Requires manual cache management; React Query does this for free

---

### 6. Chart Library for Statistics

**Question**: Which charting library should be used for the statistics screen?

**Decision**: Recharts.

**Rationale**:
- Recharts is React-native (not a wrapper), has excellent TypeScript types, and supports all required chart types (line, bar, stacked bar)
- Bundle size: ~150KB gzipped — acceptable for a lazy-loaded stats page
- The heatmap will be a custom CSS grid component (no library needed for a simple calendar grid)

**Alternatives Considered**:
- **Chart.js**: Not React-native; requires `useEffect` wrappers that introduce lifecycle bugs
- **D3.js**: Maximum flexibility but high complexity; overkill for 4 standard chart types
- **Victory**: Good TypeScript support but larger bundle (~250KB)

---

### 7. Notification System: Web Push vs Email

**Question**: What is the primary channel for daily study reminders?

**Decision**: Email via SMTP (Nodemailer) as default; Web Push as opt-in enhancement.

**Rationale**:
- Web Push requires HTTPS, a service worker, and explicit browser permission — high friction for new users
- iOS Safari only supported Web Push from version 16.4 (2023); many users still on older versions
- Email has universal support and lower permission friction
- Web Push can be added progressively as an enhancement in Phase 7

**Alternatives Considered**:
- **Web Push only**: Browser permission denial rate is ~30–40% in cold-ask scenarios; risks frustrating new users
- **SMS**: Cost per message prohibitive without a paid plan; out-of-scope for v1

---

### 8. Card Count: Stored Counter vs Computed

**Question**: Should `Deck.card_count` be a stored integer column (updated on card create/delete) or computed at query time?

**Decision**: Computed via Prisma `_count` aggregate.

**Rationale**:
- A stored counter requires careful synchronization on create, delete, and bulk import — three separate code paths prone to drift
- Prisma's `include: { _count: { select: { cards: true } } }` computes the count in a single SQL query with no risk of stale data
- At expected scale (< 1000 cards/deck), this query is trivially fast and covered by a `Card.deck_id` index

**Alternatives Considered**:
- **Stored integer counter**: Faster reads but complex write path (must use transactions everywhere); risks incorrect counts on bugs
- **Materialized view**: Overkill for this scale

---

### 9. Session Queue Storage: In-Memory vs Database

**Question**: Should the session card queue (the ordered list of cards to study in a session) be stored in the database or computed on each `next-card` request?

**Decision**: Stored in database as a `SessionQueue` join table (card_id, session_id, position, rated_at).

**Rationale**:
- Storing in-memory loses the queue on server restart or horizontal scaling
- Recomputing the queue on every `next-card` request would re-query `CardProgress` and could change the queue mid-session (e.g., if the daily new card limit changes)
- A `SessionQueue` table makes the session resumable after browser close
- The table can be cleaned up after session completion

**Alternatives Considered**:
- **Redis sorted set**: Fast but adds infrastructure dependency (Redis); overkill for expected scale
- **Recompute on each request**: Simple but non-deterministic mid-session; violates the spec requirement for consistent queue ordering

---

### 10. Fuzz Factor Implementation

**Question**: The SM-2 spec requires a ±5% fuzz on intervals > 7 days to prevent review clustering. How should randomness be injected while keeping the `calculateNextReview()` function testable?

**Decision**: Inject a `randomFn` parameter (default `Math.random`) for production; inject a seeded deterministic function in tests.

**Rationale**:
- Pure function purity is maintained — the function itself has no side effects
- Tests can use `() => 0.5` to produce deterministic outputs
- Production uses `Math.random()` transparently

```typescript
// Signature
function calculateNextReview(
  progress: CardProgress,
  rating: Rating,
  randomFn: () => number = Math.random
): ReviewResult
```

---

## Resolved NEEDS CLARIFICATION Items

| Item | Resolution |
|---|---|
| SRS algorithm: SM-2 or FSRS? | SM-2 for v1; FSRS upgrade path in v2 |
| Card count: stored or computed? | Computed via Prisma `_count` |
| Session queue: in-memory or DB? | Stored in `SessionQueue` DB table |
| Notification channel | Email default; Web Push opt-in |
| Frontend framework | Vite + React 18 (SPA, no SSR) |
| Chart library | Recharts (lazy-loaded stats page) |
| Fuzz factor testability | Injected `randomFn` parameter |
