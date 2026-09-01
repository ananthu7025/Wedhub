import { AuthorizationError } from "../errors";

export function assertOwnsResource(userId: string, resourceOwnerId: string): void {
  if (userId !== resourceOwnerId) {
    throw new AuthorizationError("You do not have permission to access this resource");
  }
}
