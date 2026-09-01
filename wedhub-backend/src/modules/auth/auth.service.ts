import { logger } from "../../config/logger";
import { AuthenticationError, ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import { Role } from "../../common/enums/roles.enum";
import { comparePassword, hashPassword } from "../../common/utils/password.util";
import {
  generateOpaqueToken,
  hashToken,
  refreshTokenExpiryDate,
  signAccessToken,
} from "../../common/utils/token.util";
import * as authRepository from "./auth.repository";
import type {
  AuthenticatedUserView,
  LoginInput,
  RegisterInput,
  RequestContext,
  TokenPair,
} from "./auth.types";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function toAuthenticatedUserView(user: {
  id: string;
  email: string;
  phone: string | null;
  role: string;
}): AuthenticatedUserView {
  return { id: user.id, email: user.email, phone: user.phone, role: user.role as Role };
}

async function issueTokenPair(userId: string, role: Role, context: RequestContext): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: userId, role });
  const refreshToken = generateOpaqueToken();
  const refreshTokenExpiresAt = refreshTokenExpiryDate();

  await authRepository.createRefreshToken({
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshTokenExpiresAt,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return { accessToken, refreshToken, refreshTokenExpiresAt };
}

export async function register(
  input: RegisterInput,
): Promise<{ user: AuthenticatedUserView }> {
  const existingByEmail = await authRepository.findUserByEmail(input.email);
  if (existingByEmail) {
    throw new ConflictError("An account with this email already exists");
  }

  if (input.phone) {
    const existingByPhone = await authRepository.findUserByPhone(input.phone);
    if (existingByPhone) {
      throw new ConflictError("An account with this phone number already exists");
    }
  }

  const passwordHash = await hashPassword(input.password);
  const user = await authRepository.createUser({
    email: input.email,
    phone: input.phone,
    passwordHash,
    role: input.role,
  });

  const verificationToken = generateOpaqueToken();
  await authRepository.createEmailVerificationToken({
    userId: user.id,
    tokenHash: hashToken(verificationToken),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  });

  // TODO(Arch Phase 14): replace with real email delivery via the notification service.
  logger.info(
    { userId: user.id, verificationToken },
    "Email verification link (stubbed — no email delivery yet)",
  );

  return { user: toAuthenticatedUserView(user) };
}

export async function login(
  input: LoginInput,
  context: RequestContext,
): Promise<{ user: AuthenticatedUserView; tokens: TokenPair }> {
  const user = await authRepository.findUserByEmailOrPhone(input.identifier);

  if (!user) {
    throw new AuthenticationError("Invalid credentials");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AuthenticationError(
      "Account temporarily locked due to repeated failed login attempts. Please try again later.",
    );
  }

  const passwordMatches = await comparePassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    const attempts = user.failedLoginAttempts + 1;
    const lockedUntil = attempts >= MAX_FAILED_LOGIN_ATTEMPTS ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;
    await authRepository.recordFailedLogin(user.id, attempts, lockedUntil);

    if (lockedUntil) {
      throw new AuthenticationError(
        "Account temporarily locked due to repeated failed login attempts. Please try again later.",
      );
    }
    throw new AuthenticationError("Invalid credentials");
  }

  await authRepository.recordSuccessfulLogin(user.id);
  const tokens = await issueTokenPair(user.id, user.role as Role, context);

  return { user: toAuthenticatedUserView(user), tokens };
}

export async function refresh(
  presentedToken: string,
  context: RequestContext,
): Promise<TokenPair> {
  const tokenHash = hashToken(presentedToken);
  const existing = await authRepository.findRefreshTokenByHash(tokenHash);

  if (!existing) {
    throw new AuthenticationError("Invalid refresh token");
  }

  if (existing.revokedAt) {
    // Reuse of an already-rotated refresh token indicates possible theft — revoke the whole chain.
    await authRepository.revokeAllRefreshTokensForUser(existing.userId);
    logger.warn({ userId: existing.userId }, "Refresh token reuse detected — all sessions revoked");
    throw new AuthenticationError("Refresh token has already been used. All sessions have been revoked.");
  }

  if (existing.expiresAt < new Date()) {
    throw new AuthenticationError("Refresh token has expired");
  }

  const user = await authRepository.findUserById(existing.userId);
  if (!user) {
    throw new AuthenticationError("Invalid refresh token");
  }

  const newAccessToken = signAccessToken({ sub: user.id, role: user.role as Role });
  const newRefreshToken = generateOpaqueToken();
  const newRefreshTokenExpiresAt = refreshTokenExpiryDate();

  const newTokenRow = await authRepository.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(newRefreshToken),
    expiresAt: newRefreshTokenExpiresAt,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  await authRepository.revokeRefreshToken(existing.id, newTokenRow.id);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    refreshTokenExpiresAt: newRefreshTokenExpiresAt,
  };
}

export async function logout(presentedToken: string): Promise<void> {
  const tokenHash = hashToken(presentedToken);
  const existing = await authRepository.findRefreshTokenByHash(tokenHash);

  if (existing && !existing.revokedAt) {
    await authRepository.revokeRefreshToken(existing.id);
  }
}

export async function verifyEmail(presentedToken: string): Promise<void> {
  const tokenHash = hashToken(presentedToken);
  const existing = await authRepository.findEmailVerificationTokenByHash(tokenHash);

  if (!existing || existing.usedAt || existing.expiresAt < new Date()) {
    throw new ValidationError("Invalid or expired verification token");
  }

  await authRepository.markEmailVerificationTokenUsed(existing.id);
  await authRepository.markEmailVerified(existing.userId);
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await authRepository.findUserByEmail(email);

  // Always behave the same way whether or not the account exists, to avoid user enumeration.
  if (!user) {
    return;
  }

  const resetToken = generateOpaqueToken();
  await authRepository.createPasswordResetToken({
    userId: user.id,
    tokenHash: hashToken(resetToken),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  });

  // TODO(Arch Phase 14): replace with real email delivery via the notification service.
  logger.info({ userId: user.id, resetToken }, "Password reset link (stubbed — no email delivery yet)");
}

export async function resetPassword(presentedToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(presentedToken);
  const existing = await authRepository.findPasswordResetTokenByHash(tokenHash);

  if (!existing || existing.usedAt || existing.expiresAt < new Date()) {
    throw new ValidationError("Invalid or expired reset token");
  }

  const user = await authRepository.findUserById(existing.userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const passwordHash = await hashPassword(newPassword);
  await authRepository.updatePasswordHash(user.id, passwordHash);
  await authRepository.markPasswordResetTokenUsed(existing.id);
  await authRepository.revokeAllRefreshTokensForUser(user.id);
}
