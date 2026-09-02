import { prisma } from "../../config/database";
import { ConflictError, NotFoundError } from "../../common/errors";
import { generateOpaqueToken, hashToken } from "../../common/utils/token.util";
import { logger } from "../../config/logger";
import { slugify } from "../../common/utils/slug.util";
import { omitUndefined } from "../../common/utils/object.util";
import { sendEmail } from "../../integrations/email/resend.client";
import { renderEmailHtml } from "../notifications/notification.templates";
import * as notificationService from "../notifications/notification.service";
import { env } from "../../config/env";
import * as vendorRepository from "../vendors/vendor.repository";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let suffix = 1;

  while (await vendorRepository.findVendorBySlugAnyCase(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

export async function createAdminVendor(input: { businessName: string }) {
  const slug = await generateUniqueSlug(input.businessName);
  const vendor = await vendorRepository.createVendor({
    businessName: input.businessName,
    slug,
    creationSource: "ADMIN_CREATED",
    ownerUserId: undefined,
  });

  await vendorRepository.recordStatusChange({
    vendorId: vendor.id,
    fromStatus: null,
    toStatus: "DRAFT",
    reason: "Created by admin",
    changedByUserId: undefined,
  });

  return vendor;
}

export async function createInvitation(
  vendorId: string,
  adminId: string,
  invitedEmail: string | undefined,
) {
  const vendor = await vendorRepository.findVendorById(vendorId);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }
  if (vendor.ownerUserId) {
    throw new ConflictError("This vendor has already been claimed");
  }

  const token = generateOpaqueToken();
  const invitation = await prisma.vendorInvitation.create({
    data: {
      vendorId,
      tokenHash: hashToken(token),
      invitedByAdminId: adminId,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      ...omitUndefined({ invitedEmail }),
    },
  });

  // Bypasses the notification service on purpose: the invitee has no User
  // row yet (that's the whole point of an invitation), so there's no
  // recipient to attach a Notification/preference row to — this is a raw
  // transactional email to an address, not a notification about a user's
  // own activity. Best-effort: an invitation record still exists and can be
  // resent even if this particular send fails.
  if (invitedEmail) {
    try {
      await sendEmail({
        to: invitedEmail,
        subject: "You're invited to claim your WedHub vendor profile",
        html: renderEmailHtml({
          title: "Claim your vendor profile",
          body: `You've been invited to claim "${vendor.businessName}" on WedHub. Use this link to set up your account: ${env.FRONTEND_URL}/vendor-claim?token=${token}`,
        }),
      });
    } catch (err) {
      logger.error({ err, vendorId, invitationId: invitation.id }, "Failed to send vendor claim invitation email");
    }
  }

  return invitation;
}

export async function listVendors(filter: {
  status: string | undefined;
  verificationLevel: string | undefined;
  categoryId: string | undefined;
  cityId: string | undefined;
  page: number;
  limit: number;
}) {
  const where: Record<string, unknown> = {};
  if (filter.status) where.status = filter.status;
  if (filter.verificationLevel) where.verificationLevel = filter.verificationLevel;
  if (filter.cityId) where.cityId = filter.cityId;
  if (filter.categoryId) where.categories = { some: { categoryId: filter.categoryId } };

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      include: vendorRepository.VENDOR_FULL_INCLUDE,
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.vendor.count({ where }),
  ]);

  return { vendors, total };
}

export async function getVendorDetail(id: string) {
  const vendor = await vendorRepository.findVendorByIdForAdmin(id);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }
  return vendor;
}

export async function adminUpdateVendor(id: string, data: Record<string, unknown>) {
  const vendor = await vendorRepository.findVendorById(id);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }
  return prisma.vendor.update({ where: { id }, data });
}

export async function setVerificationLevel(id: string, adminId: string, level: string) {
  const vendor = await vendorRepository.findVendorById(id);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }

  const updated = await prisma.$transaction([
    prisma.vendor.update({ where: { id }, data: { verificationLevel: level as never } }),
    prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: "ADMIN_SET_VENDOR_VERIFICATION",
        entityType: "vendor",
        entityId: id,
        before: { verificationLevel: vendor.verificationLevel },
        after: { verificationLevel: level },
      },
    }),
  ]);

  return updated[0];
}

async function transitionStatus(input: {
  vendorId: string;
  adminId: string;
  toStatus: string;
  reason: string | undefined;
  allowedFromStatuses: string[];
  auditAction: string;
  extraData?: Record<string, unknown>;
}) {
  const vendor = await vendorRepository.findVendorById(input.vendorId);
  if (!vendor) {
    throw new NotFoundError("Vendor not found");
  }
  if (!input.allowedFromStatuses.includes(vendor.status)) {
    throw new ConflictError(
      `Cannot transition vendor from ${vendor.status} to ${input.toStatus}`,
    );
  }

  const results = await prisma.$transaction([
    prisma.vendor.update({
      where: { id: input.vendorId },
      data: { status: input.toStatus as never, ...input.extraData },
    }),
    prisma.vendorStatusHistory.create({
      data: {
        vendorId: input.vendorId,
        fromStatus: vendor.status,
        toStatus: input.toStatus as never,
        changedByUserId: input.adminId,
        ...omitUndefined({ reason: input.reason }),
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: input.adminId,
        action: input.auditAction,
        entityType: "vendor",
        entityId: input.vendorId,
        before: { status: vendor.status },
        after: { status: input.toStatus, reason: input.reason },
      },
    }),
  ]);

  return results[0];
}

export async function approveVendor(vendorId: string, adminId: string) {
  const vendor = await transitionStatus({
    vendorId,
    adminId,
    toStatus: "APPROVED",
    reason: undefined,
    allowedFromStatuses: ["PENDING_APPROVAL"],
    auditAction: "ADMIN_APPROVED_VENDOR",
    extraData: { approvedAt: new Date(), rejectionReason: null },
  });
  if (vendor.ownerUserId) {
    await notificationService.notify({
      userId: vendor.ownerUserId,
      eventType: "VENDOR_APPROVED",
      data: { businessName: vendor.businessName },
      relatedEntityType: "vendor",
      relatedEntityId: vendor.id,
    });
  }
  return vendor;
}

export async function rejectVendor(vendorId: string, adminId: string, reason: string) {
  const vendor = await transitionStatus({
    vendorId,
    adminId,
    toStatus: "REJECTED",
    reason,
    allowedFromStatuses: ["PENDING_APPROVAL"],
    auditAction: "ADMIN_REJECTED_VENDOR",
    extraData: { rejectionReason: reason },
  });
  if (vendor.ownerUserId) {
    await notificationService.notify({
      userId: vendor.ownerUserId,
      eventType: "VENDOR_REJECTED",
      data: { businessName: vendor.businessName, reason },
      relatedEntityType: "vendor",
      relatedEntityId: vendor.id,
    });
  }
  return vendor;
}

export function suspendVendor(vendorId: string, adminId: string, reason: string) {
  return transitionStatus({
    vendorId,
    adminId,
    toStatus: "SUSPENDED",
    reason,
    allowedFromStatuses: ["APPROVED"],
    auditAction: "ADMIN_SUSPENDED_VENDOR",
    extraData: { suspensionReason: reason },
  });
}

export function restoreVendor(vendorId: string, adminId: string) {
  return transitionStatus({
    vendorId,
    adminId,
    toStatus: "APPROVED",
    reason: "Restored by admin",
    allowedFromStatuses: ["SUSPENDED"],
    auditAction: "ADMIN_RESTORED_VENDOR",
    extraData: { suspensionReason: null },
  });
}

export function deactivateVendor(vendorId: string, adminId: string) {
  return transitionStatus({
    vendorId,
    adminId,
    toStatus: "DEACTIVATED",
    reason: "Deactivated by admin",
    allowedFromStatuses: [
      "DRAFT",
      "PENDING_VERIFICATION",
      "PENDING_APPROVAL",
      "APPROVED",
      "REJECTED",
      "SUSPENDED",
    ],
    auditAction: "ADMIN_DEACTIVATED_VENDOR",
  });
}

export function getStatusHistory(vendorId: string) {
  return vendorRepository.findStatusHistory(vendorId);
}
