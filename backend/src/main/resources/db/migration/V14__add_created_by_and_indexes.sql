-- Add created_by column to places so owners can edit/delete their own places
ALTER TABLE places ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Spatial index on location for faster nearby queries
CREATE INDEX IF NOT EXISTS idx_places_location_geography ON places USING GIST ((location::geography));

-- Trigram extension for fuzzy text search (midvalley → Mid Valley)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index on place names for fast fuzzy search
CREATE INDEX IF NOT EXISTS idx_places_name_trgm ON places USING GIN (name gin_trgm_ops);

-- Index on created_by for owner queries
CREATE INDEX IF NOT EXISTS idx_places_created_by ON places (created_by) WHERE created_by IS NOT NULL;
