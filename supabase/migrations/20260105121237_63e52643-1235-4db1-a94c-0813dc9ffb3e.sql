-- Add phone and position columns to authorized_users
ALTER TABLE internal.authorized_users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE internal.authorized_users ADD COLUMN IF NOT EXISTS job_position text;