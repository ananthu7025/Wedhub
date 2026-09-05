-- AlterTable
ALTER TABLE "vendor_payment_accounts"
  ADD COLUMN IF NOT EXISTS "razorpay_account_status" TEXT,
  ADD COLUMN IF NOT EXISTS "linked_account_created_at" TIMESTAMP(3);
