-- Add optional avatar field to users table (backward compatible, no data loss)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
