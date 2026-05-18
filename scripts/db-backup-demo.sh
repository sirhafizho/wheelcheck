#!/usr/bin/env bash
# =============================================================================
# db-backup-demo.sh
# Just backup the Supabase demo DB to a local file (no restore).
# Run this before major changes to keep a safe snapshot.
#
# Usage:
#   ./scripts/db-backup-demo.sh [output_file]
# =============================================================================

set -euo pipefail

SUPABASE_REF="${SUPABASE_REF:-luiszfcgmpznsosddsaf}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"
SUPABASE_DB_USER="${SUPABASE_DB_USER:-postgres}"
SUPABASE_DB_NAME="${SUPABASE_DB_NAME:-postgres}"
SUPABASE_DB_HOST="db.${SUPABASE_REF}.supabase.co"
SUPABASE_DB_PORT="${SUPABASE_DB_PORT:-5432}"

BACKUP_DIR="$(dirname "$0")/../backups"
DUMP_FILE="${1:-${BACKUP_DIR}/wheelcheck_demo_$(date +%Y%m%d_%H%M%S).dump}"

if [[ -f "$(dirname "$0")/../.env.supabase" ]]; then
  export $(grep -v '^#' "$(dirname "$0")/../.env.supabase" | xargs)
fi

if [[ -z "$SUPABASE_DB_PASSWORD" ]]; then
  echo "❌  SUPABASE_DB_PASSWORD not set. See .env.supabase.example"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "📦  Backing up Supabase demo DB..."
PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
  -h "$SUPABASE_DB_HOST" \
  -p "$SUPABASE_DB_PORT" \
  -U "$SUPABASE_DB_USER" \
  -d "$SUPABASE_DB_NAME" \
  --format=custom \
  --no-owner \
  --no-acl \
  -f "$DUMP_FILE"

SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
echo "✅  Backup saved: $DUMP_FILE ($SIZE)"
