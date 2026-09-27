-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "UpgradeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trialStartedAt" TIMESTAMP(3),
ADD COLUMN     "websiteUrl" TEXT;

-- CreateTable
CREATE TABLE "UpgradeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "status" "UpgradeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpgradeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UpgradeRequest_status_createdAt_idx" ON "UpgradeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "UpgradeRequest_userId_idx" ON "UpgradeRequest"("userId");

-- AddForeignKey
ALTER TABLE "UpgradeRequest" ADD CONSTRAINT "UpgradeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeRequest" ADD CONSTRAINT "UpgradeRequest_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpgradeRequest" ADD CONSTRAINT "UpgradeRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Emails are now normalized (trimmed, lowercased) on every write and lookup;
-- bring existing rows in line so their owners can still log in.
UPDATE "User" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"));

-- Existing trial accounts: their trial started when they signed up.
UPDATE "User" u SET "trialStartedAt" = u."createdAt"
FROM "Plan" p WHERE u."planId" = p."id" AND p."slug" = 'free' AND u."trialStartedAt" IS NULL;
