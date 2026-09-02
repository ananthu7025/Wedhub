// Split out of subscription.service so entitlement.service (which needs
// GRACE_PERIOD_DAYS for Scenario E's lazy grace-period expiry) doesn't have
// to import subscription.service and create a require cycle, since
// subscription.service also calls into entitlement.service for the Scenario
// G media sweep/restore.
export const GRACE_PERIOD_DAYS = 7; // product.md §28 Scenario E: "grace period can be configured" — env-configurable later if needed

export function periodEndFor(interval: "MONTHLY" | "YEARLY", from: Date): Date {
  const end = new Date(from);
  if (interval === "MONTHLY") {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setFullYear(end.getFullYear() + 1);
  }
  return end;
}
