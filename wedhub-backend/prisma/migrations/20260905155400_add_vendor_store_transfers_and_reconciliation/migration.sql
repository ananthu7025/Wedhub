-- CreateEnum
CREATE TYPE "StoreTransferStatus" AS ENUM ('CREATED', 'PENDING', 'PROCESSED', 'FAILED', 'REVERSED', 'PARTIALLY_REVERSED');

-- AlterTable vendor_store_orders
ALTER TABLE "vendor_store_orders" 
    ADD COLUMN "estimated_gateway_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN "actual_gateway_fee" DECIMAL(10,2);

-- CreateTable vendor_store_transfers
CREATE TABLE "vendor_store_transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "provider_transfer_id" TEXT,
    "recipient_account_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "StoreTransferStatus" NOT NULL DEFAULT 'CREATED',
    "failure_code" TEXT,
    "failure_reason" TEXT,
    "processed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "reversed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_store_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendor_store_transfers_provider_transfer_id_key" ON "vendor_store_transfers"("provider_transfer_id");
CREATE INDEX "vendor_store_transfers_order_id_idx" ON "vendor_store_transfers"("order_id");
CREATE INDEX "vendor_store_transfers_vendor_id_idx" ON "vendor_store_transfers"("vendor_id");
CREATE INDEX "vendor_store_transfers_status_idx" ON "vendor_store_transfers"("status");

-- AddForeignKey
ALTER TABLE "vendor_store_transfers" ADD CONSTRAINT "vendor_store_transfers_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "vendor_store_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_store_transfers" ADD CONSTRAINT "vendor_store_transfers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
