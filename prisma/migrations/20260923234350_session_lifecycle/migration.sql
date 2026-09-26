-- CreateEnum
CREATE TYPE "FlowStatus" AS ENUM ('NOT_STARTED', 'RUNNING', 'HANDED_OFF', 'ENDED');

-- AlterEnum
ALTER TYPE "MessageSender" ADD VALUE 'BOT';

-- AlterTable
ALTER TABLE "Chatbot" ADD COLUMN     "keepVariablesAcrossSessions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "restartKeywords" TEXT NOT NULL DEFAULT 'hi, menu, restart, start over',
ADD COLUMN     "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "currentNodeId" TEXT,
ADD COLUMN     "flowStatus" "FlowStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "variables" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "topicId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "buttons" JSONB;

-- CreateTable
CREATE TABLE "Flow" (
    "id" TEXT NOT NULL,
    "chatbotId" TEXT NOT NULL,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Flow_chatbotId_key" ON "Flow"("chatbotId");

-- AddForeignKey
ALTER TABLE "Flow" ADD CONSTRAINT "Flow_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "Chatbot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

