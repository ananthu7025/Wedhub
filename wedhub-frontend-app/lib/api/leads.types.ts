import type { LeadStatus } from "./account.types";

/**
 * Backend response shapes for the vendor-facing leads module (GET/PATCH
 * /leads, POST /leads/:id/notes, GET /leads/analytics) — verified against
 * wedhub-backend/src/modules/leads during Frontend Arch Phase 6 research.
 *
 * Note: this is a *different* module from enquiries (account.types.ts's
 * MyEnquiry/MyEnquiryLead, the couple's own tracker). Vendors manage Lead
 * rows directly; each Lead embeds its parent Enquiry FLAT (Prisma
 * `include: { enquiry: true }` — no nested `leads[]` back-reference, unlike
 * the couple-facing MyEnquiry shape), so this file defines its own
 * LeadEnquiry rather than reusing MyEnquiry.
 *
 * Prisma Decimal fields serialize as strings over JSON, not numbers.
 */

export interface LeadEnquiry {
  id: string;
  userId: string | null;
  routingMode: "SINGLE_VENDOR" | "MULTI_VENDOR";
  source: string;
  categoryId: string | null;
  cityId: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  weddingDate: string | null;
  weddingLocation: string | null;
  budget: string | null;
  guestCount: number | null;
  message: string | null;
  createdAt: string;
}

export const TERMINAL_LEAD_STATUSES: LeadStatus[] = ["WON", "LOST", "SPAM", "CLOSED"];

export const ALL_LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "RESPONDED",
  "QUALIFIED",
  "MEETING",
  "QUOTED",
  "WON",
  "LOST",
  "SPAM",
  "CLOSED",
];

// ---- GET /leads, GET /leads/:id ----
export interface VendorLead {
  id: string;
  enquiryId: string;
  vendorId: string;
  status: LeadStatus;
  contactedAt: string | null;
  respondedAt: string | null;
  isSpam: boolean;
  dedupeKey: string;
  createdAt: string;
  updatedAt: string;
  // Null on the raw DB row; the backend never sends null vs. a real
  // timestamp here directly — it sends the derived hasFullContactInfo flag
  // below instead (see lead.service.ts::redactLeadContact). Kept as an
  // optional field anyway since findLeadById/listVendorLeads do return the
  // real value on the underlying row and some call sites may pass it through.
  contactUnlockedAt?: string | null;
  // False = enquiry.contactName/contactPhone/contactEmail on this lead are
  // redacted (Free-tier vendor, not yet unlocked) — see §6c/§6d of
  // PLAN-2026-09-22-premium-feature-buildout.md. Unlock via
  // POST /leads/:id/unlock.
  hasFullContactInfo: boolean;
  enquiry: LeadEnquiry;
}

export interface LeadNote {
  id: string;
  leadId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: { id: string; email: string };
}

export interface LeadStatusHistoryEntry {
  id: string;
  leadId: string;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus;
  changedByUserId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface VendorLeadDetail extends VendorLead {
  notes: LeadNote[];
  statusHistory: LeadStatusHistoryEntry[];
  // Populated when the enquiry that created this lead also opened an inbox
  // conversation — empty for anonymous enquiries or before the couple's
  // account exists to message.
  conversations: { id: string }[];
}

// ---- PATCH /leads/:id/status ----
export interface UpdateLeadStatusBody {
  status: LeadStatus;
  reason?: string;
}

// ---- POST /leads/:id/notes ----
export interface AddLeadNoteBody {
  body: string;
}

// ---- GET /leads/analytics ----
export interface LeadAnalytics {
  leadsReceived: number;
  leadsContacted: number;
  responseRate: number;
  averageResponseTimeMs: number | null;
  qualifiedLeads: number;
  wonLeads: number;
  lostLeads: number;
  // Null for a basic-analytics-tier vendor — gated behind analytics_level,
  // same distinction as the profile-view daily breakdown elsewhere. See
  // PLAN-2026-09-22-premium-feature-buildout.md §5.
  conversionRate: number | null;
}

// ---- POST /leads/:id/unlock ----
export interface LeadUnlockCheckout {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
}

// ---- GET /leads/profile-viewers (item 17) ----
// Deliberately separate from VendorLead/Lead — a profile view is a much
// lower-intent, higher-frequency signal than a real enquiry, so it's
// surfaced as its own read-only list rather than diluting the Leads
// pipeline. Anonymous visits never appear here (no account to attribute
// the view to).
//
// `kind` distinguishes a plain profile view from a viewer who clicked
// "Reveal contact details" on the public profile (contact info is gated
// behind that button rather than shown directly) — the latter is a
// materially stronger intent signal and is labeled differently in the UI.
export interface ProfileViewer {
  userId: string;
  createdAt: string;
  kind: "VIEWED" | "REVEALED_CONTACT";
  user: { id: string; email: string; profile: { firstName: string | null; lastName: string | null } | null } | null;
}
