-- CreateEnum
CREATE TYPE "WeddingStoryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StoryCollaboratorStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');

-- AlterTable
ALTER TABLE "wedding_stories" ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "status" "WeddingStoryStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "submitted_by_vendor_id" UUID;

-- CreateTable
CREATE TABLE "wedding_story_vendors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wedding_story_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "status" "StoryCollaboratorStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_story_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wedding_story_vendors_vendor_id_status_idx" ON "wedding_story_vendors"("vendor_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "wedding_story_vendors_wedding_story_id_vendor_id_key" ON "wedding_story_vendors"("wedding_story_id", "vendor_id");

-- CreateIndex
CREATE INDEX "wedding_stories_status_idx" ON "wedding_stories"("status");

-- CreateIndex
CREATE INDEX "wedding_stories_submitted_by_vendor_id_idx" ON "wedding_stories"("submitted_by_vendor_id");

-- AddForeignKey
ALTER TABLE "wedding_stories" ADD CONSTRAINT "wedding_stories_submitted_by_vendor_id_fkey" FOREIGN KEY ("submitted_by_vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_story_vendors" ADD CONSTRAINT "wedding_story_vendors_wedding_story_id_fkey" FOREIGN KEY ("wedding_story_id") REFERENCES "wedding_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_story_vendors" ADD CONSTRAINT "wedding_story_vendors_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
