-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "verificationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "verificationSentAt" TIMESTAMP(3),
ADD COLUMN     "verificationTokenHash" TEXT;
