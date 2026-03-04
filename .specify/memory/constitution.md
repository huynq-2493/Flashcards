# Flashcards Learning — Project Constitution

> **App Name:** Flashcards Learning
> **Core Purpose:** Help users memorize information efficiently using spaced repetition (SRS).
> **Core Loop:** Create Deck → Add Cards → Start Session → Rate each card (Again / Hard / Good / Easy) → System auto-schedules next review date.

---

## I. Core Principles

### 1. Science-Backed Learning First
Every scheduling, UX, and product decision must serve the learning outcome. The SM-2 spaced repetition algorithm is the foundation — no feature may bypass or degrade it. Engagement mechanics (streaks, points) are secondary to retention effectiveness.

### 2. Radical Simplicity
The system must be operable with minimal cognitive overhead. A user should focus entirely on *learning*, not on navigating the app. Every screen, interaction, and data field must justify its existence by directly serving the core loop.

### 3. User Autonomy & Transparency
Users own their data and their schedule. The system must clearly communicate *why* a card is due, *when* it will appear next, and *how* their rating affects the schedule. No black-box scheduling.

### 4. Reliability of Schedule (NON-NEGOTIABLE)
The review schedule is the product's core value. Loss of `CardProgress` data — due to bugs, migrations, or deployment failures — is a P0 incident. All scheduling state changes must be persisted atomically (database transactions).

### 5. Test-First for the SRS Engine (NON-NEGOTIABLE)
The `calculateNextReview()` function and all scheduling logic must be implemented test-first (TDD). Tests must cover all rating paths, edge cases (new card, relearning, ease factor clamping), and be approved before implementation begins.

### 6. Single Most Important Metric
> **Retention Rate** — the percentage of cards reviewed on or before their due date, measured over a rolling 30-day window.

All feature prioritization decisions must ask: *does this improve or maintain retention rate?*

---

## II. Domain Boundaries

### In-Scope
- User account management (registration, login, settings)
- Deck management (create, edit, delete, import/export CSV)
- Card management (front/back text, optional image attachment, tags)
- Study Session lifecycle (start, serve cards, receive ratings, complete)
- SRS scheduling engine (SM-2 algorithm, due-card queue)
- Progress statistics (retention rate, streak, card maturity distribution, activity heatmap)
- Daily review reminders (browser push notification or email)

### Out-of-Scope (v1.0)
- ❌ AI-generated card content or explanations
- ❌ Social features (shared decks, leaderboards, following users)
- ❌ Gamification beyond study streaks (badges, XP, levels)
- ❌ Collaborative / real-time editing of decks
- ❌ Native mobile applications (web-first; PWA considered for v2)
- ❌ Audio/video card media (text and image only in v1)
- ❌ Custom SRS algorithm configuration by end users (algorithm params are system-managed)

---

## III. Technical Constraints

### Stack

| Layer | Technology |
|---|---|
| Frontend | React (TypeScript), TailwindCSS, React Query |
| Backend | Node.js (TypeScript), REST API |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT (access + refresh token pattern) |
| Testing | Vitest (unit), Supertest (integration), Playwright (E2E) |
| Deployment | Docker + single VPS or managed PaaS (Railway / Render) |

### Data Persistence
- **Cloud-synced, server-authoritative.** All `CardProgress` and `ReviewLog` data lives in PostgreSQL. No local-only storage for scheduling state.
- Offline study is **out of scope for v1**. The app requires an active network connection.

### SRS Algorithm
- **SM-2 standard algorithm** is the required implementation for v1.
- The algorithm must be encapsulated as a **pure, side-effect-free function**: `calculateNextReview(progress: CardProgress, rating: Rating): ReviewResult`
- Algorithm parameters (ease factor bounds, interval multipliers) are constants in code, not user-configurable in v1.

### API Design
- RESTful JSON API. No GraphQL in v1.
- All endpoints require authentication except `/auth/register` and `/auth/login`.
- User ownership must be validated on every Deck/Card/Session mutation.

---

## IV. User Personas

### Persona A — The Language Learner (Primary)
- **Profile:** 18–35 years old, learning a foreign language (vocabulary, kanji, conjugations)
- **Motivation:** Systematic vocabulary retention without manual scheduling
- **Pain Points with existing apps:**
  - Anki: Powerful but steep learning curve; UI feels dated and intimidating
  - Quizlet: No true spaced repetition; gamification distracts from deep learning
  - Duolingo: No custom content; algorithm is opaque
- **Success Looks Like:** Reviews 20 cards/day consistently, retention rate >85% after 30 days

### Persona B — The Student (Secondary)
- **Profile:** University student preparing for exams (medicine, law, certifications)
- **Motivation:** Retain large volumes of factual information over a semester
- **Pain Points:**
  - Apps don't handle 500+ card decks efficiently
  - No visibility into which cards are weakest
  - Cram mode encourages short-term memory, not long-term retention
- **Success Looks Like:** Can identify their 20 weakest cards at any time; zero overdue cards the week before an exam

### Persona C — The Professional (Tertiary)
- **Profile:** Professional learning a new domain (e.g., cloud certifications, legal terms)
- **Motivation:** Maintain a knowledge base that doesn't fade over months
- **Pain Points:** No app optimizes for *long intervals* (months); most apps assume daily use
- **Success Looks Like:** Card intervals extending to 30+ days with high retention

---

## V. Quality Attributes

### Performance

| Scenario | Target |
|---|---|
| Study session first card load | < 1 second (p95) |
| Rating submission + next card load | < 500ms (p95) |
| Dashboard statistics render | < 2 seconds (p95) |
| API response (any endpoint) | < 300ms (p95) excluding cold start |

### Reliability

| Requirement | Standard |
|---|---|
| `CardProgress` data loss | Zero tolerance — P0 incident |
| Scheduling state update | Must use DB transaction (CardProgress + ReviewLog atomically) |
| API uptime | ≥ 99.5% monthly |
| Data backup | Daily automated backup, 30-day retention |

### Usability

| Scenario | Target |
|---|---|
| Time to first study session (new user) | ≤ 2 minutes from signup |
| Complete a 10-card session | ≤ 5 minutes |
| Create a 20-card deck | ≤ 10 minutes |
| No onboarding tutorial required | Core loop must be self-explanatory |

### Security
- All API endpoints are authenticated except auth routes
- User can only access their own Decks, Cards, Sessions, and Progress data
- Passwords hashed with bcrypt (cost factor ≥ 12)
- JWT secrets rotated via environment variables; never committed to source control

---

## VI. Decision Log Format

All significant architectural and product decisions must be recorded as **Architecture Decision Records (ADRs)** in `.specify/decisions/`.

### ADR File Naming
```
.specify/decisions/
  ADR-001-use-sm2-algorithm.md
  ADR-002-postgresql-over-sqlite.md
  ADR-003-rest-over-graphql.md
```

### ADR Template
```markdown
# ADR-{NNN}: {Title}

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-{NNN}

## Context
What is the situation that requires a decision?

## Decision
What was decided?

## Rationale
Why was this option chosen over alternatives?

## Consequences
What are the trade-offs and implications of this decision?

## Alternatives Considered
List of options evaluated and why they were rejected.
```

### When to Write an ADR
- Choosing a technology (language, framework, database, library)
- Defining a cross-cutting concern (auth strategy, error format, logging)
- Changing the SRS algorithm or scheduling rules
- Any decision that, if changed later, would require significant refactoring

---

## Governance

1. This Constitution supersedes all other practices, style guides, and conventions in case of conflict.
2. Any amendment to the Constitution requires: written justification, team review, and an updated ADR if a technical decision is affected.
3. All pull requests must include a checklist item: *"This change complies with the Project Constitution."*
4. The SRS engine's test suite must remain green at all times — no merge permitted if SRS unit tests fail.
5. `CardProgress` schema changes require a migration plan reviewed before implementation begins.

---

**Version**: 1.0.0 | **Ratified**: 2026-03-04 | **Last Amended**: 2026-03-04
