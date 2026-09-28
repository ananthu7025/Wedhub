-- DropColumn (replaced by catalog_store_promo_tiles — a repeatable list of
-- tiles rather than one fixed promo block; see CatalogStorePromoTile's
-- schema comment)
ALTER TABLE "catalog_store_settings" DROP COLUMN "promo_eyebrow";
ALTER TABLE "catalog_store_settings" DROP COLUMN "promo_heading";
ALTER TABLE "catalog_store_settings" DROP COLUMN "promo_description";
ALTER TABLE "catalog_store_settings" DROP COLUMN "promo_quote";

-- CreateTable
CREATE TABLE "catalog_store_promo_tiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "settings_id" UUID NOT NULL,
    "media_id" UUID,
    "heading" TEXT NOT NULL,
    "description" TEXT,
    "button_label" TEXT,
    "linked_collection_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_store_promo_tiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_store_promo_tiles_settings_id_sort_order_idx" ON "catalog_store_promo_tiles"("settings_id", "sort_order");

-- AddForeignKey
ALTER TABLE "catalog_store_promo_tiles" ADD CONSTRAINT "catalog_store_promo_tiles_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "catalog_store_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_store_promo_tiles" ADD CONSTRAINT "catalog_store_promo_tiles_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_store_promo_tiles" ADD CONSTRAINT "catalog_store_promo_tiles_linked_collection_id_fkey" FOREIGN KEY ("linked_collection_id") REFERENCES "catalog_collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
