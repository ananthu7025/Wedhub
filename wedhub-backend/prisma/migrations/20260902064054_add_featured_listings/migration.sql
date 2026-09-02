-- CreateEnum
CREATE TYPE "PlacementType" AS ENUM ('HOMEPAGE', 'CATEGORY_PAGE', 'CITY_PAGE', 'SEARCH_RESULTS');

-- CreateEnum
CREATE TYPE "FeaturedListingStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "featured_listings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "placement_type" "PlacementType" NOT NULL,
    "category_id" UUID,
    "city_id" UUID,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "FeaturedListingStatus" NOT NULL DEFAULT 'DRAFT',
    "payment_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featured_listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "featured_listings_payment_id_key" ON "featured_listings"("payment_id");

-- CreateIndex
CREATE INDEX "featured_listings_vendor_id_idx" ON "featured_listings"("vendor_id");

-- CreateIndex
CREATE INDEX "featured_listings_status_start_date_end_date_idx" ON "featured_listings"("status", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "featured_listings_placement_type_category_id_city_id_idx" ON "featured_listings"("placement_type", "category_id", "city_id");

-- AddForeignKey
ALTER TABLE "featured_listings" ADD CONSTRAINT "featured_listings_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_listings" ADD CONSTRAINT "featured_listings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_listings" ADD CONSTRAINT "featured_listings_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_listings" ADD CONSTRAINT "featured_listings_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_listings" ADD CONSTRAINT "featured_listings_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
