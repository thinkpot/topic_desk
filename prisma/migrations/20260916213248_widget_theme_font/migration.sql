-- AlterTable
ALTER TABLE "Chatbot" DROP COLUMN "widgetColor",
ADD COLUMN     "widgetFont" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "widgetTheme" TEXT NOT NULL DEFAULT 'light-daylight';

