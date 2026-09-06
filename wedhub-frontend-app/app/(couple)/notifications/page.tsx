import type { Metadata } from "next";
import { PublicTopbar, CoupleBottomNav } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { listMyNotifications } from "@/lib/api/account";
import { NotificationsList } from "@/components/shared/NotificationsList";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  const { data: notifications } = await listMyNotifications(false, 1, 50);

  return (
    <>
      <PublicTopbar activeHref="/notifications" />
      <div className="mx-auto max-w-[640px] px-6 py-8">
        <NotificationsList initialNotifications={notifications} />
      </div>
      <PublicFooter />
      <CoupleBottomNav activeHref="/notifications" />
    </>
  );
}
