import { prisma } from "../../config/database";

export function countUsers() {
  return prisma.user.count();
}

export function countNewRegistrations(since: Date) {
  return prisma.user.count({ where: { createdAt: { gte: since } } });
}

export function countVendors() {
  return prisma.vendor.count();
}

export function countActiveVendors() {
  return prisma.vendor.count({ where: { status: "APPROVED" } });
}

// A vendor with any subscription currently ACTIVE or TRIALING — implicit
// FREE (no row) or PAST_DUE/CANCELLED/EXPIRED are not "paid" right now.
export function countPaidVendors() {
  return prisma.subscription.groupBy({
    by: ["vendorId"],
    where: { status: { in: ["ACTIVE", "TRIALING"] } },
  });
}

export function countLeads() {
  return prisma.lead.count();
}

export function countWonLeads() {
  return prisma.lead.count({ where: { status: "WON" } });
}

export function countEnquiries() {
  return prisma.enquiry.count();
}

export function sumRevenue(filter: { since: Date | undefined }) {
  return prisma.invoice.aggregate({
    where: { status: "PAID", ...(filter.since ? { issuedAt: { gte: filter.since } } : {}) },
    _sum: { amount: true },
  });
}

// MRR: every currently-ACTIVE subscription's plan price, YEARLY plans
// normalized to a monthly figure. TRIALING is deliberately excluded — no
// revenue has actually been collected yet for a trial.
export function listActiveSubscriptionPlanPrices() {
  return prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    select: { plan: { select: { price: true, billingInterval: true } } },
  });
}
