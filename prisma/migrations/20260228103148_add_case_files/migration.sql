-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('SCAN', 'PHOTO', 'XRAY', 'OTHER');

-- CreateTable
CREATE TABLE "case_files" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "category" "FileCategory" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_files_caseId_idx" ON "case_files"("caseId");

-- CreateIndex
CREATE INDEX "case_files_category_idx" ON "case_files"("category");

-- AddForeignKey
ALTER TABLE "case_files" ADD CONSTRAINT "case_files_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
