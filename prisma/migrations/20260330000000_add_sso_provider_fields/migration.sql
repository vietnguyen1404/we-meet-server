-- AlterTable
ALTER TABLE "users" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN "providerId" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_providerId_key" ON "users"("providerId");
