import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminReviews } from "@/lib/api/admin";
import type { ReviewModerationStatus } from "@/lib/api/admin.types";
import { AdminReviewsBoard } from "./AdminReviewsBoard";

export const metadata: Metadata = {
  title: "Reviews",
};

const VALID_STATUSES: ReviewModerationStatus[] = ["APPROVED", "REJECTED", "FLAGGED", "HIDDEN"];

interface ReviewsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminReviewsPage({ searchParams }: ReviewsPageProps) {
  await requireAdmin();
  const { status: statusParam } = await searchParams;
  const status = VALID_STATUSES.includes(statusParam as ReviewModerationStatus) ? (statusParam as ReviewModerationStatus) : undefined;

  const { data: reviews, meta } = await listAdminReviews({ status, limit: 50 });

  return (
    <AdminShell activeHref="/admin/reviews">
      <AdminReviewsBoard initialReviews={reviews} total={meta?.total ?? reviews.length} activeStatus={status} />
    </AdminShell>
  );
}
