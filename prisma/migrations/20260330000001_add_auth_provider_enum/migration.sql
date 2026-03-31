-- CreateEnum (idempotent: migration 0 may have already created this type)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuthProvider') THEN
    CREATE TYPE "AuthProvider" AS ENUM ('local', 'google');
  END IF;
END $$;

-- AlterTable: ensure provider column uses the enum type
ALTER TABLE "users"
  ALTER COLUMN "provider" TYPE "AuthProvider" USING "provider"::text::"AuthProvider",
  ALTER COLUMN "provider" SET DEFAULT 'local'::"AuthProvider";

-- DropIndex (single-column index replaced by composite)
DROP INDEX IF EXISTS "users_providerId_key";

-- CreateIndex: composite unique on (provider, providerId)
CREATE UNIQUE INDEX IF NOT EXISTS "users_provider_providerId_key" ON "users"("provider", "providerId");
