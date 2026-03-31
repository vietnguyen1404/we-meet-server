-- CreateAuthProviderEnum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuthProvider') THEN
    CREATE TYPE "AuthProvider" AS ENUM ('local', 'google');
  END IF;
END $$;

-- AlterTable: add SSO columns and make passwordHash optional
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS "providerId" TEXT,
  ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Convert provider TEXT to AuthProvider enum
-- (Must drop default first, change type, then re-set default - PostgreSQL requirement)
ALTER TABLE "users" ALTER COLUMN "provider" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "provider" TYPE "AuthProvider" USING "provider"::text::"AuthProvider";
ALTER TABLE "users" ALTER COLUMN "provider" SET DEFAULT 'local'::"AuthProvider";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_providerId_key" ON "users"("providerId");
