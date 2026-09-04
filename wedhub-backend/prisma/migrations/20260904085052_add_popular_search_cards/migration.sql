-- AlterEnum
ALTER TYPE "MediaType" ADD VALUE 'POPULAR_SEARCH_IMAGE';

-- CreateTable
CREATE TABLE "popular_search_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "location_blurb" TEXT NOT NULL,
    "price_label" TEXT NOT NULL,
    "image_url" TEXT,
    "search_query" TEXT NOT NULL,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "popular_search_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "popular_search_cards_is_featured_idx" ON "popular_search_cards"("is_featured");
