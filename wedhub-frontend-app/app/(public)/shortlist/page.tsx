import type { Metadata } from "next";
import { PublicTopbar, CoupleBottomNav } from "@/components/shared/PublicTopbar";
import { PublicFooter } from "@/components/shared/PublicFooter";
import { listMyShortlists } from "@/lib/api/shortlists";
import { getOptionalSession } from "@/lib/auth/dal";
import { ShortlistGrid } from "./ShortlistGrid";
import { GuestShortlistView } from "./GuestShortlistView";

export const metadata: Metadata = {
  title: "Your Shortlist",
  // Item: /shortlist moved out of app/(couple) so a signed-out visitor can
  // save and view vendors without a login redirect ("I only wanted to
  // remember this photographer"). It's session-driven/personalized either
  // way (a real account's saved vendors, or a guest's own browser-local
  // ones), not evergreen content — explicit noindex here replaces what the
  // (couple) layout used to set automatically. app/robots.ts's "/shortlist"
  // crawl-directive disallow still applies too.
  robots: { index: false, follow: false },
};

export default async function ShortlistPage() {
  const session = await getOptionalSession();

  if (!session) {
    return (
      <>
        <PublicTopbar activeHref="/shortlist" />
        <div className="mx-auto max-w-[1200px] px-10 py-7 max-[900px]:px-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Your shortlist</h1>
            <p className="text-sm text-text-grey">Saved on this device — log in anytime to keep it in your account.</p>
          </div>
          <GuestShortlistView />
        </div>
        <PublicFooter />
        <CoupleBottomNav activeHref="/shortlist" />
      </>
    );
  }

  const { data: shortlists } = await listMyShortlists();
  // The default "Favorites" shortlist is the only one this phase's UI
  // surfaces (see frontenddocs/04-stage-couple-experience.md Frontend Arch
  // Phase 3) — the backend supports multiple named shortlists, deferred.
  const favorites = shortlists.find((s) => s.isDefault) ?? shortlists[0];
  const items = favorites?.items ?? [];

  return (
    <>
      <PublicTopbar activeHref="/shortlist" />
      <div className="mx-auto max-w-[1200px] px-10 py-7 max-[900px]:px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Your shortlist</h1>
          <p className="text-sm text-text-grey">
            {items.length} vendor{items.length === 1 ? "" : "s"} saved
          </p>
        </div>

        <ShortlistGrid items={items} />
      </div>
      <PublicFooter />
      <CoupleBottomNav activeHref="/shortlist" />
    </>
  );
}
