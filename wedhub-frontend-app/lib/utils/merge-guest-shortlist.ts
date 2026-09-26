import { addFavorite } from "@/lib/api/shortlists-client";
import { readGuestShortlist, clearGuestShortlist } from "@/lib/hooks/useGuestShortlist";

/**
 * Runs right after a successful login/signup (a real session cookie already
 * exists) to fold a guest's localStorage-only shortlist into their real
 * account shortlist, then clears the local copy so it can't resurface or
 * double-save on a later visit. Best-effort: a vendor that 409s (already
 * shortlisted, e.g. re-login on the same browser) or otherwise fails to add
 * is silently skipped rather than blocking the login flow — this is a
 * convenience merge, not a required step the user should ever see fail.
 */
export async function mergeGuestShortlistIntoAccount(): Promise<void> {
  const guestItems = readGuestShortlist();
  if (guestItems.length === 0) return;

  await Promise.allSettled(guestItems.map((item) => addFavorite(item.vendorId)));
  clearGuestShortlist();
}
