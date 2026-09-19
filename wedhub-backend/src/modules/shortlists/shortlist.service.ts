import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import { generateOpaqueToken } from "../../common/utils/token.util";
import { logAnalyticsEvent } from "../../common/utils/analytics.util";
import { getPublicUrl } from "../../integrations/storage/r2.client";
import * as shortlistRepository from "./shortlist.repository";

// Same COALESCE(thumbnail, optimized, original) fallback search.repository.ts
// uses for a card-sized image, and the same READY-only guard (a PROCESSING/
// FAILED logo has no usable variant yet, so it must resolve to no photo, not
// a broken/half-processed URL).
function resolveLogoUrl(
  logoMedia: { status: string; thumbnailObjectKey: string | null; optimizedObjectKey: string | null; originalObjectKey: string | null } | null,
): string | null {
  if (!logoMedia || logoMedia.status !== "READY") return null;
  const objectKey = logoMedia.thumbnailObjectKey ?? logoMedia.optimizedObjectKey ?? logoMedia.originalObjectKey;
  return objectKey ? getPublicUrl(objectKey) : null;
}

// GET /shortlists' actual public shape — the raw Prisma include result has
// vendor.profile.logoMedia (an object key + status), never a real vendor
// consumer should see; the frontend needs a resolved logoUrl/logoBlurDataUrl,
// same fields VendorCard/SearchCard already read from search results.
function toPublicShortlists<
  T extends {
    items: Array<{
      vendor: {
        profile: {
          shortDescription: string | null;
          startingPrice: unknown;
          currency: string | null;
          logoMedia: { status: string; thumbnailObjectKey: string | null; optimizedObjectKey: string | null; originalObjectKey: string | null; blurDataUrl: string | null } | null;
        } | null;
      };
    }>;
  },
>(shortlists: T[]) {
  return shortlists.map((shortlist) => ({
    ...shortlist,
    items: shortlist.items.map((item) => {
      const profile = item.vendor.profile;
      const logoMedia = profile?.logoMedia ?? null;
      if (!profile) {
        return { ...item, vendor: { ...item.vendor, profile: null } };
      }
      return {
        ...item,
        vendor: {
          ...item.vendor,
          profile: {
            shortDescription: profile.shortDescription,
            startingPrice: profile.startingPrice,
            currency: profile.currency,
            logoUrl: resolveLogoUrl(logoMedia),
            logoBlurDataUrl: logoMedia?.status === "READY" ? logoMedia.blurDataUrl : null,
          },
        },
      };
    }),
  }));
}

async function getOwnedShortlistOrThrow(userId: string, shortlistId: string) {
  const shortlist = await shortlistRepository.findShortlistById(shortlistId);
  if (!shortlist || shortlist.userId !== userId) {
    throw new NotFoundError("Shortlist not found");
  }
  return shortlist;
}

// Every user gets exactly one default "Favorites" shortlist, created lazily
// on first use rather than at registration — same opportunistic pattern as
// Arch Phase 5's advanceIfEmailNowVerified, avoiding a cross-module call
// from auth.service into shortlists for something most users may never use.
export async function getOrCreateDefaultShortlist(userId: string) {
  const existing = await shortlistRepository.findDefaultShortlist(userId);
  if (existing) {
    return existing;
  }
  return shortlistRepository.createDefaultShortlist(userId);
}

export async function listOwnShortlists(userId: string) {
  const shortlists = await shortlistRepository.listUserShortlists(userId);
  return toPublicShortlists(shortlists);
}

export async function createShortlist(userId: string, name: string) {
  return shortlistRepository.createShortlist(userId, name);
}

export async function renameShortlist(userId: string, shortlistId: string, name: string) {
  const shortlist = await getOwnedShortlistOrThrow(userId, shortlistId);
  if (shortlist.isDefault) {
    throw new ValidationError("The default Favorites shortlist cannot be renamed");
  }
  return shortlistRepository.renameShortlist(shortlistId, name);
}

export async function deleteShortlist(userId: string, shortlistId: string): Promise<void> {
  const shortlist = await getOwnedShortlistOrThrow(userId, shortlistId);
  if (shortlist.isDefault) {
    throw new ValidationError("The default Favorites shortlist cannot be deleted");
  }
  await shortlistRepository.deleteShortlist(shortlistId);
}

async function assertVendorIsPublic(vendorId: string): Promise<void> {
  const vendor = await shortlistRepository.findVendorStatus(vendorId);
  if (!vendor || vendor.status !== "APPROVED") {
    throw new NotFoundError("Vendor not found");
  }
}

export async function addItem(
  userId: string,
  shortlistId: string,
  vendorId: string,
  note: string | undefined,
): Promise<void> {
  await getOwnedShortlistOrThrow(userId, shortlistId);
  await assertVendorIsPublic(vendorId);

  const existing = await shortlistRepository.findItem(shortlistId, vendorId);
  if (existing) {
    throw new ConflictError("This vendor is already in the shortlist");
  }

  await shortlistRepository.addItem(shortlistId, vendorId, note);
  await logAnalyticsEvent({ userId, eventType: "shortlist_item_added", vendorId, metadata: { shortlistId } });
}

export async function removeItem(userId: string, shortlistId: string, vendorId: string): Promise<void> {
  await getOwnedShortlistOrThrow(userId, shortlistId);
  const existing = await shortlistRepository.findItem(shortlistId, vendorId);
  if (!existing) {
    throw new NotFoundError("This vendor is not in the shortlist");
  }
  await shortlistRepository.removeItem(shortlistId, vendorId);
  await logAnalyticsEvent({ userId, eventType: "shortlist_item_removed", vendorId, metadata: { shortlistId } });
}

// Foundation only (product.md §15's "future capability"): generates/revokes
// the share token so a link can be built later, but no public share-view
// endpoint exists yet to resolve it — deferred with the same "thin slice"
// reasoning as Arch Phase 13's featured-listings foundation.
export async function enableSharing(userId: string, shortlistId: string) {
  const shortlist = await getOwnedShortlistOrThrow(userId, shortlistId);
  if (shortlist.shareEnabled && shortlist.shareToken) {
    return shortlist;
  }
  return shortlistRepository.setShareSettings(shortlistId, {
    shareEnabled: true,
    shareToken: generateOpaqueToken(),
  });
}

export async function disableSharing(userId: string, shortlistId: string) {
  await getOwnedShortlistOrThrow(userId, shortlistId);
  return shortlistRepository.setShareSettings(shortlistId, { shareEnabled: false, shareToken: null });
}
