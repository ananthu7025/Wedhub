-- AlterTable: expiresAt becomes nullable (null = never expires); add invitedPhone
ALTER TABLE "vendor_invitations" ALTER COLUMN "expires_at" DROP NOT NULL;
ALTER TABLE "vendor_invitations" ADD COLUMN "invited_phone" TEXT;

-- CreateTable
CREATE TABLE "vendor_invitation_otps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invitation_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_invitation_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendor_invitation_otps_invitation_id_idx" ON "vendor_invitation_otps"("invitation_id");

-- AddForeignKey
ALTER TABLE "vendor_invitation_otps" ADD CONSTRAINT "vendor_invitation_otps_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "vendor_invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
