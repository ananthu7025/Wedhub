-- This migration originally also contained auto-generated DROP INDEX
-- statements for vendor_profiles_description_trgm_idx,
-- vendor_profiles_short_description_trgm_idx, vendor_profiles_starting_price_idx,
-- vendor_profiles_tags_gin_idx, vendors_business_name_trgm_idx, and
-- vendors_status_city_idx. Those indexes were added via hand-authored raw
-- SQL in Arch Phase 7's migration (20260901221256_add_search_logs) but
-- weren't declared in schema.prisma at the time, so `prisma migrate dev`'s
-- drift detection treated them as unaccounted-for state to reconcile away —
-- this silently executed and would have destroyed Arch Phase 7's real
-- search indexes. Caught by re-checking pg_indexes after this migration
-- ran and finding them gone; fixed at the root by enabling the
-- postgresqlExtensions preview feature and declaring pg_trgm plus every
-- affected index directly in schema.prisma (see the generator/datasource
-- blocks and the Vendor/VendorProfile models), so they're now first-class
-- tracked schema state instead of invisible raw SQL. This migration was
-- then rewritten to only contain the shortlist tables it was meant to add.

-- CreateTable
CREATE TABLE "shortlists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "share_token" TEXT,
    "share_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shortlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlist_items" (
    "shortlist_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shortlist_items_pkey" PRIMARY KEY ("shortlist_id","vendor_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shortlists_share_token_key" ON "shortlists"("share_token");

-- CreateIndex
CREATE INDEX "shortlists_user_id_idx" ON "shortlists"("user_id");

-- CreateIndex
CREATE INDEX "shortlist_items_vendor_id_idx" ON "shortlist_items"("vendor_id");

-- AddForeignKey
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_items" ADD CONSTRAINT "shortlist_items_shortlist_id_fkey" FOREIGN KEY ("shortlist_id") REFERENCES "shortlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlist_items" ADD CONSTRAINT "shortlist_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
