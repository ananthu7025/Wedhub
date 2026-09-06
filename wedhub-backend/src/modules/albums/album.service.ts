import { NotFoundError } from "../../common/errors";
import * as albumRepository from "./album.repository";

export function createAlbum(
  vendorId: string,
  input: { name: string; description: string | undefined; visibility: string | undefined },
) {
  return albumRepository.createAlbum({ vendorId, ...input });
}

export function listOwnAlbums(vendorId: string) {
  return albumRepository.listVendorAlbums(vendorId);
}

// Folds in the vendor's un-albumed PORTFOLIO/VIDEO uploads as a synthetic
// leading "Portfolio" album so VendorPortfolioGallery.tsx (which flattens
// albums[].media) shows them without any frontend shape change — those
// uploads have no real Album row (see album.repository.ts's
// listPublicVendorPortfolioMedia), so a literal, non-DB id is used here.
export async function listPublicAlbums(vendorId: string) {
  const [albums, portfolioMedia] = await Promise.all([
    albumRepository.listPublicVendorAlbums(vendorId),
    albumRepository.listPublicVendorPortfolioMedia(vendorId),
  ]);

  if (portfolioMedia.length === 0) {
    return albums;
  }

  const portfolioAlbum = {
    id: "portfolio",
    vendorId,
    name: "Portfolio",
    description: null,
    coverMediaId: null,
    visibility: "PUBLIC" as const,
    sortOrder: -1,
    media: portfolioMedia,
  };

  return [portfolioAlbum, ...albums];
}

export async function updateAlbum(
  vendorId: string,
  albumId: string,
  input: {
    name: string | undefined;
    description: string | undefined;
    coverMediaId: string | undefined;
    visibility: string | undefined;
    sortOrder: number | undefined;
  },
) {
  const album = await albumRepository.findAlbumById(albumId);
  if (!album || album.vendorId !== vendorId) {
    throw new NotFoundError("Album not found");
  }
  return albumRepository.updateAlbum(albumId, input);
}

export async function deleteAlbum(vendorId: string, albumId: string): Promise<void> {
  const album = await albumRepository.findAlbumById(albumId);
  if (!album || album.vendorId !== vendorId) {
    throw new NotFoundError("Album not found");
  }
  await albumRepository.deleteAlbum(albumId);
}

// Admin creating/updating an album directly on a vendor's behalf —
// cold-start seeding for Wedding Stories (Arch Phase 17) when no vendor
// has created their own public album with a cover yet. No ownership check
// (unlike updateAlbum above) since the caller is already admin-gated at
// the route level, not acting as a specific vendor.
export function createAlbumForVendor(
  vendorId: string,
  input: { name: string; description: string | undefined; visibility: string | undefined },
) {
  return albumRepository.createAlbum({ vendorId, ...input });
}

export async function updateAlbumAsAdmin(
  albumId: string,
  input: {
    name: string | undefined;
    description: string | undefined;
    coverMediaId: string | undefined;
    visibility: string | undefined;
    sortOrder: number | undefined;
  },
) {
  const album = await albumRepository.findAlbumById(albumId);
  if (!album) {
    throw new NotFoundError("Album not found");
  }
  return albumRepository.updateAlbum(albumId, input);
}
