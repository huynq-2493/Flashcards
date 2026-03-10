#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# smoke-test.sh — Production smoke test for the Flashcards SRS application
#
# Performs the full core loop against a running deployment:
#   1. Health check
#   2. Register a new user
#   3. Login and capture JWT
#   4. Create a deck
#   5. Add a card
#   6. Start a study session
#   7. Get next card (verify `back` is absent)
#   8. Rate the card
#   9. Complete the session
#  10. Fetch summary
#
# Usage:
#   BASE_URL=http://localhost ./scripts/smoke-test.sh
#   BASE_URL=https://flashcards.example.com ./scripts/smoke-test.sh
#
# Exit code:
#   0 = all checks passed
#   1 = one or more checks failed
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost}"
API="${BASE_URL}/api/v1"
PASS=0
FAIL=0

# ── Colour helpers ────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC}  $*"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}✗${NC}  $*"; FAIL=$((FAIL + 1)); }

assert_status() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    ok "$label (HTTP $actual)"
  else
    fail "$label — expected HTTP $expected, got HTTP $actual"
  fi
}

# ── 1. Health check ───────────────────────────────────────────────────────────
echo "── Health check ─────────────────────────────────────────────"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${API}/health")
assert_status "Health endpoint" "200" "$HEALTH"

# ── 2. Register ───────────────────────────────────────────────────────────────
echo "── Auth ──────────────────────────────────────────────────────"
TS=$(date +%s)
EMAIL="smoke-${TS}@test.com"
PASSWORD="SmokeTest123!"

REG_RESP=$(curl -s -w "\n%{http_code}" -X POST "${API}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")
REG_BODY=$(echo "$REG_RESP" | head -n -1)
REG_STATUS=$(echo "$REG_RESP" | tail -n1)
assert_status "Register" "201" "$REG_STATUS"

ACCESS_TOKEN=$(echo "$REG_BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [[ -z "$ACCESS_TOKEN" ]]; then
  fail "Could not extract accessToken from register response"
  exit 1
fi
ok "Access token obtained"

AUTH_HEADER="Authorization: Bearer ${ACCESS_TOKEN}"

# ── 3. Create deck ────────────────────────────────────────────────────────────
echo "── Deck & Card ───────────────────────────────────────────────"
DECK_RESP=$(curl -s -w "\n%{http_code}" -X POST "${API}/decks" \
  -H "Content-Type: application/json" \
  -H "${AUTH_HEADER}" \
  -d '{"name":"Smoke Test Deck"}')
DECK_BODY=$(echo "$DECK_RESP" | head -n -1)
DECK_STATUS=$(echo "$DECK_RESP" | tail -n1)
assert_status "Create deck" "201" "$DECK_STATUS"

DECK_ID=$(echo "$DECK_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
ok "Deck ID: ${DECK_ID}"

# ── 4. Add a card ─────────────────────────────────────────────────────────────
CARD_RESP=$(curl -s -w "\n%{http_code}" -X POST "${API}/decks/${DECK_ID}/cards" \
  -H "Content-Type: application/json" \
  -H "${AUTH_HEADER}" \
  -d '{"front":"What is 2 + 2?","back":"4"}')
CARD_BODY=$(echo "$CARD_RESP" | head -n -1)
CARD_STATUS=$(echo "$CARD_RESP" | tail -n1)
assert_status "Create card" "201" "$CARD_STATUS"

# ── 5. Start study session ────────────────────────────────────────────────────
echo "── Study Session ─────────────────────────────────────────────"
SESSION_RESP=$(curl -s -w "\n%{http_code}" -X POST "${API}/sessions" \
  -H "Content-Type: application/json" \
  -H "${AUTH_HEADER}" \
  -d "{\"deckId\":\"${DECK_ID}\"}")
SESSION_BODY=$(echo "$SESSION_RESP" | head -n -1)
SESSION_STATUS=$(echo "$SESSION_RESP" | tail -n1)
assert_status "Start session" "201" "$SESSION_STATUS"

SESSION_ID=$(echo "$SESSION_BODY" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
ok "Session ID: ${SESSION_ID}"

# ── 6. Get next card ──────────────────────────────────────────────────────────
NEXT_RESP=$(curl -s -w "\n%{http_code}" "${API}/sessions/${SESSION_ID}/next-card" \
  -H "${AUTH_HEADER}")
NEXT_BODY=$(echo "$NEXT_RESP" | head -n -1)
NEXT_STATUS=$(echo "$NEXT_RESP" | tail -n1)
assert_status "Get next card" "200" "$NEXT_STATUS"

CARD_ID=$(echo "$NEXT_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
ok "Next card ID: ${CARD_ID}"

# Verify `back` field is NOT present in next-card response
if echo "$NEXT_BODY" | grep -q '"back"'; then
  fail "SECURITY: next-card response contains 'back' field (FR-014 violation)"
else
  ok "Security: 'back' field absent from next-card response (FR-014 ✓)"
fi

# ── 7. Rate card ──────────────────────────────────────────────────────────────
RATE_RESP=$(curl -s -w "\n%{http_code}" -X POST "${API}/sessions/${SESSION_ID}/rate" \
  -H "Content-Type: application/json" \
  -H "${AUTH_HEADER}" \
  -d "{\"cardId\":\"${CARD_ID}\",\"rating\":\"good\"}")
RATE_STATUS=$(echo "$RATE_RESP" | tail -n1)
assert_status "Rate card" "200" "$RATE_STATUS"

# ── 8. Complete session ───────────────────────────────────────────────────────
COMPLETE_RESP=$(curl -s -w "\n%{http_code}" -X POST "${API}/sessions/${SESSION_ID}/complete" \
  -H "${AUTH_HEADER}")
COMPLETE_STATUS=$(echo "$COMPLETE_RESP" | tail -n1)
assert_status "Complete session" "200" "$COMPLETE_STATUS"

# ── 9. Get summary ────────────────────────────────────────────────────────────
SUMMARY_RESP=$(curl -s -w "\n%{http_code}" "${API}/sessions/${SESSION_ID}/summary" \
  -H "${AUTH_HEADER}")
SUMMARY_BODY=$(echo "$SUMMARY_RESP" | head -n -1)
SUMMARY_STATUS=$(echo "$SUMMARY_RESP" | tail -n1)
assert_status "Get summary" "200" "$SUMMARY_STATUS"

if echo "$SUMMARY_BODY" | grep -q '"cardsStudied":1'; then
  ok "Summary cardsStudied = 1"
else
  fail "Summary cardsStudied is not 1 — body: ${SUMMARY_BODY}"
fi

# ── Result ────────────────────────────────────────────────────────────────────
echo ""
echo "─────────────────────────────────────────────────────────────"
echo -e "Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}"
echo "─────────────────────────────────────────────────────────────"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0
