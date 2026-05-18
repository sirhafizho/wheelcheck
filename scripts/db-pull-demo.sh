#!/usr/bin/env bash
# =============================================================================
# db-pull-demo.sh
# Pull the Supabase demo database to your local PostgreSQL.
#
# Usage:
#   ./scripts/db-pull-demo.sh
#
# Requires:
#   - pg_dump / pg_restore installed (brew install postgresql)
#   - SUPABASE_DB_PASSWORD set (or add to .env.supabase below)
#
# How to get your Supabase DB password:
#   Supabase Dashboard → your project → Settings → Database → Database password
#   (or Connection string → copy the password part)
# =============================================================================

set -euo pipefail

# ── Config (edit these or set as env vars) ──────────────────────────────────
SUPABASE_REF="${SUPABASE_REF:-luiszfcgmpznsosddsaf}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"          # Required
SUPABASE_DB_USER="${SUPABASE_DB_USER:-postgres}"
SUPABASE_DB_NAME="${SUPABASE_DB_NAME:-postgres}"
SUPABASE_DB_HOST="db.${SUPABASE_REF}.supabase.co"
SUPABASE_DB_PORT="${SUPABASE_DB_PORT:-5432}"

LOCAL_DB_HOST="${LOCAL_DB_HOST:-localhost}"
LOCAL_DB_PORT="${LOCAL_DB_PORT:-5432}"
LOCAL_DB_USER="${LOCAL_DB_USER:-wheelcheck}"
LOCAL_DB_NAME="${LOCAL_DB_NAME:-wheelcheck}"
LOCAL_DB_PASSWORD="${LOCAL_DB_PASSWORD:-wheelcheck_dev}"

DUMP_FILE="/tmp/wheelcheck_demo_$(date +%Y%m%d_%H%M%S).dump"
# ────────────────────────────────────────────────────────────────────────────

# Load .env.supabase if it exists
if [[ -f "$(dirname "$0")/../.env.supabase" ]]; then
  export $(grep -v '^#' "$(dirname "$0")/../.env.supabase" | xargs)
fi

if [[ -z "$SUPABASE_DB_PASSWORD" ]]; then
  echo "❌  SUPABASE_DB_PASSWORD is not set."
  echo "    Set it in .env.supabase or export it before running this script."
  echo "    Find it in: Supabase Dashboard → Settings → Database → Database password"
  exit 1
fi

echo "📦  Pulling from Supabase demo DB..."
echo "    From: ${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}/${SUPABASE_DB_NAME}"
echo "    To:   ${LOCAL_DB_HOST}:${LOCAL_DB_PORT}/${LOCAL_DB_NAME}"
echo ""

# Dump from Supabase (custom format for speed)
PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
  -h "$SUPABASE_DB_HOST" \
  -p "$SUPABASE_DB_PORT" \
  -U "$SUPABASE_DB_USER" \
  -d "$SUPABASE_DB_NAME" \
  --format=custom \
  --no-owner \
  --no-acl \
  --exclude-table='schema_migrations' \
  -f "$DUMP_FILE"

echo "✅  Dump saved to: $DUMP_FILE ($(du -sh "$DUMP_FILE" | cut -f1))"
echo ""

# Terminate active connections before dropping
echo "🔌  Terminating existing connections to '${LOCAL_DB_NAME}'..."
PGPASSWORD="$LOCAL_DB_PASSWORD" psql \
  -h "$LOCAL_DB_HOST" -p "$LOCAL_DB_PORT" \
  -U "$LOCAL_DB_USER" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${LOCAL_DB_NAME}' AND pid != pg_backend_pid();" \
  > /dev/null 2>&1 || true

# Fix collation version mismatch (common with Docker)
PGPASSWORD="$LOCAL_DB_PASSWORD" psql \
  -h "$LOCAL_DB_HOST" -p "$LOCAL_DB_PORT" \
  -U "$LOCAL_DB_USER" -d postgres \
  -c "ALTER DATABASE template1 REFRESH COLLATION VERSION; ALTER DATABASE postgres REFRESH COLLATION VERSION;" \
  > /dev/null 2>&1 || true

# Drop & recreate local DB cleanly
echo "🗑️   Resetting local database '${LOCAL_DB_NAME}'..."
PGPASSWORD="$LOCAL_DB_PASSWORD" psql \
  -h "$LOCAL_DB_HOST" -p "$LOCAL_DB_PORT" \
  -U "$LOCAL_DB_USER" \
  -d postgres \
  -c "DROP DATABASE IF EXISTS ${LOCAL_DB_NAME};" \
  -c "CREATE DATABASE ${LOCAL_DB_NAME} OWNER ${LOCAL_DB_USER};"

# Restore to local
echo "📥  Restoring to local DB..."
PGPASSWORD="$LOCAL_DB_PASSWORD" pg_restore \
  -h "$LOCAL_DB_HOST" \
  -p "$LOCAL_DB_PORT" \
  -U "$LOCAL_DB_USER" \
  -d "$LOCAL_DB_NAME" \
  --no-owner \
  --no-acl \
  --if-exists \
  -c \
  "$DUMP_FILE" 2>&1 | grep -v "supabase_vault\|transaction_timeout" || true

echo ""
echo "✅  Done! Local DB is now in sync with Supabase demo."
echo "    Dump file kept at: $DUMP_FILE"
echo "    (Delete it when no longer needed)"
echo ""
echo "💡  Next: start the backend with ./gradlew bootRun"
echo "    Flyway will only run migrations newer than V20."
