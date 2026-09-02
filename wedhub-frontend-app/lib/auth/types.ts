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
}
