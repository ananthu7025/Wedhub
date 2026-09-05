-- AlterEnum
ALTER TYPE "NotificationEventType" ADD VALUE 'ACCOUNT_LINKED';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "vendor_store_transfers" ADD COLUMN     "payment_account_id" UUID,
ADD COLUMN     "razorpay_order_id" TEXT,
ADD COLUMN     "razorpay_payment_id" TEXT;

-- CreateTable
CREATE TABLE "linked_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linked_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "linked_identities_user_id_idx" ON "linked_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "linked_identities_provider_provider_account_id_key" ON "linked_identities"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_payment_accounts_razorpay_stakeholder_id_key" ON "vendor_payment_accounts"("razorpay_stakeholder_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_payment_accounts_razorpay_route_product_id_key" ON "vendor_payment_accounts"("razorpay_route_product_id");

-- CreateIndex
CREATE INDEX "vendor_payment_accounts_razorpay_stakeholder_id_idx" ON "vendor_payment_accounts"("razorpay_stakeholder_id");

-- CreateIndex
CREATE INDEX "vendor_payment_accounts_razorpay_route_product_id_idx" ON "vendor_payment_accounts"("razorpay_route_product_id");

-- CreateIndex
CREATE INDEX "vendor_store_payment_attempts_razorpay_payment_id_idx" ON "vendor_store_payment_attempts"("razorpay_payment_id");

-- CreateIndex
CREATE INDEX "vendor_store_transfers_payment_account_id_idx" ON "vendor_store_transfers"("payment_account_id");

-- CreateIndex
CREATE INDEX "vendor_store_transfers_razorpay_order_id_idx" ON "vendor_store_transfers"("razorpay_order_id");

-- CreateIndex
CREATE INDEX "vendor_store_transfers_razorpay_payment_id_idx" ON "vendor_store_transfers"("razorpay_payment_id");

-- AddForeignKey
ALTER TABLE "linked_identities" ADD CONSTRAINT "linked_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
