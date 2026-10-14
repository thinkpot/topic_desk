-- A chatbot can now have several flows; one of them is its main flow.
DROP INDEX "Flow_chatbotId_key";

ALTER TABLE "Flow" ADD COLUMN     "isMain" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Main';

-- Until now each chatbot had at most one flow, so every existing flow is a main flow.
UPDATE "Flow" SET "isMain" = true;

CREATE INDEX "Flow_chatbotId_idx" ON "Flow"("chatbotId");

-- Which flow a conversation is in, and where "run it, then come back" returns to.
ALTER TABLE "Conversation" ADD COLUMN     "currentFlowId" TEXT,
ADD COLUMN     "flowStack" JSONB NOT NULL DEFAULT '[]';
