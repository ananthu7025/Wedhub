import { prisma } from "../../config/database";

const SHORTLIST_WITH_ITEMS_INCLUDE = {
  items: {
    include: {
      vendor: {
        select: {
          id: true,
          businessName: true,
          slug: true,
          status: true,
          verificationLevel: true,
          profile: {
            select: {
              shortDescription: true,
              startingPrice: true,
              currency: true,
              // Same logo resolution as search.repository.ts's searchVendors
              // (thumbnail -> optimized -> original fallback, READY only) —
              // GET /shortlists previously selected no media at all, so
              // every shortlist card fell back to "No photo yet" even for
              // vendors with a real, already-processed logo shown correctly
              // everywhere else (search cards, the vendor's own profile).
              logoMedia: {
                select: { thumbnailObjectKey: true, optimizedObjectKey: true, originalObjectKey: true, blurDataUrl: true, status: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

export function findDefaultShortlist(userId: string) {
  return prisma.shortlist.findFirst({ where: { userId, isDefault: true } });
}

export function createDefaultShortlist(userId: string) {
  return prisma.shortlist.create({ data: { userId, name: "Favorites", isDefault: true } });
}

export function listUserShortlists(userId: string) {
  return prisma.shortlist.findMany({
    where: { userId },
    include: SHORTLIST_WITH_ITEMS_INCLUDE,
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export function findShortlistById(id: string) {
  return prisma.shortlist.findUnique({ where: { id }, include: SHORTLIST_WITH_ITEMS_INCLUDE });
}

export function findShortlistByShareToken(shareToken: string) {
  return prisma.shortlist.findUnique({
    where: { shareToken },
    include: SHORTLIST_WITH_ITEMS_INCLUDE,
  });
}

export function createShortlist(userId: string, name: string) {
  return prisma.shortlist.create({ data: { userId, name } });
}

export function renameShortlist(id: string, name: string) {
  return prisma.shortlist.update({ where: { id }, data: { name } });
}

export function deleteShortlist(id: string) {
  return prisma.shortlist.delete({ where: { id } });
}

export function setShareSettings(id: string, data: { shareEnabled: boolean; shareToken: string | null }) {
  return prisma.shortlist.update({ where: { id }, data });
}

export function addItem(shortlistId: string, vendorId: string, note: string | undefined) {
  return prisma.shortlistItem.upsert({
    where: { shortlistId_vendorId: { shortlistId, vendorId } },
    create: { shortlistId, vendorId, note: note ?? null },
    update: { note: note ?? null },
  });
}

export function removeItem(shortlistId: string, vendorId: string) {
  return prisma.shortlistItem.delete({ where: { shortlistId_vendorId: { shortlistId, vendorId } } });
}

export function findItem(shortlistId: string, vendorId: string) {
  return prisma.shortlistItem.findUnique({ where: { shortlistId_vendorId: { shortlistId, vendorId } } });
}

export function findVendorStatus(vendorId: string) {
  return prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true, status: true } });
}
