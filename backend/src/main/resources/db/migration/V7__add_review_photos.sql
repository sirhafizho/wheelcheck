-- Add photo support to accessibility reviews
ALTER TABLE accessibility_reviews ADD COLUMN photo_urls JSONB DEFAULT '[]'::jsonb;

-- Add index for reviews with photos
CREATE INDEX idx_reviews_has_photos ON accessibility_reviews ((photo_urls != '[]'::jsonb));
