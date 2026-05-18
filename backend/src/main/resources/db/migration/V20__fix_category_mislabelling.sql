-- V20: Fix category mis-tagging
-- Clinics were tagged as HOSPITAL, all places_of_worship were tagged as MOSQUE
-- regardless of religion. Re-categorize existing data by name matching.

-- 1. HOSPITAL → CLINIC  (clinics are NOT hospitals)
UPDATE places
SET category = 'CLINIC'
WHERE category = 'HOSPITAL'
  AND (
    name ILIKE '%klinik%'
    OR name ILIKE '%clinic%'
    OR name ILIKE '%poliklinik%'
    OR name ILIKE '%polyclinic%'
    OR name ILIKE '%klinik kesihatan%'
    OR name ILIKE '%klinik pakar%'
    OR name ILIKE '%panel clinic%'
    OR name ILIKE '%klinik 1malaysia%'
    OR name ILIKE '%klinik komuniti%'
  );

-- 2. MOSQUE → PLACE_OF_WORSHIP  (churches, temples, etc.)
UPDATE places
SET category = 'PLACE_OF_WORSHIP'
WHERE category = 'MOSQUE'
  AND (
    -- Christian places of worship
    name ILIKE '%church%'
    OR name ILIKE '%gereja%'
    OR name ILIKE '%cathedral%'
    OR name ILIKE '%chapel%'
    OR name ILIKE '%biara%'         -- monastery
    OR name ILIKE '%parochial%'
    OR name ILIKE 'st %'            -- Saint (leading)
    OR name ILIKE 'st. %'
    OR name ILIKE '% church of %'
    OR name ILIKE '%christian%'
    OR name ILIKE '%catholic%'
    OR name ILIKE '%methodist%'
    OR name ILIKE '%anglican%'
    OR name ILIKE '%seventh day%'
    OR name ILIKE '%assembly of god%'
    -- Buddhist / Taoist places of worship
    OR name ILIKE '%temple%'
    OR name ILIKE '%kuil%'
    OR name ILIKE '%vihara%'
    OR name ILIKE '%pagoda%'
    OR name ILIKE '%tokong%'        -- Malay: Chinese temple
    OR name ILIKE '%buddha%'
    OR name ILIKE '%buddhist%'
    OR name ILIKE '%taoist%'
    -- Hindu places of worship
    OR name ILIKE '%mandir%'
    OR name ILIKE '%kovil%'         -- Tamil: temple
    OR name ILIKE '%murugan%'
    OR name ILIKE '%hindu%'
    OR name ILIKE '%amman%'
    OR name ILIKE '%mariamman%'
    -- Sikh places of worship
    OR name ILIKE '%gurdwara%'
    OR name ILIKE '%sikh%'
  );

-- 3. Ensure genuine Islamic places of worship stay as MOSQUE
--    (rows now in PLACE_OF_WORSHIP by accident due to OTHER-source data)
UPDATE places
SET category = 'MOSQUE'
WHERE category = 'PLACE_OF_WORSHIP'
  AND (
    name ILIKE '%masjid%'
    OR name ILIKE '%surau%'
    OR name ILIKE '%mosque%'
  );
