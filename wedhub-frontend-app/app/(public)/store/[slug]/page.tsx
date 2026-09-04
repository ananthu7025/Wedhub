import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicTopbar } from "@/components/shared/PublicTopbar";
import { fetchPublicStore, fetchPublicStoreItems } from "@/lib/api/vendor-store";
import { ApiRequestError } from "@/lib/api/types";
import { PublicStorefrontView } from "./PublicStorefrontView";

interface StorePageProps {
  params: Promise<{ slug: string }>;
}

async function loadStore(slug: string) {
  try {
    const res = await fetchPublicStore(slug);
    return res.data;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({
  params,
}: StorePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const store = await loadStore(slug);
    return {
      title: `${store.storeName} | WedHub Official Store`,
      description:
        store.tagline ||
        store.aboutStore ||
        `Browse and order wedding products directly from ${store.storeName} on WedHub.`,
    };
  } catch {
    return { title: "Store Not Found | WedHub" };
  }
}

export default async function PublicStorePage({ params }: StorePageProps) {
  const { slug } = await params;
  const store = await loadStore(slug);
  const { data: items } = await fetchPublicStoreItems(slug);

  return (
    <>
      <PublicTopbar />
      <main>
        <PublicStorefrontView store={store} items={items} />
      </main>
    </>
  );
}
