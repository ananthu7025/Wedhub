-- Premium feature buildout (PLAN-2026-09-22-premium-feature-buildout.md).
-- Purely additive: new enum value, new nullable columns, one new table.
-- Safe against non-empty production data — no existing Payment/Lead row is
-- affected, no backfill needed.

-- AlterEnum
ALTER TYPE "PaymentPurpose" ADD VALUE 'LEAD_UNLOCK';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "contact_unlocked_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "unlocked_lead_id" UUID;

-- CreateTable
CREATE TABLE "platform_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by_user_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "payments_unlocked_lead_id_idx" ON "payments"("unlocked_lead_id");

-- AddForeignKey
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_unlocked_lead_id_fkey" FOREIGN KEY ("unlocked_lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
