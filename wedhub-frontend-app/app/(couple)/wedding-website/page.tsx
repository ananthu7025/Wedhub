import type { Metadata } from "next";
import { CoupleShell } from "@/components/shared/CoupleShell";
import { WeddingWebsiteWizard } from "@/components/wedding-website/WeddingWebsiteWizard";
import { listMyWeddingWebsites, listWeddingWebsiteTemplates } from "@/lib/api/wedding-website";

export const metadata: Metadata = {
  title: "Wedding Website",
};

/**
 * Only END_USERs (couples) get the ₹49 Instant Wedding Website creation
 * flow from the web app — confirmed with the user 2026-09-03, superseding
 * the feature spec's own "vendor dashboard" entry point suggestion.
 * Telegram remains the other real entry point (backend flow not yet
 * wired). A couple can only have one active draft at a time in this UI —
 * the backend itself supports multiple, but the wizard always resumes
 * the most recent one rather than offering a picker, matching the
 * feature's "quick, simple, ₹49" framing.
 */
export default async function WeddingWebsitePage() {
  const [{ data: drafts }, { data: templates }] = await Promise.all([listMyWeddingWebsites(), listWeddingWebsiteTemplates()]);
  const mostRecent = drafts[0] ?? null;

  return (
    <CoupleShell activeHref="/wedding-website">
      <div className="mx-auto max-w-[900px] px-10 py-7 max-[900px]:px-4">
        <WeddingWebsiteWizard initialDraft={mostRecent} templates={templates} dashboardHref="/wedding-website" />
      </div>
    </CoupleShell>
  );
}
