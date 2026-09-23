import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { verifySession } from "@/lib/auth/dal";
import { listMyConversations } from "@/lib/api/messaging";
import { getMyEffectivePlan, getMyRuleBook } from "@/lib/api/vendor-self";
import { InboxView } from "@/components/shared/InboxView";

export const metadata: Metadata = {
  title: "Inbox",
};

export default async function VendorInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const [vendor, session, { conversation }, { data: conversations }, { data: ruleBook }, { data: plan }] = await Promise.all([
    requireVendorOwnership(),
    verifySession(),
    searchParams,
    listMyConversations(1, 50),
    getMyRuleBook().catch(() => ({ data: null })),
    getMyEffectivePlan().catch(() => ({ data: undefined })),
  ]);

  // Hides the "Send rule book" action entirely when the plan doesn't include
  // rule_book_access, rather than showing a button that would 403 on click —
  // matches messaging.service.ts's sendMessage gate on the mediaId path.
  const hasRuleBookAccess = Boolean(plan?.features.rule_book_access);

  return (
    <VendorShell activeHref="/vendor/inbox" vendorName={vendor.businessName}>
      <h1 className="mb-5 text-2xl font-bold">Inbox</h1>
      <InboxView
        viewerRole="VENDOR"
        viewerUserId={session.userId}
        initialConversations={conversations}
        initialConversationId={conversation}
        ruleBookMediaId={hasRuleBookAccess && ruleBook?.status === "READY" ? ruleBook.id : null}
      />
    </VendorShell>
  );
}
