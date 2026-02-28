-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterEnum
ALTER TYPE "CaseStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "refinementCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "address" TEXT,
ADD COLUMN     "gender" "Gender";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "hearAboutUs" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateIndex
CREATE INDEX "cases_createdAt_idx" ON "cases"("createdAt");
