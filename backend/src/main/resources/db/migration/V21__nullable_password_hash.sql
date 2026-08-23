-- Allow null password_hash for social login users (Google, GitHub via Supabase Auth)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
