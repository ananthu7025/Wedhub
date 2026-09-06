-- AlterEnum
ALTER TYPE "MediaType" ADD VALUE 'PACKAGE_PHOTO';

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "image_media_id" UUID;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_image_media_id_fkey" FOREIGN KEY ("image_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
