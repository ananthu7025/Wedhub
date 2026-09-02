import type { Metadata } from "next";
import { AdminShell } from "@/components/shared/AdminShell";
import { requireAdmin } from "@/lib/auth/require-admin";

export const metadata: Metadata = {
  title: "CMS",
};

/**
 * CMS (Frontend Arch Phase 10), matching wedhub-frontend/admin/cms.html —
 * built as the placeholder it already is. Real CMS/SEO content management
 * is backend Arch Phase 17 scope, not started; this page exists only so
 * the admin nav structure stays complete.
 */

const STUB_ITEMS = ["Pages", "Blog", "Guides", "FAQs", "Banners", "Homepage"];

export default async function AdminCmsPage() {
  await requireAdmin();

  return (
    <AdminShell activeHref="/admin/cms">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">CMS</h1>
        <p className="text-sm text-text-grey">Pages, blog, guides, FAQs, banners & homepage content.</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-input text-text-grey">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 9h18" />
          </svg>
        </div>
        <h3 className="text-[17px] font-bold">Coming in a future phase</h3>
        <p className="mt-2 max-w-[460px] text-[13px] leading-relaxed text-text-grey">
          CMS &amp; SEO content management (pages, blog posts, guides, FAQs, promotional banners, homepage curation)
          hasn&apos;t been built yet on the backend. This section is a placeholder so the admin nav structure stays
          complete.
        </p>
        <div className="mt-6 grid max-w-[560px] grid-cols-3 gap-3">
          {STUB_ITEMS.map((item) => (
            <div key={item} className="rounded-md bg-surface-input px-3 py-2.5 text-center text-xs font-semibold text-text-grey">
              {item}
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
