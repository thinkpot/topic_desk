-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "FollowUpState" AS ENUM ('PENDING', 'SENT', 'SKIPPED', 'FAILED');

-- AlterTable
ALTER TABLE "Chatbot" ADD COLUMN     "followUpBody" TEXT,
ADD COLUMN     "followUpDelayHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "followUpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "followUpSubject" TEXT;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "chatbotId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "pageUrl" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "followUpState" "FollowUpState" NOT NULL DEFAULT 'PENDING',
    "followUpAt" TIMESTAMP(3),
    "followUpAttempts" INTEGER NOT NULL DEFAULT 0,
    "followUpNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_conversationId_key" ON "Lead"("conversationId");

-- CreateIndex
CREATE INDEX "Lead_chatbotId_createdAt_idx" ON "Lead"("chatbotId", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_followUpState_createdAt_idx" ON "Lead"("followUpState", "createdAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "Chatbot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

