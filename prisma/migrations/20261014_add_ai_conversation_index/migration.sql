-- AlterTable
ALTER TABLE "AIConversation" ADD COLUMN "title" TEXT;

-- CreateIndex
CREATE INDEX "AIConversation_userId_updatedAt_idx" ON "AIConversation"("userId", "updatedAt");
