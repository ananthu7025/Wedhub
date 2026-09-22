import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

export function listActivePlans() {
  return prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] });
}

export function listAllPlans() {
  return prisma.subscriptionPlan.findMany({ orderBy: [{ sortOrder: "asc" }, { price: "asc" }] });
}

export function findPlanById(id: string) {
  return prisma.subscriptionPlan.findUnique({ where: { id } });
}

export function findPlanBySlug(slug: string) {
  return prisma.subscriptionPlan.findUnique({ where: { slug } });
}

export function existsBySlug(slug: string) {
  return prisma.subscriptionPlan.findUnique({ where: { slug }, select: { id: true } }).then((row) => row !== null);
}

// The one place "what plan is a vendor with no Subscription row on" is
// resolved. Exactly one active plan should carry isDefault=true (enforced by
// a partial unique index — see the dynamic-plans migration), but this reads
// isActive too since a default plan should never be silently deactivated
// out from under every free-tier vendor.
export function findDefaultPlan() {
  return prisma.subscriptionPlan.findFirst({ where: { isDefault: true, isActive: true } });
}

export interface PlanCreateFields {
  slug: string;
  billingInterval: "MONTHLY" | "YEARLY";
  name: string;
  price: number;
  currency: string;
  trialDays: number;
  isDefault: boolean;
  sortOrder: number;
  features: Prisma.InputJsonValue;
  limits: Prisma.InputJsonValue;
}

export function createPlan(data: PlanCreateFields) {
  return prisma.subscriptionPlan.create({ data });
}

export interface PlanUpdateFields {
  name: string | undefined;
  price: number | undefined;
  trialDays: number | undefined;
  sortOrder: number | undefined;
  isDefault: boolean | undefined;
  features: Prisma.InputJsonValue | undefined;
  limits: Prisma.InputJsonValue | undefined;
  isActive: boolean | undefined;
}

export function updatePlan(id: string, data: PlanUpdateFields) {
  return prisma.subscriptionPlan.update({ where: { id }, data: omitUndefined(data) });
}

// Clears isDefault on whichever plan currently holds it, then sets it on
// `id`, inside one transaction — the app-level half of the "exactly one
// default plan" invariant (the partial unique index is the DB-level
// backstop for anything that bypasses this function).
export function setDefaultPlan(id: string) {
  return prisma.$transaction([
    prisma.subscriptionPlan.updateMany({ where: { isDefault: true, NOT: { id } }, data: { isDefault: false } }),
    prisma.subscriptionPlan.update({ where: { id }, data: { isDefault: true } }),
  ]);
}
