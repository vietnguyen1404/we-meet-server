-- CreateAuthProviderEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuthProvider') THEN
    CREATE TYPE "AuthProvider" AS ENUM ('local', 'google');
  END IF;
END $$;

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS "providerId" TEXT,
  ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Convert provider text to enum and set default
ALTER TABLE "users"
  ALTER COLUMN "provider" TYPE "AuthProvider" USING "provider"::text::"AuthProvider",
  ALTER COLUMN "provider" SET DEFAULT 'local'::"AuthProvider";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_providerId_key" ON "users"("providerId");
