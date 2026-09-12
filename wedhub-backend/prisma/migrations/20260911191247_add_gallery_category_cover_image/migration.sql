-- AlterEnum
ALTER TYPE "MediaType" ADD VALUE 'GALLERY_CATEGORY_COVER_IMAGE';

-- AlterTable
ALTER TABLE "gallery_categories" ADD COLUMN     "cover_image_url" TEXT;
