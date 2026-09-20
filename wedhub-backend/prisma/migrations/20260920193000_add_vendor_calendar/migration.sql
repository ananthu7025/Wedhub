-- CreateEnum
CREATE TYPE "VendorBookingStatus" AS ENUM ('CONFIRMED', 'TENTATIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VendorBookingShift" AS ENUM ('FULL_DAY', 'MORNING', 'EVENING');

-- CreateTable
CREATE TABLE "vendor_bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "lead_id" UUID,
    "invoice_id" UUID,
    "couple_user_id" UUID,
    "title" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_phone" TEXT,
    "client_email" TEXT,
    "event_type" TEXT NOT NULL DEFAULT 'Wedding',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "shift" "VendorBookingShift" NOT NULL DEFAULT 'FULL_DAY',
    "start_time" TEXT,
    "end_time" TEXT,
    "venue_name" TEXT,
    "venue_city" TEXT,
    "package_title" TEXT,
    "total_amount" DECIMAL(12,2),
    "advance_paid" DECIMAL(12,2),
    "status" "VendorBookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_blackout_dates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_blackout_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_calendar_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "max_bookings_per_day" INTEGER NOT NULL DEFAULT 1,
    "public_calendar_enabled" BOOLEAN NOT NULL DEFAULT true,
    "ical_token" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_calendar_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendor_bookings_vendor_id_start_date_idx" ON "vendor_bookings"("vendor_id", "start_date");

-- CreateIndex
CREATE INDEX "vendor_bookings_vendor_id_status_idx" ON "vendor_bookings"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "vendor_bookings_lead_id_idx" ON "vendor_bookings"("lead_id");

-- CreateIndex
CREATE INDEX "vendor_blackout_dates_vendor_id_start_date_idx" ON "vendor_blackout_dates"("vendor_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_calendar_settings_vendor_id_key" ON "vendor_calendar_settings"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_calendar_settings_ical_token_key" ON "vendor_calendar_settings"("ical_token");

-- AddForeignKey
ALTER TABLE "vendor_bookings" ADD CONSTRAINT "vendor_bookings_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bookings" ADD CONSTRAINT "vendor_bookings_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bookings" ADD CONSTRAINT "vendor_bookings_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "vendor_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bookings" ADD CONSTRAINT "vendor_bookings_couple_user_id_fkey" FOREIGN KEY ("couple_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_blackout_dates" ADD CONSTRAINT "vendor_blackout_dates_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_calendar_settings" ADD CONSTRAINT "vendor_calendar_settings_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
