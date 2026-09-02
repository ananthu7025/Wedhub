/**
 * Backend response shapes for the couple-account surface (enquiries/mine,
 * reviews/mine, review-media, notifications, users/me) — verified
 * field-by-field against wedhub-backend source during Frontend Arch Phase 4
 * research and the backend additions it required (see
 * frontenddocs/10-risks-and-open-questions.md Open Question 11 and
 * ../docs/11-progress-log.md's 2026-09-02 addendum).
 *
 * Prisma Decimal fields serialize as strings over JSON, not numbers.
 */

// ---- GET /enquiries/mine ----
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

export interface MyEnquiryLead {
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
  vendor: { id: string; businessName: string; slug: string };
}

export interface MyEnquiry {
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
  leads: MyEnquiryLead[];
}

// ---- GET /reviews/mine, POST /reviews, GET /vendors/:id/reviews ----
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "FLAGGED" | "HIDDEN";
export type MediaStatus = "PENDING" | "UPLOADING" | "PROCESSING" | "READY" | "INACTIVE" | "FAILED" | "DELETED";

export interface ReviewPhoto {
  id: string;
  originalObjectKey: string;
  optimizedObjectKey: string | null;
  thumbnailObjectKey: string | null;
  status: MediaStatus;
  width: number | null;
  height: number | null;
}

export interface MyReview {
  id: string;
  userId: string;
  vendorId: string;
  serviceId: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  eventDate: string | null;
  verifiedInteraction: boolean;
  status: ReviewStatus;
  vendorResponse: string | null;
  vendorRespondedAt: string | null;
  createdAt: string;
  vendor: { id: string; businessName: string; slug: string };
  photos: ReviewPhoto[];
}

export interface CreateReviewBody {
  vendorId: string;
  serviceId?: string;
  rating: number;
  title?: string;
  content?: string;
  eventDate?: string;
  mediaIds?: string[];
}

// ---- POST /review-media/upload-requests, /:id/confirm ----
export interface ReviewMediaUploadRequest {
  mediaId: string;
  uploadUrl: string;
  objectKey: string;
}

// ---- GET /notifications/me ----
export type NotificationEventType =
  | "REGISTRATION"
  | "VERIFICATION"
  | "PASSWORD_RESET"
  | "VENDOR_APPROVED"
  | "VENDOR_REJECTED"
  | "NEW_LEAD"
  | "LEAD_REMINDER"
  | "USER_REPLIED"
  | "LEAD_FOLLOW_UP"
  | "HIGH_INTENT_LEAD"
  | "NEW_MESSAGE"
  | "REVIEW_RECEIVED"
  | "SUBSCRIPTION_ACTIVATED"
  | "PAYMENT_FAILED"
  | "SUBSCRIPTION_EXPIRING"
  | "FEATURED_CAMPAIGN_STARTED"
  | "FEATURED_CAMPAIGN_ENDING";

export interface NotificationItem {
  id: string;
  userId: string;
  eventType: NotificationEventType;
  channel: "IN_APP" | "EMAIL" | "TELEGRAM";
  status: "PENDING" | "SENT" | "FAILED" | "READ";
  title: string;
  body: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  readAt: string | null;
  createdAt: string;
}

// ---- GET /users/me, PATCH /users/me, PUT /users/me/wedding-profile ----
export interface UserProfileData {
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  preferences: {
    notifications: {
      emailMarketing: boolean;
      emailTransactional: boolean;
      smsEnabled: boolean;
    };
    preferredCategories: string[];
  } | null;
}

export interface WeddingProfileData {
  weddingDate: string | null;
  guestCount: number | null;
  estimatedBudget: string | null;
  weddingStyle: string | null;
  partnerName: string | null;
  notes: string | null;
}

export interface MeResponse {
  id: string;
  email: string;
  phone: string | null;
  role: "END_USER" | "VENDOR" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  emailVerifiedAt: string | null;
  profile: UserProfileData | null;
  weddingProfile: WeddingProfileData | null;
}

export interface UpsertWeddingProfileBody {
  weddingDate?: string;
  guestCount?: number;
  estimatedBudget?: number;
  weddingStyle?: string;
  partnerName?: string;
  notes?: string;
}
