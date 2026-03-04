# Contract: Decks

**Base URL**: `/api/v1`
**Auth Required**: Yes — `Authorization: Bearer <access_token>` on all endpoints.
**Ownership**: All endpoints enforce that the authenticated user owns the deck.

---

## GET `/decks`

List all decks for the authenticated user.

**Query Parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `q` | string | — | Filter by deck name (case-insensitive contains) |
| `sort` | string | `updated_at` | Sort field: `name`, `created_at`, `updated_at`, `due_today` |
| `order` | string | `desc` | `asc` or `desc` |

**Response `200 OK`**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Japanese N5 Vocabulary",
      "description": "500 basic words",
      "card_count": 50,
      "due_today": 12,
      "created_at": "2026-03-01T10:00:00.000Z",
      "updated_at": "2026-03-04T08:00:00.000Z"
    }
  ],
  "total": 4
}
```

---

## POST `/decks`

Create a new deck.

**Request**
```json
{
  "name": "Japanese N5 Vocabulary",
  "description": "500 basic words for JLPT N5"
}
```

**Validation**
- `name`: required, 1–100 chars, stripped whitespace
- `description`: optional, max 500 chars

**Response `201 Created`**
```json
{
  "id": "uuid",
  "name": "Japanese N5 Vocabulary",
  "description": "500 basic words for JLPT N5",
  "card_count": 0,
  "due_today": 0,
  "created_at": "2026-03-04T10:00:00.000Z",
  "updated_at": "2026-03-04T10:00:00.000Z"
}
```

**Errors**
| Status | Code | Condition |
|---|---|---|
| 422 | `VALIDATION_ERROR` | `name` missing or exceeds 100 chars |

---

## GET `/decks/:deckId`

Get a single deck with statistics.

**Response `200 OK`**
```json
{
  "id": "uuid",
  "name": "Japanese N5 Vocabulary",
  "description": "500 basic words",
  "card_count": 50,
  "stats": {
    "due_today": 12,
    "overdue": 3,
    "new": 20,
    "learning": 5,
    "review": 22,
    "relearning": 3
  },
  "created_at": "2026-03-01T10:00:00.000Z",
  "updated_at": "2026-03-04T08:00:00.000Z"
}
```

**Errors**
| Status | Code | Condition |
|---|---|---|
| 403 | `FORBIDDEN` | Deck belongs to another user |
| 404 | `DECK_NOT_FOUND` | No deck with this ID |

---

## PATCH `/decks/:deckId`

Update deck name and/or description.

**Request** *(all fields optional; at least one required)*
```json
{
  "name": "Japanese JLPT N5",
  "description": "Updated description"
}
```

**Response `200 OK`**
```json
{
  "id": "uuid",
  "name": "Japanese JLPT N5",
  "description": "Updated description",
  "card_count": 50,
  "updated_at": "2026-03-04T12:00:00.000Z"
}
```

**Errors**
| Status | Code | Condition |
|---|---|---|
| 403 | `FORBIDDEN` | Deck belongs to another user |
| 404 | `DECK_NOT_FOUND` | No deck with this ID |
| 422 | `VALIDATION_ERROR` | Name exceeds 100 chars or no fields provided |

---

## DELETE `/decks/:deckId`

Delete a deck and all associated data (cascade: Cards, CardProgress, ReviewLogs, StudySessions, SessionQueues).

**Response `204 No Content`**

**Errors**
| Status | Code | Condition |
|---|---|---|
| 403 | `FORBIDDEN` | Deck belongs to another user |
| 404 | `DECK_NOT_FOUND` | No deck with this ID |

---

## GET `/decks/:deckId/export`

Export all cards in the deck as a CSV file download.

**Response `200 OK`**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="deck-name.csv"`

```csv
front,back,tags
犬,dog,"animals,N5"
猫,cat,"animals,N5"
```

**Errors**
| Status | Code | Condition |
|---|---|---|
| 403 | `FORBIDDEN` | Deck belongs to another user |
| 404 | `DECK_NOT_FOUND` | No deck with this ID |
