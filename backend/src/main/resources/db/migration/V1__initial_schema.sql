-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Create places table
CREATE TABLE places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    name_ms VARCHAR(255),
    location GEOMETRY(Point, 4326) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Kuala Lumpur',
    category VARCHAR(50) NOT NULL,
    accessibility_level VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
    review_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_places_location ON places USING GIST(location);
CREATE INDEX idx_places_category ON places(category);
CREATE INDEX idx_places_accessibility ON places(accessibility_level);
CREATE INDEX idx_places_name ON places(name);

-- Create accessibility_reviews table
CREATE TABLE accessibility_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entrance VARCHAR(20) NOT NULL,
    toilet VARCHAR(20) NOT NULL,
    parking VARCHAR(20) NOT NULL,
    internal_nav VARCHAR(20) NOT NULL,
    notes TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_place ON accessibility_reviews(place_id);
CREATE INDEX idx_reviews_user ON accessibility_reviews(user_id);
CREATE INDEX idx_reviews_created_at ON accessibility_reviews(created_at DESC);

-- Create photos table
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_photos_place ON photos(place_id);
CREATE INDEX idx_photos_user ON photos(user_id);
CREATE INDEX idx_photos_created_at ON photos(created_at DESC);

-- Insert sample data for Kuala Lumpur
INSERT INTO places (name, name_ms, location, address, city, category, accessibility_level) VALUES
('KLCC Park', 'Taman KLCC', ST_SetSRID(ST_MakePoint(101.7123, 3.1535), 4326), 'Jalan Ampang, Kuala Lumpur City Centre', 'Kuala Lumpur', 'PARK', 'FULL'),
('Pavilion KL', 'Pavilion KL', ST_SetSRID(ST_MakePoint(101.7137, 3.1491), 4326), '168, Jalan Bukit Bintang', 'Kuala Lumpur', 'MALL', 'PARTIAL'),
('KL Sentral', 'KL Sentral', ST_SetSRID(ST_MakePoint(101.6864, 3.1341), 4326), 'Jalan Stesen Sentral', 'Kuala Lumpur', 'TRANSPORT', 'FULL'),
('National Mosque', 'Masjid Negara', ST_SetSRID(ST_MakePoint(101.6919, 3.1427), 4326), 'Jalan Perdana', 'Kuala Lumpur', 'MOSQUE', 'PARTIAL'),
('Suria KLCC', 'Suria KLCC', ST_SetSRID(ST_MakePoint(101.7117, 3.1578), 4326), 'Petronas Twin Tower, Lower Ground', 'Kuala Lumpur', 'MALL', 'FULL');

-- Insert sample reviews
INSERT INTO accessibility_reviews (place_id, entrance, toilet, parking, internal_nav, notes, is_verified) 
SELECT id, 'FULL', 'FULL', 'FULL', 'FULL', 'Excellent accessibility throughout the park with paved paths and ramps.', TRUE 
FROM places WHERE name = 'KLCC Park';

INSERT INTO accessibility_reviews (place_id, entrance, toilet, parking, internal_nav, notes, is_verified) 
SELECT id, 'FULL', 'FULL', 'FULL', 'FULL', 'Multiple accessible entrances, elevators, and designated parking.', TRUE 
FROM places WHERE name = 'Suria KLCC';
