import { randomUUID } from "node:crypto";
import type { LeadStatus } from "@prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import { logAnalyticsEvent } from "../../common/utils/analytics.util";
import { createOrder } from "../../integrations/payment/razorpay.client";
import { canVendorAccess } from "../entitlements/entitlement.service";
import { getNumericSetting, PlatformSettingKey } from "../platform-settings";
import * as notificationService from "../notifications/notification.service";
import * as leadRepository from "./lead.repository";

// Free-tier vendors see a redacted contact name/phone/email on a lead until
// it's unlocked (contactUnlockedAt set — either because the vendor is
// Premium-eligible, in which case it's set automatically at creation, or
// because they paid to unlock this specific lead — see
// PLAN-2026-09-22-premium-feature-buildout.md §6c/§6d). This is a different
// direction from the existing couple-facing redactContactFields
// (vendor.controller.ts), which hides a VENDOR's contact info from a
// COUPLE — this hides a LEAD's contact info from the VENDOR who received it.
// Same naming convention (hasFullContactInfo) for consistency with that
// established pattern.
function redactLeadContact<T extends { contactUnlockedAt: Date | null; enquiry: { contactName: string; contactPhone: string | null; contactEmail: string } }>(
  lead: T,
): T & { hasFullContactInfo: boolean } {
  if (lead.contactUnlockedAt) {
    return { ...lead, hasFullContactInfo: true };
  }
  const [firstName, ...rest] = lead.enquiry.contactName.trim().split(/\s+/);
  const lastInitial = rest.length > 0 ? `${rest[rest.length - 1]!.charAt(0).toUpperCase()}.` : "";
  return {
    ...lead,
    enquiry: {
      ...lead.enquiry,
      contactName: lastInitial ? `${firstName} ${lastInitial}` : (firstName ?? lead.enquiry.contactName),
      contactPhone: null,
      contactEmail: "",
    },
    hasFullContactInfo: false,
  };
}

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

export async function listOwnLeads(
  vendorId: string,
  filter: { status: LeadStatus | undefined; search: string | undefined; page: number; limit: number },
) {
  const [leads, total] = await Promise.all([
    leadRepository.listVendorLeads({ vendorId, ...filter }),
    leadRepository.countVendorLeads({ vendorId, ...filter }),
  ]);
  return [leads.map(redactLeadContact), total] as const;
}

export async function getOwnLead(vendorId: string, leadId: string) {
  const lead = await getOwnedLeadOrThrow(vendorId, leadId);
  return redactLeadContact(lead);
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
  await notifyCoupleOfStatusChange(lead, nextStatus);

  // Item 4: this is the one event that can change avgResponseTimeMs —
  // recompute right after, but only when respondedAt was actually just
  // set this call (timestamps.respondedAt), not on every status change.
  if (timestamps.respondedAt) {
    await leadRepository.recalculateAvgResponseTime(vendorId);
  }

  return updated;
}

// docs/bugs.md #4 — previously no lead status transition ever notified the
// couple who submitted the enquiry; they had to manually refresh /enquiries.
// Enquiry.userId is nullable (guest enquiries have no account), so there's
// nobody to notify in that case — skip silently rather than erroring.
async function notifyCoupleOfStatusChange(
  lead: Awaited<ReturnType<typeof leadRepository.findLeadById>>,
  nextStatus: LeadStatus,
): Promise<void> {
  if (!lead?.enquiry.userId) {
    return;
  }
  await notificationService.notify({
    userId: lead.enquiry.userId,
    eventType: "LEAD_STATUS_UPDATED",
    data: { businessName: lead.vendor.businessName, status: nextStatus },
    relatedEntityType: "lead",
    relatedEntityId: lead.id,
  });
}

export async function addNote(vendorId: string, authorId: string, leadId: string, body: string) {
  await getOwnedLeadOrThrow(vendorId, leadId);
  return leadRepository.createNote(leadId, authorId, body);
}

// conversionRate is gated behind analytics_level (basic vs advanced) — the
// same distinction that already gates profile-view daily breakdowns
// elsewhere (vendor-analytics.service.ts). Every other field here (received/
// contacted/response-rate/qualified/won/lost counts) stays available to
// every vendor — baseline visibility into your own leads, not a "conversion
// analytics" feature. See PLAN-2026-09-22-premium-feature-buildout.md §5.
export async function getAnalytics(vendorId: string) {
  const [analytics, analyticsLevel] = await Promise.all([
    leadRepository.getVendorLeadAnalytics(vendorId),
    canVendorAccess(vendorId, "analytics_level"),
  ]);
  if (analyticsLevel === "basic") {
    return { ...analytics, conversionRate: null };
  }
  return analytics;
}

// Item 17: separate, lower-priority read model — see the repository
// function's own comment for why this is deliberately not a Lead.
export function listProfileViewers(vendorId: string, page: number, limit: number) {
  return leadRepository.listProfileViewers(vendorId, page, limit);
}

// Admin oversight — no ownership check, but every transition is still
// audited the same way (product.md §20: "Admin can view and intervene").
export function listAllLeadsAdmin(filter: leadRepository.AdminLeadListFilter) {
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
  await notifyCoupleOfStatusChange(lead, nextStatus);
  return updated;
}

// §6d: a Free-tier vendor paying to unlock one lead's full contact details.
// Same order-then-webhook-confirm shape as subscription checkout and the
// ₹49 wedding-website publish — no Subscription/Plan involved here, this is
// a pure one-off purchase keyed by leadId (see webhook.service.ts's
// LEAD_UNLOCK branch for where contactUnlockedAt actually gets set).
export async function initiateLeadUnlock(vendorId: string, leadId: string) {
  const lead = await getOwnedLeadOrThrow(vendorId, leadId);
  if (lead.contactUnlockedAt) {
    throw new ConflictError("This lead's contact details are already unlocked");
  }

  const amount = await getNumericSetting(PlatformSettingKey.LEAD_UNLOCK_PRICE_INR);
  const amountInSmallestUnit = Math.round(amount * 100);

  const { orderId } = await createOrder({
    amountInSmallestUnit,
    currency: "INR",
    receipt: `lu_${randomUUID().replace(/-/g, "").slice(0, 24)}`,
    notes: { vendorId, leadId },
  });

  const payment = await leadRepository.createPendingUnlockPayment({
    leadId,
    vendorId,
    razorpayOrderId: orderId,
    amount,
    currency: "INR",
  });

  await logAnalyticsEvent({
    userId: vendorId,
    eventType: "lead_unlock_checkout_started",
    vendorId,
    metadata: { leadId, amount },
  });

  return { orderId, paymentId: payment.id, amount, currency: "INR" };
}
