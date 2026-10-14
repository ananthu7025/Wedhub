-- CreateEnum
CREATE TYPE "OfferBadgeType" AS ENUM ('SAVE_PERCENT', 'FLAT_PERCENT_OFF', 'NEW', 'LIMITED_TIME_DEAL', 'FREE_ADD_ON', 'TOP_RATED', 'CATALOG_OFFER');

-- AlterEnum
BEGIN;
CREATE TYPE "MediaType_new" AS ENUM ('LOGO', 'COVER', 'PORTFOLIO', 'VIDEO', 'REVIEW_PHOTO', 'CATEGORY_IMAGE', 'WEDDING_WEBSITE_PHOTO', 'POPULAR_SEARCH_IMAGE', 'BLOG_COVER_IMAGE', 'INSPIRATION_PHOTO', 'PACKAGE_PHOTO', 'CHALLENGE_ENTRY_PHOTO', 'CATEGORY_ATTRIBUTE_PHOTO', 'GALLERY_CATEGORY_COVER_IMAGE', 'COMMUNITY_POST_PHOTO', 'CATALOG_ITEM_PHOTO', 'OFFER_PHOTO', 'RULE_BOOK');
ALTER TABLE "media" ALTER COLUMN "media_type" TYPE "MediaType_new" USING ("media_type"::text::"MediaType_new");
ALTER TYPE "MediaType" RENAME TO "MediaType_old";
ALTER TYPE "MediaType_new" RENAME TO "MediaType";
DROP TYPE "public"."MediaType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "vendor_payment_accounts" DROP CONSTRAINT "vendor_payment_accounts_vendor_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_store_item_media" DROP CONSTRAINT "vendor_store_item_media_item_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_store_item_media" DROP CONSTRAINT "vendor_store_item_media_media_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_store_items" DROP CONSTRAINT "vendor_store_items_store_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_store_order_items" DROP CONSTRAINT "vendor_store_order_items_item_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_store_order_items" DROP CONSTRAINT "vendor_store_order_items_order_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_store_order_refunds" DROP CONSTRAINT "vendor_store_order_refunds_order_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_store_orders" DROP CONSTRAINT "vendor_store_orders_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_store_orders" DROP CONSTRAINT "vendor_store_orders_store_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_store_orders" DROP CONSTRAINT "vendor_store_orders_vendor_payment_account_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_store_payment_attempts" DROP CONSTRAINT "vendor_store_payment_attempts_order_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_store_settlements" DROP CONSTRAINT "vendor_store_settlements_order_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_store_settlements" DROP CONSTRAINT "vendor_store_settlements_vendor_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_store_transfers" DROP CONSTRAINT "vendor_store_transfers_order_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_store_transfers" DROP CONSTRAINT "vendor_store_transfers_vendor_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_stores" DROP CONSTRAINT "vendor_stores_vendor_id_fkey";

-- DropIndex
DROP INDEX "categories_has_store_enabled_idx";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "has_store_enabled";

-- DropTable
DROP TABLE "vendor_payment_accounts";

-- DropTable
DROP TABLE "vendor_store_item_media";

-- DropTable
DROP TABLE "vendor_store_items";

-- DropTable
DROP TABLE "vendor_store_order_items";

-- DropTable
DROP TABLE "vendor_store_order_refunds";

-- DropTable
DROP TABLE "vendor_store_orders";

-- DropTable
DROP TABLE "vendor_store_payment_attempts";

-- DropTable
DROP TABLE "vendor_store_settlements";

-- DropTable
DROP TABLE "vendor_store_transfers";

-- DropTable
DROP TABLE "vendor_stores";

-- DropEnum
DROP TYPE "StoreItemType";

-- DropEnum
DROP TYPE "StoreOrderStatus";

-- DropEnum
DROP TYPE "StorePaymentStatus";

-- DropEnum
DROP TYPE "StoreTransferStatus";

-- DropEnum
DROP TYPE "VendorPaymentAccountStatus";

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "original_price" DECIMAL(12,2) NOT NULL,
    "offer_price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "badge_type" "OfferBadgeType" NOT NULL,
    "discount_percent" INTEGER,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offer_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offers_vendor_id_idx" ON "offers"("vendor_id");

-- CreateIndex
CREATE INDEX "offers_category_id_is_active_idx" ON "offers"("category_id", "is_active");

-- CreateIndex
CREATE INDEX "offers_is_active_end_date_idx" ON "offers"("is_active", "end_date");

-- CreateIndex
CREATE INDEX "offer_media_offer_id_sort_order_idx" ON "offer_media"("offer_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "offer_media_offer_id_media_id_key" ON "offer_media"("offer_id", "media_id");

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_media" ADD CONSTRAINT "offer_media_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_media" ADD CONSTRAINT "offer_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

