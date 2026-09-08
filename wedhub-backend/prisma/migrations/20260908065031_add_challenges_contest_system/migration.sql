-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('DRAFT', 'UPCOMING', 'LIVE', 'VOTING', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ChallengeEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "ChallengeVoteScope" AS ENUM ('PER_ENTRY', 'PER_CHALLENGE');

-- AlterEnum
ALTER TYPE "MediaType" ADD VALUE 'CHALLENGE_ENTRY_PHOTO';

-- CreateTable
CREATE TABLE "challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "gallery_category_id" UUID,
    "description" TEXT,
    "banner_image" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "voting_start_date" TIMESTAMP(3) NOT NULL,
    "voting_end_date" TIMESTAMP(3) NOT NULL,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'DRAFT',
    "vote_scope" "ChallengeVoteScope" NOT NULL DEFAULT 'PER_ENTRY',
    "hide_live_rankings_before_end_hours" INTEGER,
    "allow_multiple_entries_per_vendor" BOOLEAN NOT NULL DEFAULT false,
    "max_entries" INTEGER,
    "prize_title" TEXT,
    "prize_description" TEXT,
    "prize_value" TEXT,
    "sponsor_name" TEXT,
    "sponsor_logo" TEXT,
    "sponsor_url" TEXT,
    "winner_entry_id" UUID,
    "rules" TEXT,
    "terms_and_conditions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "challenge_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_media_id" UUID NOT NULL,
    "location" TEXT,
    "status" "ChallengeEntryStatus" NOT NULL DEFAULT 'PENDING',
    "vote_count" INTEGER NOT NULL DEFAULT 0,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_entry_photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entry_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_entry_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "challenge_id" UUID NOT NULL,
    "entry_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "challenges_slug_key" ON "challenges"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "challenges_winner_entry_id_key" ON "challenges"("winner_entry_id");

-- CreateIndex
CREATE INDEX "challenges_status_idx" ON "challenges"("status");

-- CreateIndex
CREATE INDEX "challenges_category_id_idx" ON "challenges"("category_id");

-- CreateIndex
CREATE INDEX "challenges_gallery_category_id_idx" ON "challenges"("gallery_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_entries_image_media_id_key" ON "challenge_entries"("image_media_id");

-- CreateIndex
CREATE INDEX "challenge_entries_challenge_id_status_idx" ON "challenge_entries"("challenge_id", "status");

-- CreateIndex
CREATE INDEX "challenge_entries_vendor_id_idx" ON "challenge_entries"("vendor_id");

-- CreateIndex
CREATE INDEX "challenge_entries_challenge_id_vote_count_idx" ON "challenge_entries"("challenge_id", "vote_count");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_entry_photos_media_id_key" ON "challenge_entry_photos"("media_id");

-- CreateIndex
CREATE INDEX "challenge_entry_photos_entry_id_idx" ON "challenge_entry_photos"("entry_id");

-- CreateIndex
CREATE INDEX "challenge_votes_challenge_id_idx" ON "challenge_votes"("challenge_id");

-- CreateIndex
CREATE INDEX "challenge_votes_entry_id_idx" ON "challenge_votes"("entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_votes_user_id_challenge_id_entry_id_key" ON "challenge_votes"("user_id", "challenge_id", "entry_id");

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_gallery_category_id_fkey" FOREIGN KEY ("gallery_category_id") REFERENCES "gallery_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_winner_entry_id_fkey" FOREIGN KEY ("winner_entry_id") REFERENCES "challenge_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_image_media_id_fkey" FOREIGN KEY ("image_media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_entry_photos" ADD CONSTRAINT "challenge_entry_photos_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "challenge_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_entry_photos" ADD CONSTRAINT "challenge_entry_photos_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_votes" ADD CONSTRAINT "challenge_votes_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_votes" ADD CONSTRAINT "challenge_votes_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "challenge_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_votes" ADD CONSTRAINT "challenge_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
