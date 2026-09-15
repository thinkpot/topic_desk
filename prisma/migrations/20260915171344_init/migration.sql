-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('BASIC', 'PRO');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('VISITOR', 'AGENT', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'BASIC',
    "planExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chatbot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "botUsername" TEXT,
    "groupChatId" TEXT NOT NULL,
    "widgetColor" TEXT NOT NULL DEFAULT '#2563eb',
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Hi! How can we help you today?',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowedDomains" TEXT,
    "webhookSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chatbot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "chatbotId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "visitorName" TEXT,
    "topicId" INTEGER NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sender" "MessageSender" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Chatbot_userId_idx" ON "Chatbot"("userId");

-- CreateIndex
CREATE INDEX "Conversation_chatbotId_createdAt_idx" ON "Conversation"("chatbotId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_chatbotId_visitorId_key" ON "Conversation"("chatbotId", "visitorId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_chatbotId_topicId_key" ON "Conversation"("chatbotId", "topicId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Chatbot" ADD CONSTRAINT "Chatbot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "Chatbot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
