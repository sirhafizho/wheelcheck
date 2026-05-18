-- Add approval status to places
-- APPROVED: visible in public search (default for existing/seeded data)
-- PENDING: newly user-submitted places, awaiting admin review
-- REJECTED: admin rejected, hidden from all results

ALTER TABLE places ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';
ALTER TABLE places ADD COLUMN IF NOT EXISTS nearby_warning TEXT;
ALTER TABLE places ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Only newly community-submitted places need review; existing data stays APPROVED
-- (The application sets PENDING for new COMMUNITY places going forward)

CREATE INDEX IF NOT EXISTS idx_places_status ON places(status);
CREATE INDEX IF NOT EXISTS idx_places_status_created_by ON places(status, created_by);
