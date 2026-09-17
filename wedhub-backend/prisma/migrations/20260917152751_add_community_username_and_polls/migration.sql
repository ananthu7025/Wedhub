-- CreateEnum
CREATE TYPE "CommunityPostType" AS ENUM ('TEXT', 'POLL');

-- AlterTable
ALTER TABLE "community_posts" ADD COLUMN     "post_type" "CommunityPostType" NOT NULL DEFAULT 'TEXT',
ALTER COLUMN "body" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "community_username" TEXT;

-- CreateTable
CREATE TABLE "community_poll_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "vote_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "community_poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_poll_votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "option_id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_poll_options_post_id_idx" ON "community_poll_options"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_poll_votes_post_id_user_id_key" ON "community_poll_votes"("post_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_community_username_key" ON "user_profiles"("community_username");

-- AddForeignKey
ALTER TABLE "community_poll_options" ADD CONSTRAINT "community_poll_options_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_poll_votes" ADD CONSTRAINT "community_poll_votes_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "community_poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_poll_votes" ADD CONSTRAINT "community_poll_votes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_poll_votes" ADD CONSTRAINT "community_poll_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
