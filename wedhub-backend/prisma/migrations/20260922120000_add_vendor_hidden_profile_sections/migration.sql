-- AlterTable
ALTER TABLE "vendors" ADD COLUMN "hidden_profile_sections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
