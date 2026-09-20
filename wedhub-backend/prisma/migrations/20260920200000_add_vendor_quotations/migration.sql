-- CreateEnum
CREATE TYPE "VendorQuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- AlterTable
ALTER TABLE "vendor_invoices" ADD COLUMN "quotation_id" UUID;

-- AlterTable
ALTER TABLE "vendor_bookings" ADD COLUMN "quotation_id" UUID;

-- CreateTable
CREATE TABLE "vendor_quotations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "lead_id" UUID,
    "quotation_number" TEXT NOT NULL,
    "view_token" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "status" "VendorQuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "issue_date" DATE NOT NULL,
    "valid_until" DATE,
    "event_type" TEXT NOT NULL DEFAULT 'Wedding',
    "event_date" DATE,
    "event_location" TEXT,
    "guest_count" INTEGER,
    "client_name" TEXT NOT NULL,
    "client_phone" TEXT,
    "client_email" TEXT,
    "client_address" TEXT,
    "vendor_business_name" TEXT NOT NULL,
    "vendor_category" TEXT,
    "vendor_phone" TEXT,
    "vendor_email" TEXT,
    "vendor_address" TEXT,
    "vendor_logo_key" TEXT,
    "vendor_gstin" TEXT,
    "brand_theme_color" TEXT DEFAULT '#E05A47',
    "introduction" TEXT,
    "payment_terms" TEXT,
    "terms" TEXT,
    "notes" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(12,2) NOT NULL,
    "amount_in_words" TEXT,
    "sent_at" TIMESTAMP(3),
    "sent_via" TEXT,
    "accepted_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "decline_reason" TEXT,
    "converted_to_invoice_id" UUID,
    "converted_to_booking_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_quotation_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quotation_id" UUID NOT NULL,
    "package_id" UUID,
    "item_order" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'Package',
    "unit_price" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "vendor_quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_quotations_view_token_key" ON "vendor_quotations"("view_token");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_quotations_vendor_id_quotation_number_key" ON "vendor_quotations"("vendor_id", "quotation_number");

-- CreateIndex
CREATE INDEX "vendor_quotations_vendor_id_status_idx" ON "vendor_quotations"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "vendor_quotations_vendor_id_issue_date_idx" ON "vendor_quotations"("vendor_id", "issue_date");

-- CreateIndex
CREATE INDEX "vendor_quotations_lead_id_idx" ON "vendor_quotations"("lead_id");

-- CreateIndex
CREATE INDEX "vendor_quotations_view_token_idx" ON "vendor_quotations"("view_token");

-- CreateIndex
CREATE INDEX "vendor_quotation_items_quotation_id_item_order_idx" ON "vendor_quotation_items"("quotation_id", "item_order");

-- AddForeignKey
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "vendor_quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bookings" ADD CONSTRAINT "vendor_bookings_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "vendor_quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_quotations" ADD CONSTRAINT "vendor_quotations_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_quotations" ADD CONSTRAINT "vendor_quotations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_quotation_items" ADD CONSTRAINT "vendor_quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "vendor_quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
