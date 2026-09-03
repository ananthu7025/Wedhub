import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { WeddingWebsiteRenderer } from "@/components/wedding-website/WeddingWebsiteRenderer";
import { getWeddingWebsitePreview } from "@/lib/api/wedding-website";
import { ApiRequestError } from "@/lib/api/types";
import type { WeddingWebsitePublicView } from "@/lib/api/wedding-website.types";

interface PreviewPageProps {
  params: Promise<{ token: string }>;
}

// Business Rule 7: temporary previews must never be indexed — hardcoded,
// not derived from any flag, so there is no code path that could
// accidentally leave a preview indexable.
export const metadata: Metadata = {
  title: "Wedding Website Preview",
  robots: { index: false, follow: false },
};

type PreviewLoadResult =
  | { kind: "ready"; website: WeddingWebsitePublicView }
  | { kind: "invalid"; message: string };

async function loadPreview(token: string): Promise<PreviewLoadResult> {
  try {
    const { data: website } = await getWeddingWebsitePreview(token);
    return { kind: "ready", website };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    if (error instanceof ApiRequestError && error.status === 409) {
      // Expired or already-used — the backend's message text already
      // distinguishes the two ("Your preview has expired..." vs. "Your
      // free preview has already been used..."), Business Rule 5/7: never
      // show the underlying website content once invalid, only this CTA.
      return { kind: "invalid", message: error.message };
    }
    throw error;
  }
}

export default async function WeddingWebsitePreviewPage({ params }: PreviewPageProps) {
  const { token } = await params;
  const result = await loadPreview(token);

  if (result.kind === "invalid") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-bold text-text-dark">{result.message.split(" — ")[0]} ❤️</p>
        <p className="max-w-sm text-sm text-text-grey">
          Publish your wedding website for just ₹49 and get your permanent shareable link.
        </p>
        <Button href="/wedding-website">Publish My Website – ₹49</Button>
      </div>
    );
  }

  return (
    <WeddingWebsiteRenderer website={result.website} canonicalUrl={`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/preview/${token}`} mode="preview" />
  );
}
