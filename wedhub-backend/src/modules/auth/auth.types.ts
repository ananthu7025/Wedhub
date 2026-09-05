import type { Role } from "../../common/enums/roles.enum";

export interface RegisterInput {
  email: string;
  phone: string | undefined;
  password: string;
  role: Role.END_USER | Role.VENDOR;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface GoogleLoginInput {
  idToken: string;
  // Omitted from the plain /login page, which has no signup-intent context
  // (unlike /signup?type=vendor) — present only when the caller is willing
  // to have a brand-new account created with this role if none exists yet.
  // A returning user's Google identity resolves to their real existing role
  // regardless of whether this is present.
  role?: Role.END_USER | Role.VENDOR | undefined;
}

export interface AuthenticatedUserView {
  id: string;
  email: string;
  phone: string | null;
  role: Role;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface RequestContext {
  ipAddress: string | undefined;
  userAgent: string | undefined;
}
