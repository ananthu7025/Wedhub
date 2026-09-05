-- AlterTable
ALTER TABLE "vendor_payment_accounts"
  ADD COLUMN IF NOT EXISTS "razorpay_stakeholder_id" TEXT,
  ADD COLUMN IF NOT EXISTS "razorpay_route_product_id" TEXT,
  ADD COLUMN IF NOT EXISTS "bank_verification_status" TEXT NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS "bank_verification_failure_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "route_activation_status" TEXT,
  ADD COLUMN IF NOT EXISTS "route_requirements" JSONB,
  ADD COLUMN IF NOT EXISTS "transfer_eligible_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_provider_sync_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "vendor_store_payment_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "razorpay_order_id" TEXT,
    "razorpay_payment_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "StorePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "failure_code" TEXT,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorized_at" TIMESTAMP(3),
    "captured_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),

    CONSTRAINT "vendor_store_payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "vendor_store_settlements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "order_id" UUID,
    "provider_settlement_id" TEXT NOT NULL,
    "recipient_account_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "fees" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "utr" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "processed_at" TIMESTAMP(3),
    "reconciled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_store_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "vendor_store_payment_attempts_razorpay_payment_id_key" ON "vendor_store_payment_attempts"("razorpay_payment_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vendor_store_payment_attempts_order_id_idx" ON "vendor_store_payment_attempts"("order_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vendor_store_payment_attempts_razorpay_order_id_idx" ON "vendor_store_payment_attempts"("razorpay_order_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vendor_store_payment_attempts_status_idx" ON "vendor_store_payment_attempts"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "vendor_store_settlements_provider_settlement_id_key" ON "vendor_store_settlements"("provider_settlement_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vendor_store_settlements_vendor_id_idx" ON "vendor_store_settlements"("vendor_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vendor_store_settlements_order_id_idx" ON "vendor_store_settlements"("order_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vendor_store_settlements_utr_idx" ON "vendor_store_settlements"("utr");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vendor_store_settlements_status_idx" ON "vendor_store_settlements"("status");

-- AddForeignKey
ALTER TABLE "vendor_store_payment_attempts" ADD CONSTRAINT "vendor_store_payment_attempts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "vendor_store_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_store_settlements" ADD CONSTRAINT "vendor_store_settlements_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_store_settlements" ADD CONSTRAINT "vendor_store_settlements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "vendor_store_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
