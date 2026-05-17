-- Allow NULL address; existing 'Address not available' strings remain but frontend handles display
ALTER TABLE places ALTER COLUMN address DROP NOT NULL;

-- Clean up old hardcoded English placeholder so frontend i18n takes over
UPDATE places SET address = NULL WHERE address = 'Address not available';
