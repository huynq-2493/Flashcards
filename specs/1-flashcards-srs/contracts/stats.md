# Contract: Statistics & Settings

**Base URL**: `/api/v1`
**Auth Required**: Yes — `Authorization: Bearer <access_token>` on all endpoints.
**Scope**: All statistics are scoped to the authenticated user only.

---

## GET `/stats/dashboard`

Returns the summary statistics for the user's Dashboard screen.

**Response `200 OK`**
```json
{
  "due_today": 23,
  "overdue": 5,
  "new_cards_today_remaining": 15,
  "streak_days": 7,
  "retention_rate_30d": 84.5,
  "total_reviews_30d": 340,
  "total_decks": 4,
  "total_cards": 210
}
```

**Field Definitions**
| Field | Formula |
|---|---|
| `due_today` | `COUNT(CardProgress WHERE due_date <= today AND user_id = me)` |
| `overdue` | `COUNT(CardProgress WHERE due_date < today AND user_id = me)` |
| `new_cards_today_remaining` | `settings.daily_new_cards_limit − new cards already reviewed today` |
| `streak_days` | Consecutive days (in user's timezone) with at least 1 ReviewLog entry |
| `retention_rate_30d` | `(hard+good+easy reviews in last 30d) / total reviews in last 30d × 100` |

---

## GET `/stats/heatmap`

Returns daily review counts for the activity heatmap.

**Query Parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `days` | integer | 90 | Number of past days to include (max 365) |

**Response `200 OK`**
```json
{
  "data": [
    { "date": "2026-01-04", "count": 0 },
    { "date": "2026-01-05", "count": 45 },
    { "date": "2026-01-06", "count": 32 }
  ],
  "max_count": 78
}
```

- `date`: ISO date in user's local timezone (YYYY-MM-DD)
- `count`: total cards reviewed (all ratings) on that day
- `max_count`: highest count in the range (used to normalise heatmap intensity)
- Days with 0 reviews are included explicitly

---

## GET `/stats/forecast`

Returns the predicted due card count for each of the next N days.

**Query Parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `days` | integer | 30 | Number of future days to forecast (max 60) |

**Response `200 OK`**
```json
{
  "data": [
    { "date": "2026-03-05", "count": 18 },
    { "date": "2026-03-06", "count": 24 },
    { "date": "2026-03-07", "count": 11 }
  ]
}
```

- Count is calculated from `CardProgress.due_date` for all cards in user's decks

---

## GET `/stats/retention`

Returns daily retention rate for a line chart (last 30 days).

**Query Parameters**
| Param | Type | Default | Description |
|---|---|---|---|
| `days` | integer | 30 | Rolling window in days (max 90) |

**Response `200 OK`**
```json
{
  "data": [
    { "date": "2026-02-03", "rate": 0.82, "total_reviews": 45 },
    { "date": "2026-02-04", "rate": 0.91, "total_reviews": 33 },
    { "date": "2026-02-05", "rate": null, "total_reviews": 0 }
  ]
}
```

- `rate`: proportion of non-"again" reviews (null if no reviews that day)

---

## GET `/decks/:deckId/stats`

Per-deck statistics.

**Response `200 OK`**
```json
{
  "deck_id": "uuid",
  "deck_name": "Japanese N5 Vocabulary",
  "card_count": 50,
  "state_distribution": {
    "new": 20,
    "learning": 5,
    "review": 22,
    "relearning": 3
  },
  "mature_count": 14,
  "average_ease_factor": 2.35,
  "average_interval_days": 8.4,
  "retention_rate_30d": 88.0,
  "last_studied_at": "2026-03-04T10:07:00.000Z",
  "total_reviews_all_time": 420
}
```

**`mature_count`**: cards with `interval_days >= 21`

**Errors**
| Status | Code | Condition |
|---|---|---|
| 403 | `FORBIDDEN` | Deck belongs to another user |
| 404 | `DECK_NOT_FOUND` | No deck with this ID |

---

## GET `/settings`

Get the authenticated user's settings.

**Response `200 OK`**
```json
{
  "daily_new_cards_limit": 20,
  "daily_review_limit": 100,
  "reminder_enabled": true,
  "reminder_time": "08:00",
  "reminder_channel": "email",
  "timezone": "Asia/Ho_Chi_Minh"
}
```

---

## PATCH `/settings`

Update one or more settings. All fields are optional; only provided fields are updated.

**Request**
```json
{
  "daily_new_cards_limit": 30,
  "daily_review_limit": 150,
  "reminder_enabled": true,
  "reminder_time": "07:30",
  "reminder_channel": "email",
  "timezone": "Asia/Ho_Chi_Minh"
}
```

**Validation**
| Field | Rule |
|---|---|
| `daily_new_cards_limit` | Integer, 1–200 |
| `daily_review_limit` | Integer, 1–500 |
| `reminder_time` | Matches `HH:MM` (24h format) |
| `reminder_channel` | `email` or `push` |
| `timezone` | Valid IANA timezone string |

**Response `200 OK`**: Updated settings object (same shape as GET).

**Errors**
| Status | Code | Condition |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Any field fails validation |

---

## POST `/notifications/subscribe`

Register a Web Push subscription for the authenticated user.

**Request**
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

**Response `201 Created`**
```json
{ "subscribed": true }
```

---

## DELETE `/notifications/subscribe`

Remove the Web Push subscription for the authenticated user.

**Response `204 No Content`**
