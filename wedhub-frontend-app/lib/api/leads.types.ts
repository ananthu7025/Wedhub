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
  serviceId: string | null;
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
  conversionRate: number;
}
