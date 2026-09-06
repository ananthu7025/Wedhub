-- AlterEnum
ALTER TYPE "MediaType" ADD VALUE 'INSPIRATION_PHOTO';

-- CreateTable
CREATE TABLE "gallery_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gallery_categories_slug_key" ON "gallery_categories"("slug");

-- AlterTable
ALTER TABLE "featured_media" ADD COLUMN     "gallery_category_id" UUID;

-- CreateIndex
CREATE INDEX "featured_media_gallery_category_id_idx" ON "featured_media"("gallery_category_id");

-- AddForeignKey
ALTER TABLE "featured_media" ADD CONSTRAINT "featured_media_gallery_category_id_fkey" FOREIGN KEY ("gallery_category_id") REFERENCES "gallery_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
