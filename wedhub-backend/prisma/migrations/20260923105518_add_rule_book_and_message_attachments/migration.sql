-- AlterEnum
ALTER TYPE "MediaType" ADD VALUE 'RULE_BOOK';

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "media_id" UUID;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "rule_book_media_id" UUID;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_rule_book_media_id_fkey" FOREIGN KEY ("rule_book_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
