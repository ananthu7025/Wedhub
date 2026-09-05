import { OAuth2Client } from "google-auth-library";
import { logger } from "../../config/logger";
import { env } from "../../config/env";
import { AuthenticationError, ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import { Role } from "../../common/enums/roles.enum";
import * as notificationService from "../notifications/notification.service";
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
  GoogleLoginInput,
  LoginInput,
  RegisterInput,
  RequestContext,
  TokenPair,
} from "./auth.types";

const GOOGLE_PROVIDER = "GOOGLE";
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

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

export async function issueTokenPair(userId: string, role: Role, context: RequestContext): Promise<TokenPair> {
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

  await notificationService.notify({
    userId: user.id,
    eventType: "VERIFICATION",
    data: { token: verificationToken },
  });

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

  if (!user.passwordHash) {
    throw new AuthenticationError("This account uses Google sign-in. Please continue with Google.");
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

  if (user.status === "DEACTIVATED") {
    throw new AuthenticationError("This account has been deactivated");
  }

  if (user.status === "SUSPENDED") {
    throw new AuthenticationError("This account has been suspended. Contact support for assistance.");
  }

  await authRepository.recordSuccessfulLogin(user.id);
  const tokens = await issueTokenPair(user.id, user.role as Role, context);

  return { user: toAuthenticatedUserView(user), tokens };
}

export async function loginWithGoogle(
  input: GoogleLoginInput,
  context: RequestContext,
): Promise<{ user: AuthenticatedUserView; tokens: TokenPair }> {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AuthenticationError("Google sign-in is not configured");
  }

  let payload: { sub: string; email?: string; email_verified?: boolean } | undefined;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: input.idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    logger.warn({ err }, "Google ID token verification failed");
    throw new AuthenticationError("Invalid Google sign-in token");
  }

  if (!payload || !payload.email) {
    throw new AuthenticationError("Invalid Google sign-in token");
  }

  // The one real safeguard against a Google account whose email ownership
  // isn't actually confirmed (Google does allow email_verified: false in
  // some edge/legacy cases) — checked before any lookup, so an unverified
  // Google email can never reach or influence an existing WedHub account.
  if (!payload.email_verified) {
    throw new AuthenticationError("Your Google account's email is not verified");
  }

  const googleSub = payload.sub;
  const googleEmail = payload.email;

  const existingLink = await authRepository.findLinkedIdentity(GOOGLE_PROVIDER, googleSub);
  let user: Awaited<ReturnType<typeof authRepository.findUserById>>;

  if (existingLink) {
    user = await authRepository.findUserById(existingLink.userId);
    if (!user) {
      throw new AuthenticationError("Invalid Google sign-in token");
    }
  } else {
    const existingByEmail = await authRepository.findUserByEmail(googleEmail);

    if (!existingByEmail) {
      // Brand-new signup. role comes from which button was clicked (couple
      // signup vs. vendor signup), never from anything Google's token
      // itself asserts. The plain /login page omits role entirely — it has
      // no signup-intent context — so a first-time Google identity there
      // gets NotFoundError instead of being silently registered; the
      // frontend catches that and redirects to /signup.
      if (!input.role) {
        throw new NotFoundError("No account found for this Google identity");
      }

      user = await authRepository.createUserWithLinkedIdentity({
        email: googleEmail,
        role: input.role,
        provider: GOOGLE_PROVIDER,
        providerAccountId: googleSub,
      });

      await notificationService.notify({
        userId: user.id,
        eventType: "REGISTRATION",
        data: {},
      });
    } else {
      // Collision with an existing password-based account — auto-link,
      // but only after the same checks a plain password login would apply.
      // A role check only applies when the caller asserted one (i.e. from
      // /signup); a plain /login attempt has no role to conflict with and
      // simply resolves to whatever role the existing account already has.
      if (input.role && existingByEmail.role !== input.role) {
        const existingRoleLabel = existingByEmail.role === Role.VENDOR ? "vendor" : "couple";
        throw new ConflictError(
          `An account with this email already exists as a ${existingRoleLabel}. Please sign in from the correct page.`,
        );
      }

      if (existingByEmail.status === "DEACTIVATED") {
        throw new AuthenticationError("This account has been deactivated");
      }

      if (existingByEmail.status === "SUSPENDED") {
        throw new AuthenticationError("This account has been suspended. Contact support for assistance.");
      }

      await authRepository.linkIdentityToExistingUser({
        userId: existingByEmail.id,
        provider: GOOGLE_PROVIDER,
        providerAccountId: googleSub,
        email: googleEmail,
        stampEmailVerified: !existingByEmail.emailVerifiedAt,
      });

      // Fire-and-forget tripwire: notify() never throws, matching the
      // existing security-notification pattern used by forgotPassword().
      await notificationService.notify({
        userId: existingByEmail.id,
        eventType: "ACCOUNT_LINKED",
        data: {},
      });

      user = existingByEmail;
    }
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

  await notificationService.notify({
    userId: user.id,
    eventType: "PASSWORD_RESET",
    data: { token: resetToken },
  });
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
