/**
 * Backend response shapes for shortlists/enquiries/comparison — verified
 * field-by-field against wedhub-backend source (shortlist.repository.ts,
 * shortlist.schema.ts, enquiry.schema.ts, comparison.service.ts) during
 * Frontend Arch Phase 3 research, not assumed.
 *
 * Prisma Decimal fields serialize as strings over JSON, not numbers —
 * modeled as `string` here deliberately; convert with Number()/parseFloat
 * before doing arithmetic.
 */

// ---- GET /shortlists ----
export interface ShortlistVendorSummary {
  id: string;
  businessName: string;
  slug: string;
  status: string;
  verificationLevel: string;
  profile: {
    shortDescription: string | null;
    startingPrice: string | null;
    currency: string | null;
  } | null;
}

export interface ShortlistItem {
  shortlistId: string;
  vendorId: string;
  note: string | null;
  createdAt: string;
  vendor: ShortlistVendorSummary;
}

export interface Shortlist {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  shareToken: string | null;
  shareEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  items: ShortlistItem[];
}

// ---- POST /enquiries/single-vendor ----
export type PreferredContactMethod = "EMAIL" | "PHONE" | "WHATSAPP";

export interface CreateSingleVendorEnquiryBody {
  vendorId: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  preferredContactMethod?: PreferredContactMethod;
  weddingDate?: string;
  weddingLocation?: string;
  serviceId?: string;
  budget?: number;
  guestCount?: number;
  message?: string;
}

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "RESPONDED"
  | "QUALIFIED"
  | "MEETING"
  | "QUOTED"
  | "WON"
  | "LOST"
  | "SPAM"
  | "CLOSED";

export interface Lead {
  id: string;
  enquiryId: string;
  vendorId: string;
  status: LeadStatus;
  dedupeKey: string;
  isSpam: boolean;
  contactedAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Enquiry {
  id: string;
  userId: string | null;
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

export interface CreateEnquiryResult {
  enquiry: Enquiry;
  leads: Lead[];
}

// ---- GET /comparison/vendors ----
export interface ComparisonAttribute {
  id: string;
  key: string;
  label: string;
  dataType: "BOOLEAN" | "NUMBER" | "TEXT" | "SELECT" | "MULTI_SELECT";
}

export interface ComparisonVendor {
  id: string;
  businessName: string;
  slug: string;
  verificationLevel: string;
  city: string | null;
  // Prisma Decimal fields serialize as strings over JSON, not numbers —
  // confirmed against the real GET /comparison/vendors response (see
  // frontenddocs/04-stage-couple-experience.md Frontend Arch Phase 3),
  // matching the pattern documented in vendors.types.ts's header comment.
  startingPrice: string | null;
  priceRangeMin: string | null;
  priceRangeMax: string | null;
  currency: string | null;
  yearsExperience: number | null;
  attributeValues: Record<string, string | number | boolean | string[] | null>;
}

export interface ComparisonResult {
  category: { id: string; name: string; slug: string } | null;
  attributes: ComparisonAttribute[];
  vendors: ComparisonVendor[];
}
