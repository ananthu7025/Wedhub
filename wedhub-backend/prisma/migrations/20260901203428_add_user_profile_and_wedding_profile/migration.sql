-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "avatar_url" TEXT;

-- CreateTable
CREATE TABLE "wedding_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "wedding_date" TIMESTAMP(3),
    "city_id" UUID,
    "venue_city_id" UUID,
    "guest_count" INTEGER,
    "estimated_budget" DECIMAL(12,2),
    "wedding_style" TEXT,
    "partner_name" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wedding_profiles_user_id_key" ON "wedding_profiles"("user_id");

-- AddForeignKey
ALTER TABLE "wedding_profiles" ADD CONSTRAINT "wedding_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
