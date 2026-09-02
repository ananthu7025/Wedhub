import type { Metadata } from "next";
import { CoupleShell } from "@/components/shared/CoupleShell";
import { listMyShortlists } from "@/lib/api/shortlists";
import { ShortlistGrid } from "./ShortlistGrid";

export const metadata: Metadata = {
  title: "Your Shortlist",
};

export default async function ShortlistPage() {
  const { data: shortlists } = await listMyShortlists();
  // The default "Favorites" shortlist is the only one this phase's UI
  // surfaces (see frontenddocs/04-stage-couple-experience.md Frontend Arch
  // Phase 3) — the backend supports multiple named shortlists, deferred.
  const favorites = shortlists.find((s) => s.isDefault) ?? shortlists[0];
  const items = favorites?.items ?? [];

  return (
    <CoupleShell activeHref="/shortlist">
      <div className="mx-auto max-w-[1200px] px-10 py-7 max-[900px]:px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Your shortlist</h1>
          <p className="text-sm text-text-grey">
            {items.length} vendor{items.length === 1 ? "" : "s"} saved
          </p>
        </div>

        <ShortlistGrid items={items} />
      </div>
    </CoupleShell>
  );
}
