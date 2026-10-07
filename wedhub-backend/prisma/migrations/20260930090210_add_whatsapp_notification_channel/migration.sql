-- AlterEnum
ALTER TYPE "NotificationChannel" ADD VALUE 'WHATSAPP';

-- CreateEnum
CREATE TYPE "WhatsAppDirectSendStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "whatsapp_direct_sends" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "to" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "status" "WhatsAppDirectSendStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_direct_sends_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_direct_sends_to_idx" ON "whatsapp_direct_sends"("to");

-- CreateIndex
CREATE INDEX "whatsapp_direct_sends_status_idx" ON "whatsapp_direct_sends"("status");
