-- CreateEnum
CREATE TYPE "SeoPageType" AS ENUM ('CATEGORY', 'CITY', 'CATEGORY_CITY');

-- CreateTable
CREATE TABLE "seo_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "page_type" "SeoPageType" NOT NULL,
    "category_id" UUID,
    "location_id" UUID,
    "title" TEXT,
    "description" TEXT,
    "og_image_url" TEXT,
    "no_index" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seo_overrides_page_type_category_id_location_id_key" ON "seo_overrides"("page_type", "category_id", "location_id");

-- AddForeignKey
ALTER TABLE "seo_overrides" ADD CONSTRAINT "seo_overrides_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_overrides" ADD CONSTRAINT "seo_overrides_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
