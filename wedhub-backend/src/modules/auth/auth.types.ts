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
