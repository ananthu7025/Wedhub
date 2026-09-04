-- CreateEnum
CREATE TYPE "StoreItemType" AS ENUM ('PHYSICAL_PRODUCT', 'RENTAL_ITEM', 'DIGITAL_DOWNLOAD', 'SERVICE_TOKEN');

-- CreateEnum
CREATE TYPE "StoreOrderStatus" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'PROCESSING', 'SHIPPED_OR_READY', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "MediaType" ADD VALUE 'STORE_ITEM_PHOTO';

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "has_store_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "vendor_stores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "store_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "about_store" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "whatsapp_order_phone" TEXT,
    "shipping_policy" TEXT,
    "return_policy" TEXT,
    "min_order_value" DECIMAL(10,2),
    "next_order_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_store_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "item_type" "StoreItemType" NOT NULL DEFAULT 'PHYSICAL_PRODUCT',
    "price" DECIMAL(10,2) NOT NULL,
    "compare_at_price" DECIMAL(10,2),
    "gst_rate" INTEGER NOT NULL DEFAULT 18,
    "min_order_quantity" INTEGER NOT NULL DEFAULT 1,
    "stock_quantity" INTEGER,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_store_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_store_item_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_store_item_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_store_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_number" TEXT NOT NULL,
    "store_id" UUID NOT NULL,
    "user_id" UUID,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_email" TEXT,
    "shipping_address" TEXT,
    "city" TEXT,
    "customer_state" TEXT,
    "pincode" TEXT,
    "event_date" TIMESTAMP(3),
    "total_amount" DECIMAL(10,2) NOT NULL,
    "status" "StoreOrderStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "order_channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "invoice_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_store_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_store_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "item_id" UUID,
    "item_title" TEXT NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "gst_rate" INTEGER NOT NULL DEFAULT 18,
    "quantity" INTEGER NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "customization_notes" TEXT,

    CONSTRAINT "vendor_store_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_stores_vendor_id_key" ON "vendor_stores"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_stores_slug_key" ON "vendor_stores"("slug");

-- CreateIndex
CREATE INDEX "vendor_store_items_store_id_is_available_idx" ON "vendor_store_items"("store_id", "is_available");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_store_items_store_id_slug_key" ON "vendor_store_items"("store_id", "slug");

-- CreateIndex
CREATE INDEX "vendor_store_item_media_item_id_sort_order_idx" ON "vendor_store_item_media"("item_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_store_item_media_item_id_media_id_key" ON "vendor_store_item_media"("item_id", "media_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_store_orders_order_number_key" ON "vendor_store_orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_store_orders_invoice_id_key" ON "vendor_store_orders"("invoice_id");

-- CreateIndex
CREATE INDEX "vendor_store_orders_store_id_status_idx" ON "vendor_store_orders"("store_id", "status");

-- CreateIndex
CREATE INDEX "vendor_store_orders_customer_phone_idx" ON "vendor_store_orders"("customer_phone");

-- CreateIndex
CREATE INDEX "categories_has_store_enabled_idx" ON "categories"("has_store_enabled");

-- AddForeignKey
ALTER TABLE "vendor_stores" ADD CONSTRAINT "vendor_stores_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_store_items" ADD CONSTRAINT "vendor_store_items_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "vendor_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_store_item_media" ADD CONSTRAINT "vendor_store_item_media_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "vendor_store_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_store_item_media" ADD CONSTRAINT "vendor_store_item_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_store_orders" ADD CONSTRAINT "vendor_store_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "vendor_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_store_orders" ADD CONSTRAINT "vendor_store_orders_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "vendor_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_store_order_items" ADD CONSTRAINT "vendor_store_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "vendor_store_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_store_order_items" ADD CONSTRAINT "vendor_store_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "vendor_store_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
