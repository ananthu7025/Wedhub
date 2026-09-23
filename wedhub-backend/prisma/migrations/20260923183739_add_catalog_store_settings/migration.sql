-- CreateTable
CREATE TABLE "catalog_store_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "banner_media_id" UUID,
    "hero_headline" TEXT,
    "hero_tagline" TEXT,
    "hero_subtitle" TEXT,
    "announcement_text" TEXT,
    "shop_button_text" TEXT,
    "trial_button_text" TEXT,
    "accent_color" "StoreAccentColor" NOT NULL DEFAULT 'CRIMSON',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_store_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_store_settings_vendor_id_key" ON "catalog_store_settings"("vendor_id");

-- AddForeignKey
ALTER TABLE "catalog_store_settings" ADD CONSTRAINT "catalog_store_settings_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_store_settings" ADD CONSTRAINT "catalog_store_settings_banner_media_id_fkey" FOREIGN KEY ("banner_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
