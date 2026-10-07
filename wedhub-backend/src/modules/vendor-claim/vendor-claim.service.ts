import { prisma } from "../../config/database";
import { AuthenticationError, ConflictError, RateLimitError, ValidationError } from "../../common/errors";
import { generateOtpCode, hashToken } from "../../common/utils/token.util";
import { hashPassword } from "../../common/utils/password.util";
import { Role } from "../../common/enums/roles.enum";
import { sendEmail } from "../../integrations/email/resend.client";
import { renderEmailHtml } from "../notifications/notification.templates";
import { sendWhatsAppDirect } from "../../integrations/whatsapp/whatsapp.service";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { issueTokenPair } from "../auth/auth.service";
import type { RequestContext, TokenPair } from "../auth/auth.types";

// See PLAN-2026-09-30-vendor-bulk-import-claim-flow.md. Invitations no
// longer expire (VendorInvitation.expiresAt is null for every invitation
// created by the 2026-09-30 build onward — see vendor-admin.service.ts's
// createInvitation), so this function intentionally does NOT check
// expiresAt at all: a null value has no meaning to compare against, and a
// non-null value on an older, pre-this-change invitation is still honored
// (existing invitations created before this change keep their original TTL
// behavior rather than being silently upgraded to non-expiring).
async function findValidInvitation(token: string) {
  const tokenHash = hashToken(token);
  const invitation = await prisma.vendorInvitation.findUnique({
    where: { tokenHash },
    include: { vendor: true },
  });

  if (!invitation || invitation.usedAt) {
    throw new ValidationError("Invalid or already-used invitation token");
  }
  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
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
    // Masked, never the raw contact — the claim page only needs to show
    // "we'll send a code to j***@example.com" / "+91******3210", never the
    // full value, since this response is reachable by anyone who has (or
    // guesses) the token before any OTP has proven they own that contact.
    invitedEmail: invitation.invitedEmail ? maskEmail(invitation.invitedEmail) : null,
    invitedPhone: invitation.invitedPhone ? maskPhone(invitation.invitedPhone) : null,
  };
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(local.length - 1, 3))}@${domain}`;
}

function maskPhone(phone: string): string {
  return phone.length <= 4 ? phone : `${"*".repeat(phone.length - 4)}${phone.slice(-4)}`;
}

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;

// Sends a fresh OTP to whichever contact the invitation was created with
// (never one supplied by the caller — see the plan's locked-contact
// decision: the claim page cannot edit this, closing off the hijack path
// an editable contact field would open). A resend creates a NEW
// VendorInvitationOtp row rather than mutating the previous one, so a code
// from an earlier send can never verify even if it's still within its own
// TTL — only the most recently sent code is ever valid.
export async function sendClaimOtp(token: string): Promise<{ channel: "EMAIL" | "WHATSAPP" }> {
  const invitation = await findValidInvitation(token);

  const recent = await prisma.vendorInvitationOtp.findFirst({
    where: { invitationId: invitation.id },
    orderBy: { createdAt: "desc" },
  });
  if (recent && recent.createdAt.getTime() > Date.now() - OTP_RESEND_COOLDOWN_MS) {
    throw new RateLimitError("Please wait before requesting another code.");
  }

  if (!invitation.invitedEmail && !invitation.invitedPhone) {
    throw new ValidationError("This invitation has no contact method to verify against");
  }

  const code = generateOtpCode();
  const channel: "EMAIL" | "WHATSAPP" = invitation.invitedEmail ? "EMAIL" : "WHATSAPP";

  await prisma.vendorInvitationOtp.create({
    data: {
      invitationId: invitation.id,
      codeHash: hashToken(code),
      channel,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  if (channel === "EMAIL") {
    await sendEmail({
      to: invitation.invitedEmail as string,
      subject: "Your itsmyKalyanam verification code",
      html: renderEmailHtml({
        title: "Verify it's you",
        body: `Your verification code is ${code}. It expires in 10 minutes. Enter it on the claim page to continue setting up "${invitation.vendor.businessName}".`,
      }),
    });
  } else {
    await sendWhatsAppDirect({
      to: invitation.invitedPhone as string,
      templateName: env.WHATSAPP_OTP_TEMPLATE_NAME,
      languageCode: env.WHATSAPP_OTP_TEMPLATE_LANGUAGE,
      params: [code],
    });
  }

  return { channel };
}

// Marks the most recent OTP consumed on success. claimByRegistering below
// checks for a consumedAt'd row tied to this invitation rather than trusting
// a client-supplied "I verified" flag — the server, not the browser, is the
// source of truth for whether contact ownership was actually proven.
export async function verifyClaimOtp(token: string, code: string): Promise<void> {
  const invitation = await findValidInvitation(token);

  const otp = await prisma.vendorInvitationOtp.findFirst({
    where: { invitationId: invitation.id },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.consumedAt || otp.expiresAt < new Date()) {
    throw new ValidationError("No active verification code — request a new one");
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new RateLimitError("Too many incorrect attempts — request a new code");
  }

  if (otp.codeHash !== hashToken(code)) {
    await prisma.vendorInvitationOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new ValidationError("Incorrect code");
  }

  await prisma.vendorInvitationOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
}

async function assertOtpVerified(invitationId: string): Promise<void> {
  const verified = await prisma.vendorInvitationOtp.findFirst({
    where: { invitationId, consumedAt: { not: null } },
    orderBy: { consumedAt: "desc" },
  });
  if (!verified) {
    throw new AuthenticationError("Verify your contact method with a code before setting a password");
  }
}

// Auto-approve-on-claim (confirmed product decision, see the plan): the
// admin already personally vetted and entered this vendor's details during
// the onboarding call, so claiming goes straight to APPROVED instead of the
// normal DRAFT->PENDING_APPROVAL->APPROVED review path a self-registered
// vendor goes through. This is a deliberate tradeoff (no second review gate
// between what the admin typed and what's publicly live) accepted for
// this flow specifically — self-registration's status machine is untouched.
async function completeClaim(invitationId: string, vendorId: string, userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.vendor.update({
      where: { id: vendorId },
      data: { ownerUserId: userId, status: "APPROVED", approvedAt: new Date() },
    }),
    prisma.vendorInvitation.update({
      where: { id: invitationId },
      data: { usedAt: new Date(), claimedByUserId: userId },
    }),
    prisma.vendorStatusHistory.create({
      data: {
        vendorId,
        fromStatus: null,
        toStatus: "APPROVED",
        reason: "Vendor invitation claimed — admin-vetted at import, auto-approved",
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
  await assertOtpVerified(invitation.id);

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
  const tokens = await issueTokenPair(user.id, Role.VENDOR, context, user.emailVerifiedAt);

  logger.info({ vendorId: invitation.vendorId, userId: user.id }, "Vendor invitation claimed and auto-approved");

  return { userId: user.id, vendorId: invitation.vendorId, tokens };
}

export async function claimByLinking(token: string, userId: string, userRole: string): Promise<{ vendorId: string }> {
  const invitation = await findValidInvitation(token);
  await assertOtpVerified(invitation.id);

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
