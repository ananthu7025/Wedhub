import type { LinkedIdentity, User } from "@prisma/client";
import { prisma } from "../../config/database";
import type { Role } from "../../common/enums/roles.enum";

export function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserByPhone(phone: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { phone } });
}

export function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export function findUserByEmailOrPhone(identifier: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
  });
}

export function createUser(input: {
  email: string;
  phone: string | undefined;
  passwordHash: string;
  role: Role;
}): Promise<User> {
  return prisma.user.create({
    data: {
      email: input.email,
      phone: input.phone ?? null,
      passwordHash: input.passwordHash,
      role: input.role,
    },
  });
}

export function findLinkedIdentity(provider: string, providerAccountId: string): Promise<LinkedIdentity | null> {
  return prisma.linkedIdentity.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
  });
}

// Brand-new signup via an OAuth provider: no password is ever set
// (passwordHash stays null — password login on this account cleanly
// rejects it, see auth.service.ts), and emailVerifiedAt is stamped
// immediately since the provider already proved ownership of the mailbox.
// Both rows are created in one transaction so a user can never exist
// without its LinkedIdentity (or vice versa).
export function createUserWithLinkedIdentity(input: {
  email: string;
  role: Role;
  provider: string;
  providerAccountId: string;
}): Promise<User> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        role: input.role,
        passwordHash: null,
        emailVerifiedAt: new Date(),
      },
    });
    await tx.linkedIdentity.create({
      data: {
        userId: user.id,
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        email: input.email,
      },
    });
    return user;
  });
}

// Links a new provider identity to an already-existing (password-based)
// account, in the same transaction as stamping emailVerifiedAt if it
// wasn't already set — the provider's verification stands in for it.
export function linkIdentityToExistingUser(input: {
  userId: string;
  provider: string;
  providerAccountId: string;
  email: string;
  stampEmailVerified: boolean;
}): Promise<LinkedIdentity> {
  return prisma.$transaction(async (tx) => {
    if (input.stampEmailVerified) {
      await tx.user.update({
        where: { id: input.userId },
        data: { emailVerifiedAt: new Date() },
      });
    }
    return tx.linkedIdentity.create({
      data: {
        userId: input.userId,
        provider: input.provider,
        providerAccountId: input.providerAccountId,
        email: input.email,
      },
    });
  });
}

export function recordFailedLogin(userId: string, attempts: number, lockedUntil: Date | null): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: attempts, lockedUntil },
  });
}

export function recordSuccessfulLogin(userId: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
}

export function updatePasswordHash(userId: string, passwordHash: string): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export function markEmailVerified(userId: string): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
}

export function createRefreshToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress: string | undefined;
  userAgent: string | undefined;
}) {
  return prisma.refreshToken.create({
    data: {
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

export function findRefreshTokenByHash(tokenHash: string) {
  return prisma.refreshToken.findUnique({ where: { tokenHash } });
}

export function revokeRefreshToken(id: string, replacedById?: string) {
  return prisma.refreshToken.update({
    where: { id },
    data: { revokedAt: new Date(), replacedById: replacedById ?? null },
  });
}

export function revokeAllRefreshTokensForUser(userId: string) {
  return prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function createEmailVerificationToken(input: { userId: string; tokenHash: string; expiresAt: Date }) {
  return prisma.emailVerificationToken.create({ data: input });
}

export function findEmailVerificationTokenByHash(tokenHash: string) {
  return prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
}

export function markEmailVerificationTokenUsed(id: string) {
  return prisma.emailVerificationToken.update({ where: { id }, data: { usedAt: new Date() } });
}

export function createPasswordResetToken(input: { userId: string; tokenHash: string; expiresAt: Date }) {
  return prisma.passwordResetToken.create({ data: input });
}

export function findPasswordResetTokenByHash(tokenHash: string) {
  return prisma.passwordResetToken.findUnique({ where: { tokenHash } });
}

export function markPasswordResetTokenUsed(id: string) {
  return prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
}
