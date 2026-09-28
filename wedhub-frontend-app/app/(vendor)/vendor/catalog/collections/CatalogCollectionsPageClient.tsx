"use client";

import { useState } from "react";
import { CatalogCollectionsManager } from "../CatalogCollectionsManager";
import type { CatalogCollection } from "@/lib/api/vendor-catalog.types";

export function CatalogCollectionsPageClient({ initialCollections }: { initialCollections: CatalogCollection[] }) {
  const [collections, setCollections] = useState<CatalogCollection[]>(initialCollections);

  return (
    <div className="rounded-lg border border-neutral-grey-40 bg-white p-5">
      <CatalogCollectionsManager collections={collections} onChange={setCollections} standalone />
    </div>
  );
}
