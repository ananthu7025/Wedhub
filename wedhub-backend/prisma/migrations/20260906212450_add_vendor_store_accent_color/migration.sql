-- CreateEnum
CREATE TYPE "StoreAccentColor" AS ENUM ('CRIMSON', 'EMERALD', 'NAVY', 'AMBER', 'PLUM', 'SLATE');

-- AlterTable
ALTER TABLE "vendor_stores" ADD COLUMN     "accent_color" "StoreAccentColor" NOT NULL DEFAULT 'CRIMSON';
