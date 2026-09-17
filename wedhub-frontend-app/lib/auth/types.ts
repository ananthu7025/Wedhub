export type UserRole = "END_USER" | "VENDOR" | "ADMIN";

export interface AuthenticatedUser {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
}

export interface Session {
  userId: string;
  role: UserRole;
  // Mirrors the access token's emailVerified claim (see wedhub-backend's
  // token.util.ts AccessTokenPayload) — can go stale for up to the access
  // token's TTL (15 min) after a verify/change-email confirmation, since it's
  // only refreshed on login/token-refresh, same tradeoff documented there.
  emailVerified: boolean;
}
