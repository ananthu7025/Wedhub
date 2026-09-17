import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import { verifySession } from "@/lib/auth/dal";
import { listMyConversations } from "@/lib/api/messaging";
import { InboxView } from "@/components/shared/InboxView";

export const metadata: Metadata = {
  title: "Inbox",
};

export default async function VendorInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const [vendor, session, { conversation }, { data: conversations }] = await Promise.all([
    requireVendorOwnership(),
    verifySession(),
    searchParams,
    listMyConversations(1, 50),
  ]);

  return (
    <VendorShell activeHref="/vendor/inbox" vendorName={vendor.businessName}>
      <h1 className="mb-5 text-2xl font-bold">Inbox</h1>
      <InboxView
        viewerRole="VENDOR"
        viewerUserId={session.userId}
        initialConversations={conversations}
        initialConversationId={conversation}
      />
    </VendorShell>
  );
}
