import type { LeadStatus } from "@prisma/client";
import { NotFoundError, ValidationError } from "../../common/errors";
import { logAnalyticsEvent } from "../../common/utils/analytics.util";
import * as leadRepository from "./lead.repository";

const TERMINAL_STATUSES: LeadStatus[] = ["WON", "LOST", "SPAM", "CLOSED"];

// product.md §20 lists the lifecycle as a suggested progression, not a
// strict finite-state machine — a vendor might jump straight from NEW to
// LOST or SPAM without ever marking CONTACTED. The only rule enforced here
// is a firm one both docs imply: once a lead reaches a terminal status, it
// cannot silently flip back to an active one — that requires deliberate
// admin intervention (product.md §20: "Admin can view and intervene"),
// which the admin routes below allow without this guard.
function assertNotLeavingTerminalStatus(current: LeadStatus, next: LeadStatus): void {
  if (TERMINAL_STATUSES.includes(current) && current !== next) {
    throw new ValidationError(
      `Lead is already ${current}, a terminal status. Use the admin endpoint to reopen it if this was a mistake.`,
    );
  }
}

async function getOwnedLeadOrThrow(vendorId: string, leadId: string) {
  const lead = await leadRepository.findLeadById(leadId);
  if (!lead || lead.vendorId !== vendorId) {
    throw new NotFoundError("Lead not found");
  }
  return lead;
}

export function listOwnLeads(
  vendorId: string,
  filter: { status: LeadStatus | undefined; search: string | undefined; page: number; limit: number },
) {
  return Promise.all([
    leadRepository.listVendorLeads({ vendorId, ...filter }),
    leadRepository.countVendorLeads({ vendorId, ...filter }),
  ]);
}

export async function getOwnLead(vendorId: string, leadId: string) {
  return getOwnedLeadOrThrow(vendorId, leadId);
}

export async function updateStatus(
  vendorId: string,
  changedByUserId: string,
  leadId: string,
  nextStatus: LeadStatus,
  reason: string | undefined,
) {
  const lead = await getOwnedLeadOrThrow(vendorId, leadId);
  assertNotLeavingTerminalStatus(lead.status, nextStatus);

  const timestamps: { contactedAt?: Date; respondedAt?: Date } = {};
  if (nextStatus === "CONTACTED" && !lead.contactedAt) {
    timestamps.contactedAt = new Date();
  }
  if (nextStatus === "RESPONDED" && !lead.respondedAt) {
    timestamps.respondedAt = new Date();
  }

  const updated = await leadRepository.updateLeadStatus(leadId, nextStatus, timestamps);
  await leadRepository.createStatusHistory({
    leadId,
    fromStatus: lead.status,
    toStatus: nextStatus,
    changedByUserId,
    reason,
  });
  await logAnalyticsEvent({
    userId: changedByUserId,
    eventType: "lead_status_changed",
    vendorId,
    metadata: { leadId, fromStatus: lead.status, toStatus: nextStatus },
  });

  return updated;
}

export async function addNote(vendorId: string, authorId: string, leadId: string, body: string) {
  await getOwnedLeadOrThrow(vendorId, leadId);
  return leadRepository.createNote(leadId, authorId, body);
}

export function getAnalytics(vendorId: string) {
  return leadRepository.getVendorLeadAnalytics(vendorId);
}

// Admin oversight — no ownership check, but every transition is still
// audited the same way (product.md §20: "Admin can view and intervene").
export function listAllLeadsAdmin(filter: { status: LeadStatus | undefined; page: number; limit: number }) {
  return Promise.all([leadRepository.findAllLeadsAdmin(filter), leadRepository.countAllLeadsAdmin(filter)]);
}

export async function getLeadAdmin(leadId: string) {
  const lead = await leadRepository.findLeadById(leadId);
  if (!lead) {
    throw new NotFoundError("Lead not found");
  }
  return lead;
}

export async function updateStatusAdmin(
  adminUserId: string,
  leadId: string,
  nextStatus: LeadStatus,
  reason: string | undefined,
) {
  const lead = await leadRepository.findLeadById(leadId);
  if (!lead) {
    throw new NotFoundError("Lead not found");
  }

  const updated = await leadRepository.updateLeadStatus(leadId, nextStatus, {});
  await leadRepository.createStatusHistory({
    leadId,
    fromStatus: lead.status,
    toStatus: nextStatus,
    changedByUserId: adminUserId,
    reason,
  });
  return updated;
}
