ALTER TABLE places ADD COLUMN state VARCHAR(100);
CREATE INDEX idx_places_state ON places(state);
