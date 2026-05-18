#!/usr/bin/env bash
# =============================================================================
# enrich-demo.sh
# Trigger AI enrichment on the DEMO (HuggingFace Spaces backend).
# Run enrich-test.sh locally first to verify everything works.
#
# Usage:
#   ./scripts/enrich-demo.sh [state] [limit]
#
# Examples:
#   ./scripts/enrich-demo.sh "Pulau Pinang"     # Full Penang enrichment
#   ./scripts/enrich-demo.sh "Pulau Pinang" 20  # Test 20 places on demo
#
# Prerequisites:
#   - GEMINI_API_KEY must be set in HuggingFace Space secrets
#     HF Space → Settings → Repository secrets → GEMINI_API_KEY
# =============================================================================

set -euo pipefail

STATE="${1:-Pulau Pinang}"
LIMIT="${2:--1}"
DEMO_API="${DEMO_API:-https://sirhafizho-wheelcheck-api.hf.space/api}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@wheelcheck.my}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

if [[ -f "$(dirname "$0")/../.env.supabase" ]]; then
  export $(grep -v '^#' "$(dirname "$0")/../.env.supabase" | xargs)
fi

if [[ -z "$ADMIN_PASSWORD" ]]; then
  echo "ℹ️  ADMIN_PASSWORD not set, trying default..."
  ADMIN_PASSWORD="Admin1234!"
fi

LIMIT_NOTE=""
[[ "$LIMIT" -gt 0 ]] 2>/dev/null && LIMIT_NOTE=" (limited to $LIMIT places)"

echo "🌐  WheelCheck AI Enrichment — DEMO"
echo "    API:    $DEMO_API"
echo "    State:  $STATE$LIMIT_NOTE"
echo ""
echo "⚠️   This will call Gemini API using the demo's API key."
echo "    Make sure GEMINI_API_KEY is set in HuggingFace Space secrets."
echo ""
read -p "Continue? (y/N) " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
echo ""

# Login
echo "🔐  Logging in to demo..."
LOGIN_RESPONSE=$(curl -sf -X POST "$DEMO_API/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>&1)

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || echo "")

if [[ -z "$TOKEN" ]]; then
  echo "❌  Login failed."
  echo "    Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅  Logged in to demo"
echo ""

# Stats before
STATE_ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$STATE")

echo "📊  Current enrichment stats on demo for '$STATE':"
curl -sf "$DEMO_API/admin/enrich/stats/$STATE_ENC" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
s = json.load(sys.stdin)
print(f'    Total places: {s[\"total\"]}')
print(f'    Enriched:     {s[\"enriched\"]}')
print(f'    Pending:      {s[\"unenriched\"]}')
" 2>/dev/null

echo ""
echo "🚀  Starting enrichment on demo..."

PARAMS="?limit=$LIMIT"
curl -sf -X POST "$DEMO_API/admin/enrich/state/$STATE_ENC$PARAMS" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -c "import sys,json; r=json.load(sys.stdin); print('   ', r.get('message',''))"

echo ""
echo "⏳  Polling progress..."

while true; do
  sleep 8
  PROGRESS=$(curl -sf "$DEMO_API/admin/enrich/progress" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "{}")

  RUNNING=$(echo "$PROGRESS" | python3 -c "import sys,json; p=json.load(sys.stdin); print(p.get('running','?'))" 2>/dev/null)
  PROCESSED=$(echo "$PROGRESS" | python3 -c "import sys,json; p=json.load(sys.stdin); print(p.get('processed',0))" 2>/dev/null)
  TOTAL=$(echo "$PROGRESS" | python3 -c "import sys,json; p=json.load(sys.stdin); print(p.get('total',0))" 2>/dev/null)
  QUOTA=$(echo "$PROGRESS" | python3 -c "import sys,json; p=json.load(sys.stdin); print(f\"{p.get('quotaUsedToday',0)}/{p.get('quotaCap',1400)}\")" 2>/dev/null)

  printf "    [%s/%s] | quota: %s/day | running: %s\r" "$PROCESSED" "$TOTAL" "$QUOTA" "$RUNNING"

  if [[ "$RUNNING" == "false" && "$PROCESSED" -gt 0 ]]; then
    echo ""
    echo "✅  Done! $PROCESSED/$TOTAL enriched."
    break
  fi
done
