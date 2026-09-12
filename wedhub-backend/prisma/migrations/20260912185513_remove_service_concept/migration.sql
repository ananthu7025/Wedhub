-- DropForeignKey
ALTER TABLE "enquiries" DROP CONSTRAINT "enquiries_service_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_service_id_fkey";

-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_category_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_services" DROP CONSTRAINT "vendor_services_service_id_fkey";

-- DropForeignKey
ALTER TABLE "vendor_services" DROP CONSTRAINT "vendor_services_vendor_id_fkey";

-- AlterTable
ALTER TABLE "enquiries" DROP COLUMN "service_id";

-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "service_id";

-- DropTable
DROP TABLE "services";

-- DropTable
DROP TABLE "vendor_services";
