"use client";

import { useRouter } from "next/navigation";
import { CatalogStorefrontCustomizer } from "../CatalogStorefrontCustomizer";
import type { CatalogCollection, CatalogStoreSettings } from "@/lib/api/vendor-catalog.types";

export function CatalogStorefrontPageClient({
  initialSettings,
  collections,
}: {
  initialSettings: CatalogStoreSettings | null;
  collections: CatalogCollection[];
}) {
  const router = useRouter();

  return (
    <CatalogStorefrontCustomizer
      initialSettings={initialSettings}
      collections={collections}
      variant="page"
      onClose={() => router.refresh()}
    />
  );
}
