import type { Metadata } from "next";
import { VendorShell } from "@/components/shared/VendorShell";
import { requireVendorOwnership } from "@/lib/auth/require-vendor";
import {
  listMyAlbums,
  listMyMedia,
  listMySubmittedStories,
  listStoriesAwaitingMyConfirmation,
} from "@/lib/api/vendor-self";
import { StoriesBoard } from "./StoriesBoard";

export const metadata: Metadata = {
  title: "Real Stories",
};

export default async function VendorStoriesPage() {
  const vendor = await requireVendorOwnership();
  const [{ data: albums }, { data: media }, { data: submittedStories }, { data: awaitingConfirmation }] =
    await Promise.all([
      listMyAlbums(),
      listMyMedia(),
      listMySubmittedStories(),
      listStoriesAwaitingMyConfirmation(),
    ]);

  return (
    <VendorShell activeHref="/vendor/stories" vendorName={vendor.businessName}>
      <StoriesBoard
        initialAlbums={albums}
        media={media.filter((m) => m.status === "READY")}
        initialSubmittedStories={submittedStories}
        initialAwaitingConfirmation={awaitingConfirmation}
      />
    </VendorShell>
  );
}
