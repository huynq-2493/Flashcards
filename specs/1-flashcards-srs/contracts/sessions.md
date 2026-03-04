# Contract: Sessions

**Base URL**: `/api/v1`
**Auth Required**: Yes — `Authorization: Bearer <access_token>` on all endpoints.

---

## POST `/sessions`

Start a new study session for a deck. Builds and persists the session queue (overdue + due today + new cards up to daily limit).

**Request**
```json
{
  "deck_id": "uuid"
}
```

**Response `201 Created`**
```json
{
  "id": "uuid",
  "deck_id": "uuid",
  "deck_name": "Japanese N5 Vocabulary",
  "status": "active",
  "queue_size": 15,
  "new_cards": 5,
  "review_cards": 10,
  "started_at": "2026-03-04T10:00:00.000Z"
}
```

**Errors**
| Status | Code | Condition |
|---|---|---|
| 403 | `FORBIDDEN` | Deck belongs to another user |
| 404 | `DECK_NOT_FOUND` | No deck with this ID |
| 409 | `SESSION_ALREADY_ACTIVE` | An active session exists for this deck; response includes `{ "session_id": "uuid" }` |
| 422 | `NO_CARDS_DUE` | Zero cards in queue; response includes `{ "next_due_date": "2026-03-05" }` |

---

## GET `/sessions/:sessionId/next-card`

Return the next unrated card in the session queue.

**⚠️ NEVER returns `card.back` in the response.**

**Response `200 OK` — card available**
```json
{
  "done": false,
  "card": {
    "id": "uuid",
    "front": "犬",
    "media_url": null,
    "tags": ["animals", "N5"]
  },
  "progress": {
    "cards_rated": 3,
    "cards_remaining": 12,
    "queue_size": 15
  }
}
```

**Response `200 OK` — session complete (all cards rated)**
```json
{
  "done": true,
  "cards_rated": 15
}
```

**Errors**
| Status | Code | Condition |
|---|---|---|
| 403 | `FORBIDDEN` | Session belongs to another user |
| 404 | `SESSION_NOT_FOUND` | No session with this ID |
| 409 | `SESSION_NOT_ACTIVE` | Session is completed or abandoned |

---

## POST `/sessions/:sessionId/rate`

Submit a rating for the current card. Updates `CardProgress` and inserts a `ReviewLog` entry in a single database transaction.

**Request**
```json
{
  "card_id": "uuid",
  "rating": "good"
}
```

**Validation**
- `card_id`: required; must be in this session's queue and not yet rated
- `rating`: required; must be one of `again | hard | good | easy`

**Response `200 OK`**
```json
{
  "card_progress": {
    "card_id": "uuid",
    "state": "review",
    "interval_days": 1,
    "ease_factor": 2.5,
    "repetitions": 1,
    "due_date": "2026-03-05",
    "next_review_label": "Tomorrow"
  },
  "session_progress": {
    "cards_rated": 4,
    "cards_remaining": 11
  }
}
```

**`next_review_label` values**: `"Today"`, `"Tomorrow"`, `"In X days"`, `"In X weeks"`, `"In X months"`

**Errors**
| Status | Code | Condition |
|---|---|---|
| 400 | `INVALID_RATING` | Rating not in `again|hard|good|easy` |
| 403 | `FORBIDDEN` | Session belongs to another user |
| 404 | `SESSION_NOT_FOUND` | No session with this ID |
| 404 | `CARD_NOT_IN_SESSION` | Card ID not in this session's queue |
| 409 | `CARD_ALREADY_RATED` | This card was already rated in this session |
| 409 | `SESSION_NOT_ACTIVE` | Session is completed or abandoned |

---

## POST `/sessions/:sessionId/complete`

Finalize the session. Sets `status = completed`, records `ended_at`, and writes the rating summary. After this call, the session is locked and no more ratings can be submitted.

**Request**: *(no body required)*

**Response `200 OK`**
```json
{
  "id": "uuid",
  "status": "completed",
  "started_at": "2026-03-04T10:00:00.000Z",
  "ended_at": "2026-03-04T10:07:00.000Z",
  "duration_seconds": 420,
  "cards_studied": 15,
  "ratings": {
    "again": 2,
    "hard": 1,
    "good": 9,
    "easy": 3
  }
}
```

**Errors**
| Status | Code | Condition |
|---|---|---|
| 403 | `FORBIDDEN` | Session belongs to another user |
| 404 | `SESSION_NOT_FOUND` | No session with this ID |
| 409 | `SESSION_ALREADY_ENDED` | Session already completed or abandoned |
| 409 | `CARDS_STILL_REMAINING` | Unrated cards remain; use `abandon` if intentional |

---

## POST `/sessions/:sessionId/abandon`

Abandon an in-progress session. Progress on already-rated cards is preserved. Sets `status = abandoned`.

**Request**: *(no body required)*

**Response `200 OK`**
```json
{
  "id": "uuid",
  "status": "abandoned",
  "cards_rated_before_abandon": 6,
  "ended_at": "2026-03-04T10:04:30.000Z"
}
```

**Errors**
| Status | Code | Condition |
|---|---|---|
| 403 | `FORBIDDEN` | Session belongs to another user |
| 404 | `SESSION_NOT_FOUND` | No session with this ID |
| 409 | `SESSION_ALREADY_ENDED` | Session already completed or abandoned |

---

## GET `/sessions/:sessionId/summary`

Retrieve the summary for a completed or abandoned session.

**Response `200 OK`**
```json
{
  "session_id": "uuid",
  "deck_id": "uuid",
  "deck_name": "Japanese N5 Vocabulary",
  "status": "completed",
  "started_at": "2026-03-04T10:00:00.000Z",
  "ended_at": "2026-03-04T10:07:00.000Z",
  "duration_seconds": 420,
  "cards_studied": 15,
  "retention_rate": 80.0,
  "ratings": {
    "again": 2,
    "hard": 1,
    "good": 9,
    "easy": 3
  },
  "next_due_date": "2026-03-05"
}
```

**`retention_rate`** = `(hard + good + easy) / cards_studied × 100`

**Errors**
| Status | Code | Condition |
|---|---|---|
| 403 | `FORBIDDEN` | Session belongs to another user |
| 404 | `SESSION_NOT_FOUND` | No session with this ID |
| 422 | `SESSION_STILL_ACTIVE` | Session not yet completed or abandoned |
