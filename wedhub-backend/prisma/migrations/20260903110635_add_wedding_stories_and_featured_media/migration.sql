-- CreateTable
CREATE TABLE "wedding_stories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "album_id" UUID NOT NULL,
    "couple_name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "media_id" UUID NOT NULL,
    "title_override" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "featured_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wedding_stories_is_featured_idx" ON "wedding_stories"("is_featured");

-- CreateIndex
CREATE UNIQUE INDEX "featured_media_media_id_key" ON "featured_media"("media_id");

-- AddForeignKey
ALTER TABLE "wedding_stories" ADD CONSTRAINT "wedding_stories_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_media" ADD CONSTRAINT "featured_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
