#!/usr/bin/env bash
# =============================================================================
# fix-categories-demo.sh
# Apply V20 category mis-tagging fix directly to the Supabase (demo) database.
#
# Usage:
#   SUPABASE_DB_PASSWORD=your_password ./scripts/fix-categories-demo.sh
#
# Or create .env.supabase with SUPABASE_DB_PASSWORD=... and run without args.
#
# How to get your Supabase DB password:
#   Supabase Dashboard → project → Settings → Database → Database password
# =============================================================================

set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
SUPABASE_REF="${SUPABASE_REF:-luiszfcgmpznsosddsaf}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"
SUPABASE_DB_USER="${SUPABASE_DB_USER:-postgres}"
SUPABASE_DB_NAME="${SUPABASE_DB_NAME:-postgres}"
SUPABASE_DB_HOST="db.${SUPABASE_REF}.supabase.co"
SUPABASE_DB_PORT="${SUPABASE_DB_PORT:-5432}"
# ─────────────────────────────────────────────────────────────────────────────

# Load .env.supabase if present
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/../.env.supabase" ]]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "${SCRIPT_DIR}/../.env.supabase" | xargs)
fi

if [[ -z "${SUPABASE_DB_PASSWORD}" ]]; then
  echo "❌  SUPABASE_DB_PASSWORD is not set."
  echo "   Set it in .env.supabase or export it before running."
  exit 1
fi

echo "🔧  Applying V20 category fix to Supabase demo DB..."
echo "    Host: ${SUPABASE_DB_HOST}"

export PGPASSWORD="${SUPABASE_DB_PASSWORD}"

psql \
  -h "${SUPABASE_DB_HOST}" \
  -p "${SUPABASE_DB_PORT}" \
  -U "${SUPABASE_DB_USER}" \
  -d "${SUPABASE_DB_NAME}" \
  << 'SQL'

-- ── 1. HOSPITAL → CLINIC ───────────────────────────────────────────────────
UPDATE places SET category = 'CLINIC'
WHERE category = 'HOSPITAL'
  AND (
    name ILIKE '%klinik%'        OR name ILIKE '%clinic%'
    OR name ILIKE '%poliklinik%' OR name ILIKE '%polyclinic%'
    OR name ILIKE '%panel clinic%'
    OR name ILIKE '%klinik pakar%'
    OR name ILIKE '%klinik kesihatan%'
    OR name ILIKE '%klinik komuniti%'
    OR name ILIKE '%klinik 1malaysia%'
  );

-- ── 2. MOSQUE → PLACE_OF_WORSHIP (non-Islamic worship) ────────────────────
UPDATE places SET category = 'PLACE_OF_WORSHIP'
WHERE category = 'MOSQUE'
  AND (
    -- Christian
    name ILIKE '%church%'          OR name ILIKE '%gereja%'
    OR name ILIKE '%cathedral%'    OR name ILIKE '%chapel%'
    OR name ILIKE '%christian%'    OR name ILIKE '%catholic%'
    OR name ILIKE '%methodist%'    OR name ILIKE '%anglican%'
    OR name ILIKE '%assembly of god%' OR name ILIKE '%seventh day%'
    OR name ILIKE 'st %'           OR name ILIKE 'st. %'
    -- Buddhist / Taoist
    OR name ILIKE '%temple%'       OR name ILIKE '%kuil%'
    OR name ILIKE '%vihara%'       OR name ILIKE '%pagoda%'
    OR name ILIKE '%tokong%'       OR name ILIKE '%buddha%'
    OR name ILIKE '%buddhist%'     OR name ILIKE '%taoist%'
    -- Hindu
    OR name ILIKE '%mandir%'       OR name ILIKE '%kovil%'
    OR name ILIKE '%hindu%'        OR name ILIKE '%murugan%'
    OR name ILIKE '%mariamman%'    OR name ILIKE '%amman%'
    -- Sikh
    OR name ILIKE '%gurdwara%'     OR name ILIKE '%sikh%'
  );

-- ── 3. Safeguard: keep true mosques/suraus ─────────────────────────────────
UPDATE places SET category = 'MOSQUE'
WHERE category = 'PLACE_OF_WORSHIP'
  AND (name ILIKE '%masjid%' OR name ILIKE '%surau%' OR name ILIKE '%mosque%');

-- ── Result ─────────────────────────────────────────────────────────────────
SELECT category, COUNT(*) as count
FROM places
GROUP BY category
ORDER BY count DESC;

SQL

echo "✅  Category fix applied to Supabase demo DB."
