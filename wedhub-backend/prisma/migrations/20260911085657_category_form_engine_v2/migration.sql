-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AttributeDataType" ADD VALUE 'TEXTAREA';
ALTER TYPE "AttributeDataType" ADD VALUE 'NUMBER_RANGE';
ALTER TYPE "AttributeDataType" ADD VALUE 'IMAGE';
ALTER TYPE "AttributeDataType" ADD VALUE 'PHONE';
ALTER TYPE "AttributeDataType" ADD VALUE 'URL';
ALTER TYPE "AttributeDataType" ADD VALUE 'EMAIL';
ALTER TYPE "AttributeDataType" ADD VALUE 'TIME';
ALTER TYPE "AttributeDataType" ADD VALUE 'TIME_RANGE';

-- AlterEnum
ALTER TYPE "MediaType" ADD VALUE 'CATEGORY_ATTRIBUTE_PHOTO';

-- AlterTable
ALTER TABLE "category_attributes" ADD COLUMN     "aspect_ratio" TEXT,
ADD COLUMN     "help_text" TEXT,
ADD COLUMN     "placeholder" TEXT,
ADD COLUMN     "ui_variant" TEXT;

-- AlterTable
ALTER TABLE "vendor_attribute_values" ADD COLUMN     "value_json" JSONB;

-- AlterTable
ALTER TABLE "vendor_profiles" ADD COLUMN     "advance_booking_percent" INTEGER,
ADD COLUMN     "cancellation_policy" TEXT,
ADD COLUMN     "events_completed_range" TEXT,
ADD COLUMN     "willing_to_travel" BOOLEAN;
