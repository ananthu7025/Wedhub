import type { Metadata } from "next";
import { PublicTopbar, CoupleBottomNav } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { verifySession } from "@/lib/auth/dal";
import { listMyConversations } from "@/lib/api/messaging";
import { InboxView } from "@/components/shared/InboxView";

export const metadata: Metadata = {
  title: "Inbox",
};

export default async function CoupleInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const [session, { conversation }, { data: conversations }] = await Promise.all([
    verifySession(),
    searchParams,
    listMyConversations(1, 50),
  ]);

  return (
    <>
      <PublicTopbar activeHref="/inbox" />
      <div className="mx-auto max-w-[900px] px-6 py-8">
        <h1 className="mb-5 text-2xl font-bold">Inbox</h1>
        <InboxView
          viewerRole="END_USER"
          viewerUserId={session.userId}
          initialConversations={conversations}
          initialConversationId={conversation}
        />
      </div>
      <PublicFooter />
      <CoupleBottomNav activeHref="/inbox" />
    </>
  );
}
