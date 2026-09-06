import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { getMyAnalytics } from "@/lib/api/vendor-self";
import { getMe, listMyNotifications } from "@/lib/api/account";
import { listMyLeads } from "@/lib/api/leads";
import { getVendorReviews } from "@/lib/api/catalog";
import { COMPLETENESS_CHECKS } from "@/lib/api/vendor-self.types";

import { DashboardHeader } from "./components/DashboardHeader";
import { ProfileSetupCard } from "./components/ProfileSetupCard";
import { QuickActions } from "./components/QuickActions";
import { LeadsSection } from "./components/LeadsSection";
import { PerformanceOverview } from "./components/PerformanceOverview";
import { ProgressiveAnalytics } from "./components/ProgressiveAnalytics";
import { ReviewsSummary } from "./components/ReviewsSummary";
import { VendorListingCard } from "./components/VendorListingCard";
import { RecentActivityCard } from "./components/RecentActivityCard";
import { UpgradeCard } from "./components/UpgradeCard";

export const metadata: Metadata = {
  title: "Dashboard | WedHub Vendor Center",
};

/**
 * Check whether a specific completeness check item is met by current vendor data.
 */
function isChecklistItemMet(
  label: string,
  vendor: Awaited<ReturnType<typeof requireVendorOwnership>>,
): boolean {
  switch (label) {
    case "Business name":
      return vendor.businessName.length > 0;
    case "Short description":
      return !!vendor.profile?.shortDescription;
    case "Full description":
      return !!vendor.profile?.description;
    case "Primary category":
      return vendor.categories.some((c) => c.isPrimary);
    case "Primary city":
      return vendor.cityId !== null;
    case "At least one service area":
      return vendor.serviceAreas.length > 0;
    case "Pricing information":
      return vendor.profile?.startingPrice != null || vendor.profile?.customQuoteAvailable === true;
    case "At least one package":
      return vendor.packages.length > 0;
    case "At least one service":
      return vendor.services.length > 0;
    case "A contact method":
      return !!(vendor.profile?.phone || vendor.profile?.email || vendor.profile?.website);
    case "Category attribute values":
      return vendor.attributeValues.length > 0;
    default:
      return false;
  }
}

export default async function VendorDashboardPage() {
  const vendor = await requireVendorOwnership();

  const [analytics, me, leadsResponse, notificationsResponse, reviewsResponse] = await Promise.all([
    getMyAnalytics()
      .then((r) => r.data)
      .catch(() => null),
    getMe().then((r) => r.data),
    listMyLeads({ limit: 10 })
      .then((r) => r.data)
      .catch(() => []),
    listMyNotifications(false, 1, 10)
      .then((r) => r.data)
      .catch(() => []),
    getVendorReviews(vendor.id, 1, 5)
      .then((r) => r.data)
      .catch(() => []),
  ]);

  const emailUnverified = !me.emailVerifiedAt;
  const primaryCategory = vendor.categories.find((c) => c.isPrimary)?.category || vendor.categories[0]?.category;

  const checksStatus = COMPLETENESS_CHECKS.map((check) => ({
    ...check,
    met: isChecklistItemMet(check.label, vendor),
  }));

  // PRIMARY STATE DETERMINATION:
  // STATE 1: Incomplete — profile completeness < 100% OR status is not APPROVED (e.g. DRAFT, PENDING_VERIFICATION, REJECTED)
  // STATE 2: Active / Live — profile completeness === 100% AND status === "APPROVED"
  const isIncomplete = vendor.profileCompleteness < 100 || vendor.status !== "APPROVED";

  return (
    <VendorShell activeHref="/vendor/dashboard" vendorName={vendor.businessName} vendorSlug={vendor.slug}>
      <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto">
        {/* 1. Header / Greeting (Both States) */}
        <DashboardHeader
          displayName={vendor.businessName}
          categoryName={primaryCategory?.name}
          emailUnverified={emailUnverified}
          userEmail={me.email}
          vendorStatus={vendor.status}
        />

        {isIncomplete ? (
          /* ========================================================================= */
          /* STATE 1: INCOMPLETE VENDOR HIERARCHY                                      */
          /* 1. Header -> 2. Profile Setup -> 3. Quick Actions -> 4. Leads ->          */
          /* 5. Performance -> 6. Reviews -> 7. Your Listing -> 8. Activity -> 9. Pro */
          /* ========================================================================= */
          <>
            {/* 2. Profile Setup Card */}
            <ProfileSetupCard
              completeness={vendor.profileCompleteness}
              checksStatus={checksStatus}
            />

            {/* 3. Quick Actions */}
            <QuickActions
              categorySlug={primaryCategory?.slug}
              categoryName={primaryCategory?.name}
              vendorSlug={vendor.slug}
            />

            {/* 4. Leads / Enquiries */}
            <LeadsSection
              leads={leadsResponse}
              isProfileComplete={false}
            />

            {/* 5. Performance */}
            <PerformanceOverview
              analytics={analytics}
              windowDays={analytics?.windowDays ?? 30}
            />

            {/* 6. Reviews */}
            <ReviewsSummary
              reviews={reviewsResponse}
              reviewCount={analytics?.reviews ?? vendor.reviewCount}
              averageRating={vendor.averageRating}
            />

            {/* 7. Your Listing */}
            <VendorListingCard
              status={vendor.status}
              verificationLevel={vendor.verificationLevel}
              slug={vendor.slug}
              rejectionReason={vendor.rejectionReason}
            />

            {/* 8. Recent Activity */}
            <RecentActivityCard
              notifications={notificationsResponse}
              leads={leadsResponse}
            />

            {/* 9. Upgrade Card */}
            <UpgradeCard analytics={analytics} />
          </>
        ) : (
          /* ========================================================================= */
          /* STATE 2: ACTIVE / LIVE VENDOR HIERARCHY                                   */
          /* 1. Header -> 2. Leads -> 3. Performance -> 4. Progressive Analytics ->    */
          /* 5. Quick Actions -> 6. Reviews -> 7. Your Listing -> 8. Activity -> 9. Pro */
          /* ========================================================================= */
          <>
            {/* 2. Leads / New Enquiries */}
            <LeadsSection
              leads={leadsResponse}
              isProfileComplete={true}
            />

            {/* 3. Performance */}
            <PerformanceOverview
              analytics={analytics}
              windowDays={analytics?.windowDays ?? 30}
            />

            {/* 4. Progressive Analytics (Response Time & Discovery Funnel) */}
            <ProgressiveAnalytics analytics={analytics} />

            {/* 5. Quick Actions */}
            <QuickActions
              categorySlug={primaryCategory?.slug}
              categoryName={primaryCategory?.name}
              vendorSlug={vendor.slug}
            />

            {/* 6. Reviews */}
            <ReviewsSummary
              reviews={reviewsResponse}
              reviewCount={analytics?.reviews ?? vendor.reviewCount}
              averageRating={vendor.averageRating}
            />

            {/* 7. Your Listing */}
            <VendorListingCard
              status={vendor.status}
              verificationLevel={vendor.verificationLevel}
              slug={vendor.slug}
              rejectionReason={vendor.rejectionReason}
            />

            {/* 8. Recent Activity */}
            <RecentActivityCard
              notifications={notificationsResponse}
              leads={leadsResponse}
            />

            {/* 9. Upgrade Card */}
            <UpgradeCard analytics={analytics} />
          </>
        )}
      </div>
    </VendorShell>
  );
}
