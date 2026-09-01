import { prisma } from "../../config/database";
import { AuthenticationError, ConflictError, ValidationError } from "../../common/errors";
import { hashToken } from "../../common/utils/token.util";
import { hashPassword } from "../../common/utils/password.util";
import { Role } from "../../common/enums/roles.enum";
import { issueTokenPair } from "../auth/auth.service";
import type { RequestContext, TokenPair } from "../auth/auth.types";

async function findValidInvitation(token: string) {
  const tokenHash = hashToken(token);
  const invitation = await prisma.vendorInvitation.findUnique({
    where: { tokenHash },
    include: { vendor: true },
  });

  if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
    throw new ValidationError("Invalid or expired invitation token");
  }

  if (invitation.vendor.ownerUserId) {
    throw new ConflictError("This vendor has already been claimed");
  }

  return invitation;
}

export async function resolveInvitation(token: string) {
  const invitation = await findValidInvitation(token);
  return {
    vendorId: invitation.vendorId,
    businessName: invitation.vendor.businessName,
    invitedEmail: invitation.invitedEmail,
  };
}

async function completeClaim(invitationId: string, vendorId: string, userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.vendor.update({ where: { id: vendorId }, data: { ownerUserId: userId } }),
    prisma.vendorInvitation.update({
      where: { id: invitationId },
      data: { usedAt: new Date(), claimedByUserId: userId },
    }),
    prisma.vendorStatusHistory.create({
      data: {
        vendorId,
        fromStatus: null,
        toStatus: "DRAFT",
        reason: "Vendor invitation claimed",
        changedByUserId: userId,
      },
    }),
  ]);
}

export async function claimByRegistering(
  input: {
    token: string;
    email: string;
    password: string;
    phone: string | undefined;
  },
  context: RequestContext,
): Promise<{ userId: string; vendorId: string; tokens: TokenPair }> {
  const invitation = await findValidInvitation(input.token);

  const existingByEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingByEmail) {
    throw new ConflictError("An account with this email already exists — please log in and use the link instead");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      phone: input.phone ?? null,
      passwordHash,
      role: Role.VENDOR,
    },
  });

  await completeClaim(invitation.id, invitation.vendorId, user.id);
  const tokens = await issueTokenPair(user.id, Role.VENDOR, context);

  return { userId: user.id, vendorId: invitation.vendorId, tokens };
}

export async function claimByLinking(token: string, userId: string, userRole: string): Promise<{ vendorId: string }> {
  const invitation = await findValidInvitation(token);

  if (userRole !== Role.VENDOR) {
    throw new AuthenticationError("Only a VENDOR-role account can claim a vendor listing");
  }

  const existingVendor = await prisma.vendor.findFirst({ where: { ownerUserId: userId } });
  if (existingVendor) {
    throw new ConflictError("This account already owns a vendor profile");
  }

  await completeClaim(invitation.id, invitation.vendorId, userId);

  return { vendorId: invitation.vendorId };
}
