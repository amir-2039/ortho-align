-- AlterEnum
ALTER TYPE "FileCategory" ADD VALUE 'PRODUCTION';

-- AlterTable
ALTER TABLE "case_comments" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "case_production_urls" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_production_urls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_production_urls_caseId_idx" ON "case_production_urls"("caseId");

-- CreateIndex
CREATE INDEX "case_comments_isInternal_idx" ON "case_comments"("isInternal");

-- AddForeignKey
ALTER TABLE "case_production_urls" ADD CONSTRAINT "case_production_urls_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_production_urls" ADD CONSTRAINT "case_production_urls_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
