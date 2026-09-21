-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "content" TEXT,
ADD COLUMN     "fileType" TEXT,
ALTER COLUMN "fileName" DROP NOT NULL,
ALTER COLUMN "fileUrl" DROP NOT NULL;
