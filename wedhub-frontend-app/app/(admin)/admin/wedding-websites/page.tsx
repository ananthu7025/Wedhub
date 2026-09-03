import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { Badge } from "@/components/ui/Badge";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAdminWeddingWebsites } from "@/lib/api/admin";
import type { AdminWeddingWebsite } from "@/lib/api/admin.types";

export const metadata: Metadata = {
  title: "Wedding Websites",
};

const TEMPLATE_LABEL: Record<AdminWeddingWebsite["template"], string> = {
  ROYAL_WEDDING: "Royal Wedding",
  MINIMAL_ELEGANT: "Minimal Elegant",
  TRADITIONAL_INDIAN: "Traditional Indian",
};

function ownerLabel(website: AdminWeddingWebsite): string {
  if (website.ownerUser) return website.ownerUser.email;
  if (website.ownerTelegramUser) {
    const name = [website.ownerTelegramUser.firstName, website.ownerTelegramUser.lastName].filter(Boolean).join(" ");
    return name || website.ownerTelegramUser.username || "Telegram user";
  }
  return "—";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Read-only visibility only, per the feature spec's explicit "do not
 * build a large admin system for this feature" instruction — no edit/
 * delete/moderate actions, just the count/owner/template/payment-status/
 * website-status/dates the spec asks for. Backend: GET /admin/wedding-
 * websites (see docs/12-stage-wedding-website.md).
 */
export default async function AdminWeddingWebsitesPage() {
  await requireAdmin();
  const { data: websites, meta } = await listAdminWeddingWebsites(1, 50);

  return (
    <AdminShell activeHref="/admin/wedding-websites">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Wedding Websites</h1>
        <p className="text-sm text-text-grey">
          {meta?.total ?? websites.length} wedding website{(meta?.total ?? websites.length) === 1 ? "" : "s"} created — the ₹49 Instant
          Wedding Website product. Read-only visibility.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-input text-xs font-bold text-text-grey uppercase">
            <tr>
              <th className="px-4 py-3">Couple</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Published</th>
            </tr>
          </thead>
          <tbody>
            {websites.map((website) => {
              const latestPayment = website.payments[0] ?? null;
              return (
                <tr key={website.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-text-dark">
                    {website.brideName} &amp; {website.groomName}
                    {website.slug && <div className="text-xs font-normal text-text-grey">/{website.slug}</div>}
                  </td>
                  <td className="px-4 py-3 text-text-grey">{ownerLabel(website)}</td>
                  <td className="px-4 py-3 text-text-grey">{TEMPLATE_LABEL[website.template]}</td>
                  <td className="px-4 py-3">
                    <Badge variant={website.status === "PUBLISHED" ? "green" : "grey"}>{website.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {latestPayment ? (
                      <Badge variant={latestPayment.status === "CAPTURED" ? "green" : latestPayment.status === "FAILED" ? "red" : "amber"}>
                        {latestPayment.status}
                      </Badge>
                    ) : (
                      <span className="text-text-grey">No payment</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-grey">{formatDate(website.createdAt)}</td>
                  <td className="px-4 py-3 text-text-grey">{formatDate(website.publishedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {websites.length === 0 && <p className="p-6 text-center text-sm text-text-grey">No wedding websites created yet.</p>}
      </div>
    </AdminShell>
  );
}
