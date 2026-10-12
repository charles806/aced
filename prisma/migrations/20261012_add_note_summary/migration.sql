-- AlterTable
ALTER TABLE "Note" ADD COLUMN "summary" TEXT,
ADD COLUMN "summaryStatus" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN "summaryError" TEXT,
ADD COLUMN "summaryUpdatedAt" TIMESTAMP(3),
ADD COLUMN "summaryModel" TEXT,
ADD COLUMN "summaryLength" TEXT;
