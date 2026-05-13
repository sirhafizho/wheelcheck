-- Remove all seed/dummy data so the database only contains real aggregated data.
-- Reviews linked to seed places will cascade-delete via FK constraints.
DELETE FROM accessibility_reviews WHERE place_id IN (
    SELECT id FROM places WHERE data_source = 'SEED'
);

DELETE FROM comments WHERE place_id IN (
    SELECT id FROM places WHERE data_source = 'SEED'
);

DELETE FROM photos WHERE place_id IN (
    SELECT id FROM places WHERE data_source = 'SEED'
);

DELETE FROM favorites WHERE place_id IN (
    SELECT id FROM places WHERE data_source = 'SEED'
);

DELETE FROM places WHERE data_source = 'SEED';
