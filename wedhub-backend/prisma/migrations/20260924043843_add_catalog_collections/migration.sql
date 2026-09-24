-- CreateTable
CREATE TABLE "catalog_collections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_item_collections" (
    "item_id" UUID NOT NULL,
    "collection_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_item_collections_pkey" PRIMARY KEY ("item_id","collection_id")
);

-- CreateIndex
CREATE INDEX "catalog_collections_vendor_id_sort_order_idx" ON "catalog_collections"("vendor_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_collections_vendor_id_slug_key" ON "catalog_collections"("vendor_id", "slug");

-- CreateIndex
CREATE INDEX "catalog_item_collections_collection_id_idx" ON "catalog_item_collections"("collection_id");

-- AddForeignKey
ALTER TABLE "catalog_collections" ADD CONSTRAINT "catalog_collections_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_item_collections" ADD CONSTRAINT "catalog_item_collections_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_item_collections" ADD CONSTRAINT "catalog_item_collections_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "catalog_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
