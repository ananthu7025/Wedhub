-- CreateEnum
CREATE TYPE "FunctionType" AS ENUM ('ENGAGEMENT', 'SANGEET', 'MEHENDI', 'HALDI', 'WEDDING', 'RECEPTION', 'OTHER');

-- AlterTable
ALTER TABLE "wedding_profiles" ADD COLUMN     "profile_completed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "wedding_profile_event_dates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wedding_profile_id" UUID NOT NULL,
    "function_type" "FunctionType" NOT NULL,
    "other_label" TEXT,
    "date" DATE NOT NULL,
    "time" TEXT,
    "guest_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_profile_event_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wedding_profile_category_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wedding_profile_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "budget_min" DECIMAL(12,2),
    "budget_max" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wedding_profile_category_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wedding_profile_event_dates_wedding_profile_id_idx" ON "wedding_profile_event_dates"("wedding_profile_id");

-- CreateIndex
CREATE INDEX "wedding_profile_category_preferences_category_id_idx" ON "wedding_profile_category_preferences"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "wedding_profile_category_preferences_wedding_profile_id_cat_key" ON "wedding_profile_category_preferences"("wedding_profile_id", "category_id");

-- AddForeignKey
ALTER TABLE "wedding_profile_event_dates" ADD CONSTRAINT "wedding_profile_event_dates_wedding_profile_id_fkey" FOREIGN KEY ("wedding_profile_id") REFERENCES "wedding_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_profile_category_preferences" ADD CONSTRAINT "wedding_profile_category_preferences_wedding_profile_id_fkey" FOREIGN KEY ("wedding_profile_id") REFERENCES "wedding_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wedding_profile_category_preferences" ADD CONSTRAINT "wedding_profile_category_preferences_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
