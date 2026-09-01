-- CreateTable
CREATE TABLE "search_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "keyword" TEXT,
    "category_id" UUID,
    "city_id" UUID,
    "filters" JSONB,
    "sort" TEXT,
    "result_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_logs_created_at_idx" ON "search_logs"("created_at");

-- CreateIndex
CREATE INDEX "search_logs_keyword_idx" ON "search_logs"("keyword");

-- AddForeignKey
ALTER TABLE "search_logs" ADD CONSTRAINT "search_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable trigram support for fuzzy keyword search (Arch Phase 7).
-- Not expressible via Prisma's schema DSL without the postgresqlExtensions
-- preview feature, which this project has not opted into — same pattern as
-- the hand-authored partial unique index from Arch Phase 5's migration.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes power ILIKE/similarity keyword matching on the fields
-- users actually search by: business name and the profile's short/long
-- description. Vendor.businessName is used directly since a vendor's
-- profile may not exist yet on DRAFT vendors.
CREATE INDEX "vendors_business_name_trgm_idx" ON "vendors" USING GIN ("business_name" gin_trgm_ops);
CREATE INDEX "vendor_profiles_short_description_trgm_idx" ON "vendor_profiles" USING GIN ("short_description" gin_trgm_ops);
CREATE INDEX "vendor_profiles_description_trgm_idx" ON "vendor_profiles" USING GIN ("description" gin_trgm_ops);

-- GIN index for tag array containment/overlap lookups (vendor_profiles.tags).
CREATE INDEX "vendor_profiles_tags_gin_idx" ON "vendor_profiles" USING GIN ("tags");

-- Composite indexes for the most common search filter combinations, since
-- listApprovedVendors-style queries always start from status = 'APPROVED'.
CREATE INDEX "vendors_status_city_idx" ON "vendors" ("status", "city_id");
CREATE INDEX "vendor_profiles_starting_price_idx" ON "vendor_profiles" ("starting_price");
