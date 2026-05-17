-- AI Enrichment table: stores Gemini search-grounded accessibility assessments per place
-- One row per place (UNIQUE constraint). Re-enriching a place updates this row.
CREATE TABLE IF NOT EXISTS ai_enrichment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    confidence_tier VARCHAR(20) NOT NULL DEFAULT 'ASSUMPTION',
    ai_summary TEXT,
    ai_reasoning TEXT,
    is_accessible BOOLEAN,
    disclaimer TEXT,
    photo_url TEXT,
    sources JSONB NOT NULL DEFAULT '[]',
    model_used VARCHAR(100),
    enriched_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ai_enrichment_place UNIQUE (place_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_enrichment_place_id ON ai_enrichment(place_id);
CREATE INDEX IF NOT EXISTS idx_ai_enrichment_confidence ON ai_enrichment(confidence_tier);
CREATE INDEX IF NOT EXISTS idx_ai_enrichment_enriched_at ON ai_enrichment(enriched_at DESC);
