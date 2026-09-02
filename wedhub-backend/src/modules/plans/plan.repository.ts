import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { omitUndefined } from "../../common/utils/object.util";

export function listActivePlans() {
  return prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: [{ tier: "asc" }, { billingInterval: "asc" }] });
}

export function listAllPlans() {
  return prisma.subscriptionPlan.findMany({ orderBy: [{ tier: "asc" }, { billingInterval: "asc" }] });
}

export function findPlanById(id: string) {
  return prisma.subscriptionPlan.findUnique({ where: { id } });
}

export function findPlan(tier: "FREE" | "PRO" | "PREMIUM", billingInterval: "MONTHLY" | "YEARLY") {
  return prisma.subscriptionPlan.findUnique({ where: { tier_billingInterval: { tier, billingInterval } } });
}

export function createPlan(data: {
  tier: "FREE" | "PRO" | "PREMIUM";
  billingInterval: "MONTHLY" | "YEARLY";
  name: string;
  price: number;
  currency: string;
  trialDays: number;
  features: Prisma.InputJsonValue;
  limits: Prisma.InputJsonValue;
}) {
  return prisma.subscriptionPlan.create({ data });
}

export interface PlanUpdateFields {
  name: string | undefined;
  price: number | undefined;
  trialDays: number | undefined;
  features: Prisma.InputJsonValue | undefined;
  limits: Prisma.InputJsonValue | undefined;
  isActive: boolean | undefined;
}

export function updatePlan(id: string, data: PlanUpdateFields) {
  return prisma.subscriptionPlan.update({ where: { id }, data: omitUndefined(data) });
}
