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

export function listPublicAlbums(vendorId: string) {
  return albumRepository.listPublicVendorAlbums(vendorId);
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
