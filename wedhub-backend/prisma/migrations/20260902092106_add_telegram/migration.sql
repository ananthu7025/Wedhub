-- CreateEnum
CREATE TYPE "TelegramConversationState" AS ENUM ('START', 'SELECTING_CATEGORY', 'SELECTING_LOCATION', 'COLLECTING_DATE', 'COLLECTING_BUDGET', 'COLLECTING_GUEST_COUNT', 'COLLECTING_CONTACT', 'MATCHING_VENDORS', 'SELECTING_VENDOR', 'CONFIRMING_ENQUIRY', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TelegramMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateTable
CREATE TABLE "telegram_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "telegram_user_id" BIGINT NOT NULL,
    "user_id" UUID,
    "chat_id" BIGINT NOT NULL,
    "username" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "language_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "telegram_user_id" UUID NOT NULL,
    "state" "TelegramConversationState" NOT NULL DEFAULT 'START',
    "collected_data" JSONB NOT NULL DEFAULT '{}',
    "enquiry_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "telegram_user_id" UUID NOT NULL,
    "conversation_id" UUID,
    "direction" "TelegramMessageDirection" NOT NULL,
    "telegram_message_id" BIGINT,
    "text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_processed_updates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "update_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_processed_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_users_telegram_user_id_key" ON "telegram_users"("telegram_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_users_user_id_key" ON "telegram_users"("user_id");

-- CreateIndex
CREATE INDEX "telegram_users_user_id_idx" ON "telegram_users"("user_id");

-- CreateIndex
CREATE INDEX "telegram_conversations_telegram_user_id_idx" ON "telegram_conversations"("telegram_user_id");

-- CreateIndex
CREATE INDEX "telegram_messages_telegram_user_id_idx" ON "telegram_messages"("telegram_user_id");

-- CreateIndex
CREATE INDEX "telegram_messages_conversation_id_idx" ON "telegram_messages"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_processed_updates_update_id_key" ON "telegram_processed_updates"("update_id");

-- AddForeignKey
ALTER TABLE "telegram_users" ADD CONSTRAINT "telegram_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_conversations" ADD CONSTRAINT "telegram_conversations_telegram_user_id_fkey" FOREIGN KEY ("telegram_user_id") REFERENCES "telegram_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_conversations" ADD CONSTRAINT "telegram_conversations_enquiry_id_fkey" FOREIGN KEY ("enquiry_id") REFERENCES "enquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_messages" ADD CONSTRAINT "telegram_messages_telegram_user_id_fkey" FOREIGN KEY ("telegram_user_id") REFERENCES "telegram_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_messages" ADD CONSTRAINT "telegram_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "telegram_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
