-- CreateEnum
CREATE TYPE "CatalogAvailabilityStatus" AS ENUM ('BOOKED', 'BLOCKED');

-- AlterEnum
ALTER TYPE "MediaType" ADD VALUE 'CATALOG_ITEM_PHOTO';

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "has_catalog_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "category_catalog_variant_fields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "data_type" "AttributeDataType" NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_catalog_variant_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "base_price" DECIMAL(10,2),
    "is_customizable" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_item_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "attributes" JSONB NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "sku" TEXT,
    "stock_quantity" INTEGER,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_item_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_item_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_item_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_item_components" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "default_qty" INTEGER NOT NULL DEFAULT 1,
    "min_qty" INTEGER NOT NULL DEFAULT 0,
    "max_qty" INTEGER,
    "unit_price" DECIMAL(10,2),
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_item_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_item_availability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "variant_id" UUID,
    "date" DATE NOT NULL,
    "status" "CatalogAvailabilityStatus" NOT NULL DEFAULT 'BOOKED',
    "note" TEXT,

    CONSTRAINT "catalog_item_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_catalog_variant_fields_category_id_key_key" ON "category_catalog_variant_fields"("category_id", "key");

-- CreateIndex
CREATE INDEX "catalog_items_vendor_id_is_active_idx" ON "catalog_items"("vendor_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_items_vendor_id_slug_key" ON "catalog_items"("vendor_id", "slug");

-- CreateIndex
CREATE INDEX "catalog_item_variants_item_id_idx" ON "catalog_item_variants"("item_id");

-- CreateIndex
CREATE INDEX "catalog_item_media_item_id_sort_order_idx" ON "catalog_item_media"("item_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_item_media_item_id_media_id_key" ON "catalog_item_media"("item_id", "media_id");

-- CreateIndex
CREATE INDEX "catalog_item_components_item_id_idx" ON "catalog_item_components"("item_id");

-- CreateIndex
CREATE INDEX "catalog_item_availability_item_id_date_idx" ON "catalog_item_availability"("item_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_item_availability_item_id_variant_id_date_key" ON "catalog_item_availability"("item_id", "variant_id", "date");

-- CreateIndex
CREATE INDEX "categories_has_catalog_enabled_idx" ON "categories"("has_catalog_enabled");

-- AddForeignKey
ALTER TABLE "category_catalog_variant_fields" ADD CONSTRAINT "category_catalog_variant_fields_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_item_variants" ADD CONSTRAINT "catalog_item_variants_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_item_media" ADD CONSTRAINT "catalog_item_media_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_item_media" ADD CONSTRAINT "catalog_item_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_item_components" ADD CONSTRAINT "catalog_item_components_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_item_availability" ADD CONSTRAINT "catalog_item_availability_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_item_availability" ADD CONSTRAINT "catalog_item_availability_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "catalog_item_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
