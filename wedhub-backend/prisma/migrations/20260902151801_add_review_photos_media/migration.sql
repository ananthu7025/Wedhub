-- AlterEnum
ALTER TYPE "MediaType" ADD VALUE 'REVIEW_PHOTO';

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "review_id" UUID,
ADD COLUMN     "user_id" UUID,
ALTER COLUMN "vendor_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "media_user_id_idx" ON "media"("user_id");

-- CreateIndex
CREATE INDEX "media_review_id_idx" ON "media"("review_id");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
