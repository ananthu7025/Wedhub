-- CreateEnum
CREATE TYPE "StorePaymentStatus" AS ENUM ('CREATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VendorPaymentAccountStatus" AS ENUM ('NOT_CONNECTED', 'ONBOARDING', 'PENDING_VERIFICATION', 'ACTIVE', 'RESTRICTED', 'DISABLED');

-- CreateTable
CREATE TABLE "vendor_payment_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "razorpay_account_id" TEXT,
    "status" "VendorPaymentAccountStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "legal_business_name" TEXT,
    "business_type" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "bank_name" TEXT,
    "account_number_masked" TEXT,
    "ifsc_code" TEXT,
    "charges_enabled" BOOLEAN NOT NULL DEFAULT false,
    "payouts_enabled" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_url" TEXT,
    "onboarding_url_expires_at" TIMESTAMP(3),
    "kyc_details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_payment_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_payment_accounts_vendor_id_key" ON "vendor_payment_accounts"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_payment_accounts_razorpay_account_id_key" ON "vendor_payment_accounts"("razorpay_account_id");

-- CreateIndex
CREATE INDEX "vendor_payment_accounts_status_idx" ON "vendor_payment_accounts"("status");

-- AlterTable vendor_store_orders
ALTER TABLE "vendor_store_orders" 
    ADD COLUMN "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN "gst_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR',
    ADD COLUMN "payment_provider" TEXT NOT NULL DEFAULT 'razorpay',
    ADD COLUMN "razorpay_order_id" TEXT,
    ADD COLUMN "razorpay_payment_id" TEXT,
    ADD COLUMN "vendor_payment_account_id" UUID,
    ADD COLUMN "platform_commission" DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN "gateway_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN "vendor_settlement_amount" DECIMAL(10,2),
    ADD COLUMN "paid_at" TIMESTAMP(3);

-- Convert payment_status column to StorePaymentStatus
ALTER TABLE "vendor_store_orders" ALTER COLUMN "payment_status" DROP DEFAULT;
ALTER TABLE "vendor_store_orders" ALTER COLUMN "payment_status" TYPE "StorePaymentStatus" USING ("payment_status"::text::"StorePaymentStatus");
ALTER TABLE "vendor_store_orders" ALTER COLUMN "payment_status" SET DEFAULT 'PENDING';

-- CreateIndexes on vendor_store_orders
CREATE UNIQUE INDEX "vendor_store_orders_razorpay_order_id_key" ON "vendor_store_orders"("razorpay_order_id");
CREATE UNIQUE INDEX "vendor_store_orders_razorpay_payment_id_key" ON "vendor_store_orders"("razorpay_payment_id");
CREATE INDEX "vendor_store_orders_payment_status_idx" ON "vendor_store_orders"("payment_status");

-- CreateTable
CREATE TABLE "vendor_store_order_refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "razorpay_refund_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_store_order_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_store_order_refunds_razorpay_refund_id_key" ON "vendor_store_order_refunds"("razorpay_refund_id");
CREATE INDEX "vendor_store_order_refunds_order_id_idx" ON "vendor_store_order_refunds"("order_id");

-- AddForeignKey
ALTER TABLE "vendor_payment_accounts" ADD CONSTRAINT "vendor_payment_accounts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_store_orders" ADD CONSTRAINT "vendor_store_orders_vendor_payment_account_id_fkey" FOREIGN KEY ("vendor_payment_account_id") REFERENCES "vendor_payment_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_store_order_refunds" ADD CONSTRAINT "vendor_store_order_refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "vendor_store_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
