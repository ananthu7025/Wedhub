/*
  Warnings:

  - You are about to drop the column `banner_media_id` on the `catalog_store_settings` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "catalog_store_settings" DROP CONSTRAINT "catalog_store_settings_banner_media_id_fkey";

-- AlterTable
ALTER TABLE "catalog_collections" ADD COLUMN     "cover_media_id" UUID;

-- AlterTable
ALTER TABLE "catalog_store_settings" DROP COLUMN "banner_media_id";

-- CreateTable
CREATE TABLE "catalog_store_hero_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "settings_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_store_hero_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_store_gallery_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "settings_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_store_gallery_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_store_hero_media_settings_id_sort_order_idx" ON "catalog_store_hero_media"("settings_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_store_hero_media_settings_id_media_id_key" ON "catalog_store_hero_media"("settings_id", "media_id");

-- CreateIndex
CREATE INDEX "catalog_store_gallery_media_settings_id_sort_order_idx" ON "catalog_store_gallery_media"("settings_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_store_gallery_media_settings_id_media_id_key" ON "catalog_store_gallery_media"("settings_id", "media_id");

-- AddForeignKey
ALTER TABLE "catalog_collections" ADD CONSTRAINT "catalog_collections_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_store_hero_media" ADD CONSTRAINT "catalog_store_hero_media_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "catalog_store_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_store_hero_media" ADD CONSTRAINT "catalog_store_hero_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_store_gallery_media" ADD CONSTRAINT "catalog_store_gallery_media_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "catalog_store_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_store_gallery_media" ADD CONSTRAINT "catalog_store_gallery_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
