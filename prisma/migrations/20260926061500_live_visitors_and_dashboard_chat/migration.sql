-- AlterTable
ALTER TABLE "Chatbot" ADD COLUMN     "dashboardChatEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "maxLiveVisitors" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "supportsDashboardChat" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LiveVisitor" (
    "id" TEXT NOT NULL,
    "chatbotId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "currentUrl" TEXT NOT NULL,
    "scrollPercent" INTEGER NOT NULL DEFAULT 0,
    "referrer" TEXT,
    "userAgent" TEXT,
    "pageViews" JSONB NOT NULL DEFAULT '[]',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveVisitor_chatbotId_lastSeenAt_idx" ON "LiveVisitor"("chatbotId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "LiveVisitor_chatbotId_visitorId_key" ON "LiveVisitor"("chatbotId", "visitorId");

-- AddForeignKey
ALTER TABLE "LiveVisitor" ADD CONSTRAINT "LiveVisitor_chatbotId_fkey" FOREIGN KEY ("chatbotId") REFERENCES "Chatbot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

