-- Add external data source tracking to places
ALTER TABLE places ADD COLUMN osm_id VARCHAR(50);
ALTER TABLE places ADD COLUMN data_source VARCHAR(30) NOT NULL DEFAULT 'COMMUNITY';
ALTER TABLE places ADD COLUMN osm_wheelchair_tag VARCHAR(20);
ALTER TABLE places ADD COLUMN osm_toilet_accessible BOOLEAN;
ALTER TABLE places ADD COLUMN osm_tactile_paving BOOLEAN;
ALTER TABLE places ADD COLUMN osm_description TEXT;

CREATE UNIQUE INDEX idx_places_osm_id ON places(osm_id) WHERE osm_id IS NOT NULL;
CREATE INDEX idx_places_data_source ON places(data_source);

-- Update existing seed data to mark as SEED source
UPDATE places SET data_source = 'SEED' WHERE data_source = 'COMMUNITY' AND review_count <= 1;
