-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('local', 'google');

-- AlterTable: cast existing text values to the new enum
ALTER TABLE "users"
  ALTER COLUMN "provider" TYPE "AuthProvider" USING "provider"::"AuthProvider",
  ALTER COLUMN "provider" SET DEFAULT 'local';

-- DropIndex
DROP INDEX "users_providerId_key";

-- CreateIndex: composite unique on (provider, providerId)
CREATE UNIQUE INDEX "users_provider_providerId_key" ON "users"("provider", "providerId");
