-- Recovered 2026-09-16: this migration's original migration.sql file was
-- lost (never committed to git — same failure mode as the lost docs file
-- noted in PENDING-WORK.md §6). The migration itself DID apply successfully
-- to the database (confirmed via _prisma_migrations: finished_at is set,
-- applied_steps_count = 1) and every table/column/enum below was confirmed
-- to already exist live via direct database introspection before this file
-- was reconstructed — nothing here is being newly applied, this file only
-- restores the missing historical record to match what is already live.

-- CreateEnum
CREATE TYPE "StudioLeadSource" AS ENUM ('ENQUIRY', 'REFERRAL', 'WALK_IN', 'SOCIAL_MEDIA', 'REPEAT_CLIENT', 'OTHER');

-- CreateEnum
CREATE TYPE "StudioEventType" AS ENUM ('WEDDING', 'ENGAGEMENT', 'PRE_WEDDING', 'SAVE_THE_DATE', 'RECEPTION', 'HALDI', 'MEHNDI', 'COUPLE_SHOOT', 'BIRTHDAY', 'CORPORATE_EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "StudioProjectStatus" AS ENUM ('ENQUIRY', 'CONFIRMED', 'SHOOT_SCHEDULED', 'SHOOT_COMPLETED', 'EDITING', 'CLIENT_SELECTION', 'ALBUM_DESIGNING', 'READY_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectShootStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "has_studio_module_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "studio_clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "client_name" TEXT NOT NULL,
    "partner_name" TEXT,
    "phone" TEXT NOT NULL,
    "whatsapp_number" TEXT,
    "email" TEXT,
    "wedding_date" DATE,
    "location" TEXT,
    "notes" TEXT,
    "source" "StudioLeadSource" NOT NULL DEFAULT 'OTHER',
    "source_enquiry_id" UUID,
    "source_lead_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "event_type" "StudioEventType" NOT NULL,
    "event_date" DATE,
    "shoot_date" DATE,
    "location" TEXT,
    "assigned_to" TEXT,
    "notes" TEXT,
    "max_client_selections" INTEGER NOT NULL DEFAULT 0,
    "status" "StudioProjectStatus" NOT NULL DEFAULT 'ENQUIRY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_shoots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TEXT,
    "end_time" TEXT,
    "location" TEXT,
    "team_members" TEXT,
    "notes" TEXT,
    "status" "ProjectShootStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_shoots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "is_client_visible" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_has_studio_module_enabled_idx" ON "categories"("has_studio_module_enabled");

-- CreateIndex
CREATE INDEX "studio_clients_vendor_id_created_at_idx" ON "studio_clients"("vendor_id", "created_at");

-- CreateIndex
CREATE INDEX "studio_clients_vendor_id_phone_idx" ON "studio_clients"("vendor_id", "phone");

-- CreateIndex
CREATE INDEX "studio_projects_vendor_id_client_id_idx" ON "studio_projects"("vendor_id", "client_id");

-- CreateIndex
CREATE INDEX "studio_projects_vendor_id_shoot_date_idx" ON "studio_projects"("vendor_id", "shoot_date");

-- CreateIndex
CREATE INDEX "studio_projects_vendor_id_status_idx" ON "studio_projects"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "project_shoots_date_idx" ON "project_shoots"("date");

-- CreateIndex
CREATE INDEX "project_shoots_project_id_idx" ON "project_shoots"("project_id");

-- CreateIndex
CREATE INDEX "project_notes_project_id_idx" ON "project_notes"("project_id");

-- AddForeignKey
ALTER TABLE "studio_clients" ADD CONSTRAINT "studio_clients_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_clients" ADD CONSTRAINT "studio_clients_source_enquiry_id_fkey" FOREIGN KEY ("source_enquiry_id") REFERENCES "enquiries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_clients" ADD CONSTRAINT "studio_clients_source_lead_id_fkey" FOREIGN KEY ("source_lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_projects" ADD CONSTRAINT "studio_projects_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_projects" ADD CONSTRAINT "studio_projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "studio_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_shoots" ADD CONSTRAINT "project_shoots_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
