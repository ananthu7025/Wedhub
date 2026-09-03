-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('SUBSCRIPTION', 'WEDDING_WEBSITE');

-- CreateEnum
CREATE TYPE "TelegramFlowType" AS ENUM ('ENQUIRY', 'WEDDING_WEBSITE');

-- CreateEnum
CREATE TYPE "WeddingWebsiteTemplate" AS ENUM ('ROYAL_WEDDING', 'MINIMAL_ELEGANT', 'TRADITIONAL_INDIAN');

-- CreateEnum
CREATE TYPE "WeddingWebsiteStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "WeddingWebsiteRsvpStatus" AS ENUM ('YES', 'NO', 'MAYBE');

-- AlterEnum
ALTER TYPE "MediaType" ADD VALUE 'WEDDING_WEBSITE_PHOTO';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TelegramConversationState" ADD VALUE 'WW_SELECTING_TEMPLATE';
ALTER TYPE "TelegramConversationState" ADD VALUE 'WW_COLLECTING_COUPLE_NAMES';
ALTER TYPE "TelegramConversationState" ADD VALUE 'WW_COLLECTING_WEDDING_DATE';
ALTER TYPE "TelegramConversationState" ADD VALUE 'WW_COLLECTING_VENUE';
ALTER TYPE "TelegramConversationState" ADD VALUE 'WW_COLLECTING_EVENTS';
ALTER TYPE "TelegramConversationState" ADD VALUE 'WW_COLLECTING_PHOTOS';
ALTER TYPE "TelegramConversationState" ADD VALUE 'WW_PREVIEW_READY';
ALTER TYPE "TelegramConversationState" ADD VALUE 'WW_AWAITING_PAYMENT';
ALTER TYPE "TelegramConversationState" ADD VALUE 'WW_PUBLISHED';

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "wedding_website_id" UUID;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "purpose" "PaymentPurpose" NOT NULL DEFAULT 'SUBSCRIPTION',
ADD COLUMN     "wedding_website_id" UUID;

-- AlterTable
ALTER TABLE "telegram_conversations" ADD COLUMN     "flow_type" "TelegramFlowType" NOT NULL DEFAULT 'ENQUIRY',
ADD COLUMN     "wedding_website_id" UUID;

-- CreateTable
CREATE TABLE "wedding_websites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID,
    "owner_telegram_user_id" UUID,
    "template" "WeddingWebsiteTemplate" NOT NULL DEFAULT 'ROYAL_WEDDING',
    "status" "WeddingWebsiteStatus" NOT NULL DEFAULT 'DRAFT',
    "slug" TEXT,
    "bride_name" TEXT NOT NULL,
    "groom_name" TEXT NOT NULL,
    "wedding_date" TIMESTAMP(3),
    "wedding_time" TEXT,
    "venue_name" TEXT,
    "venue_address" TEXT,
    "google_maps_url" TEXT,
    "short_description" TEXT,
    "bride_parents" TEXT,
    "groom_parents" TEXT,
    "wedding_hashtag" TEXT,
    "contact_info" TEXT,
    "social_links" JSONB,
    "couple_story" TEXT,
    "bride_description" TEXT,
    "groom_description" TEXT,
    "how_we_met" TEXT,
    "cover_media_id" UUID,
    "couple_photo_media_id" UUID,
    "preview_token_hash" TEXT,
    "preview_created_at" TIMESTAMP(3),
    "preview_expires_at" TIMESTAMP(3),
    "preview_used_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_websites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wedding_website_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wedding_website_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "time" TEXT,
    "venue" TEXT,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_website_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wedding_website_rsvps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wedding_website_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "attending" "WeddingWebsiteRsvpStatus" NOT NULL,
    "guest_count" INTEGER,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wedding_website_rsvps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wedding_websites_slug_key" ON "wedding_websites"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "wedding_websites_cover_media_id_key" ON "wedding_websites"("cover_media_id");

-- CreateIndex
CREATE UNIQUE INDEX "wedding_websites_couple_photo_media_id_key" ON "wedding_websites"("couple_photo_media_id");

-- CreateIndex
CREATE INDEX "wedding_websites_owner_user_id_idx" ON "wedding_websites"("owner_user_id");

-- CreateIndex
CREATE INDEX "wedding_websites_owner_telegram_user_id_idx" ON "wedding_websites"("owner_telegram_user_id");

-- CreateIndex
CREATE INDEX "wedding_websites_status_idx" ON "wedding_websites"("status");

-- CreateIndex
CREATE INDEX "wedding_website_events_wedding_website_id_idx" ON "wedding_website_events"("wedding_website_id");

-- CreateIndex
CREATE INDEX "wedding_website_rsvps_wedding_website_id_idx" ON "wedding_website_rsvps"("wedding_website_id");

-- CreateIndex
CREATE INDEX "media_wedding_website_id_idx" ON "media"("wedding_website_id");

-- CreateIndex
CREATE INDEX "payments_wedding_website_id_idx" ON "payments"("wedding_website_id");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_wedding_website_id_fkey" FOREIGN KEY ("wedding_website_id") REFERENCES "wedding_websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_wedding_website_id_fkey" FOREIGN KEY ("wedding_website_id") REFERENCES "wedding_websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_conversations" ADD CONSTRAINT "telegram_conversations_wedding_website_id_fkey" FOREIGN KEY ("wedding_website_id") REFERENCES "wedding_websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_websites" ADD CONSTRAINT "wedding_websites_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_websites" ADD CONSTRAINT "wedding_websites_owner_telegram_user_id_fkey" FOREIGN KEY ("owner_telegram_user_id") REFERENCES "telegram_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_websites" ADD CONSTRAINT "wedding_websites_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_websites" ADD CONSTRAINT "wedding_websites_couple_photo_media_id_fkey" FOREIGN KEY ("couple_photo_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_website_events" ADD CONSTRAINT "wedding_website_events_wedding_website_id_fkey" FOREIGN KEY ("wedding_website_id") REFERENCES "wedding_websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_website_rsvps" ADD CONSTRAINT "wedding_website_rsvps_wedding_website_id_fkey" FOREIGN KEY ("wedding_website_id") REFERENCES "wedding_websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
