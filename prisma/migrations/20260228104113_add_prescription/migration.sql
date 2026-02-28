-- CreateEnum
CREATE TYPE "AlignmentGoal" AS ENUM ('MAINTAIN', 'IMPROVE', 'IDEALIZE');

-- CreateEnum
CREATE TYPE "ProcedureOption" AS ENUM ('YES', 'NO', 'ONLY_IF_NEEDED');

-- CreateEnum
CREATE TYPE "MidlinePosition" AS ENUM ('CENTERED', 'SHIFTED_RIGHT', 'SHIFTED_LEFT');

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "durationRecommended" BOOLEAN NOT NULL DEFAULT true,
    "durationLimitSteps" INTEGER,
    "chiefComplaint" TEXT NOT NULL,
    "upperMidlinePosition" "MidlinePosition" NOT NULL DEFAULT 'CENTERED',
    "upperMidlineShiftMm" DOUBLE PRECISION,
    "lowerMidlinePosition" "MidlinePosition" NOT NULL DEFAULT 'CENTERED',
    "lowerMidlineShiftMm" DOUBLE PRECISION,
    "canineRelationshipRight" TEXT,
    "canineRelationshipLeft" TEXT,
    "molarRelationshipRight" TEXT,
    "molarRelationshipLeft" TEXT,
    "treatUpperArch" BOOLEAN NOT NULL DEFAULT true,
    "treatLowerArch" BOOLEAN NOT NULL DEFAULT true,
    "upperMidlineGoal" "AlignmentGoal" NOT NULL DEFAULT 'IMPROVE',
    "lowerMidlineGoal" "AlignmentGoal" NOT NULL DEFAULT 'IMPROVE',
    "overjetGoal" "AlignmentGoal" NOT NULL DEFAULT 'IMPROVE',
    "overbiteGoal" "AlignmentGoal" NOT NULL DEFAULT 'IMPROVE',
    "archFormGoal" "AlignmentGoal" NOT NULL DEFAULT 'IMPROVE',
    "canineRelationshipGoal" "AlignmentGoal" NOT NULL DEFAULT 'IMPROVE',
    "molarRelationshipGoal" "AlignmentGoal" NOT NULL DEFAULT 'MAINTAIN',
    "posteriorRelationshipGoal" "AlignmentGoal" NOT NULL DEFAULT 'MAINTAIN',
    "iprOption" "ProcedureOption" NOT NULL DEFAULT 'ONLY_IF_NEEDED',
    "engagersOption" "ProcedureOption" NOT NULL DEFAULT 'ONLY_IF_NEEDED',
    "proclineOption" "ProcedureOption" NOT NULL DEFAULT 'ONLY_IF_NEEDED',
    "expandOption" "ProcedureOption" NOT NULL DEFAULT 'ONLY_IF_NEEDED',
    "distalizeOption" "ProcedureOption" NOT NULL DEFAULT 'ONLY_IF_NEEDED',
    "avoidEngagersTeeth" JSONB NOT NULL DEFAULT '[]',
    "extractTeeth" JSONB NOT NULL DEFAULT '[]',
    "leaveSpacesTeeth" JSONB NOT NULL DEFAULT '[]',
    "doNotMoveTeeth" JSONB NOT NULL DEFAULT '[]',
    "includeRetainer" BOOLEAN NOT NULL DEFAULT true,
    "additionalInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_caseId_key" ON "prescriptions"("caseId");

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
