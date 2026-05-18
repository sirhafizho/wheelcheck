#!/usr/bin/env bash
# =============================================================================
# enrich-test.sh
# Test AI enrichment locally against a small number of Penang places.
# Run this BEFORE triggering full enrichment on the demo.
#
# Usage:
#   ./scripts/enrich-test.sh [number_of_places] [state]
#
# Examples:
#   ./scripts/enrich-test.sh           # 3 Penang places
#   ./scripts/enrich-test.sh 10        # 10 Penang places
#   ./scripts/enrich-test.sh 5 Selangor
#
# Prerequisites:
#   - Local backend running: cd backend && ./gradlew bootRun
#   - GEMINI_API_KEY set in backend/.env
#   - Logged in as admin (script handles login automatically)
# =============================================================================

set -euo pipefail

LIMIT="${1:-3}"
STATE="${2:-Pulau Pinang}"
API_BASE="${LOCAL_API:-http://localhost:8080/api}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@wheelcheck.my}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

# Load local env
if [[ -f "$(dirname "$0")/../backend/.env" ]]; then
  export $(grep -v '^#' "$(dirname "$0")/../backend/.env" | xargs)
fi

if [[ -z "$ADMIN_PASSWORD" ]]; then
  echo "ℹ️  ADMIN_PASSWORD not set. Trying default..."
  ADMIN_PASSWORD="Admin1234!"
fi

echo "🔍  WheelCheck AI Enrichment — Local Test"
echo "    State:  $STATE"
echo "    Limit:  $LIMIT places"
echo "    API:    $API_BASE"
echo ""

# Check backend is running
if ! curl -sf "$API_BASE/actuator/health" > /dev/null 2>&1 && \
   ! curl -sf "$API_BASE/../actuator/health" > /dev/null 2>&1; then
  echo "❌  Backend not running at $API_BASE"
  echo "    Start it with: cd backend && ./gradlew bootRun"
  exit 1
fi

echo "✅  Backend is running"

# Login to get token
echo "🔐  Logging in as admin..."
LOGIN_RESPONSE=$(curl -sf -X POST "$API_BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>&1) || {
  # Try without /v1
  LOGIN_RESPONSE=$(curl -sf -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>&1)
}

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || echo "")

if [[ -z "$TOKEN" ]]; then
  echo "❌  Login failed. Check ADMIN_EMAIL / ADMIN_PASSWORD"
  echo "    Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅  Logged in"
echo ""

# Check enrichment stats before
echo "📊  Current enrichment stats for '$STATE':"
curl -sf "$API_BASE/admin/enrich/stats/$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$STATE")" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
s = json.load(sys.stdin)
print(f'    Total places: {s[\"total\"]}')
print(f'    Enriched:     {s[\"enriched\"]}')
print(f'    Pending:      {s[\"unenriched\"]}')
" 2>/dev/null || echo "    (could not fetch stats)"

echo ""
echo "🚀  Starting enrichment for $LIMIT places in '$STATE'..."

# Trigger enrichment with limit
ENRICH_STATE_ENCODED=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$STATE")
RESULT=$(curl -sf -X POST "$API_BASE/admin/enrich/state/$ENRICH_STATE_ENCODED?limit=$LIMIT" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "    Response: $RESULT"
echo ""

# Poll progress
echo "⏳  Polling progress (Ctrl+C to stop, enrichment will continue in background)..."
echo "    Each place takes ~8 seconds (Gemini rate limit)"
echo ""

PREV_PROCESSED=0
while true; do
  sleep 5
  PROGRESS=$(curl -sf "$API_BASE/admin/enrich/progress" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "{}")
  
  RUNNING=$(echo "$PROGRESS" | python3 -c "import sys,json; p=json.load(sys.stdin); print(p.get('running','?'))" 2>/dev/null || echo "?")
  PROCESSED=$(echo "$PROGRESS" | python3 -c "import sys,json; p=json.load(sys.stdin); print(p.get('processed',0))" 2>/dev/null || echo "0")
  TOTAL=$(echo "$PROGRESS" | python3 -c "import sys,json; p=json.load(sys.stdin); print(p.get('total',0))" 2>/dev/null || echo "0")
  QUOTA=$(echo "$PROGRESS" | python3 -c "import sys,json; p=json.load(sys.stdin); print(f\"{p.get('quotaUsedToday',0)}/{p.get('quotaCap',1400)}\")" 2>/dev/null || echo "?")

  printf "    [%s/%s] processed | quota: %s/day | running: %s\r" "$PROCESSED" "$TOTAL" "$QUOTA" "$RUNNING"

  if [[ "$RUNNING" == "false" ]] && [[ "$PROCESSED" -gt "$PREV_PROCESSED" || "$PROCESSED" -gt 0 ]]; then
    echo ""
    echo ""
    echo "✅  Enrichment complete! $PROCESSED/$TOTAL places processed."
    break
  fi
  PREV_PROCESSED=$PROCESSED
done

echo ""
echo "📊  Updated stats for '$STATE':"
curl -sf "$API_BASE/admin/enrich/stats/$ENRICH_STATE_ENCODED" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
s = json.load(sys.stdin)
print(f'    Total:       {s[\"total\"]}')
print(f'    Enriched:    {s[\"enriched\"]}')
print(f'    Verified:    {s[\"verifiedCount\"]}')
print(f'    Inferred:    {s[\"inferredCount\"]}')
print(f'    Assumption:  {s[\"assumptionCount\"]}')
" 2>/dev/null || echo "    (could not fetch stats)"
