-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "homepage_sort_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "is_featured_on_homepage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "starting_price_label" TEXT;

-- CreateIndex
CREATE INDEX "categories_is_featured_on_homepage_idx" ON "categories"("is_featured_on_homepage");
