-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "pending_coupon_id" UUID,
ADD COLUMN     "pending_plan_id" UUID,
ADD COLUMN     "pending_vendor_id" UUID,
ALTER COLUMN "subscription_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "payments_pending_vendor_id_idx" ON "payments"("pending_vendor_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_pending_vendor_id_fkey" FOREIGN KEY ("pending_vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_pending_plan_id_fkey" FOREIGN KEY ("pending_plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_pending_coupon_id_fkey" FOREIGN KEY ("pending_coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
