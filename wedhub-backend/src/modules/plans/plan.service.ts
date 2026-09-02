import type { Prisma } from "@prisma/client";
import { ConflictError, NotFoundError } from "../../common/errors";
import * as planRepository from "./plan.repository";

export function listActivePlans() {
  return planRepository.listActivePlans();
}

export function listAllPlansAdmin() {
  return planRepository.listAllPlans();
}

export async function createPlan(input: {
  tier: "FREE" | "PRO" | "PREMIUM";
  billingInterval: "MONTHLY" | "YEARLY";
  name: string;
  price: number;
  currency: string;
  trialDays: number;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
}) {
  const existing = await planRepository.findPlan(input.tier, input.billingInterval);
  if (existing) {
    throw new ConflictError(`A plan already exists for ${input.tier}/${input.billingInterval}`);
  }
  return planRepository.createPlan({
    ...input,
    features: input.features as Prisma.InputJsonValue,
    limits: input.limits as Prisma.InputJsonValue,
  });
}

export async function updatePlan(
  id: string,
  input: {
    name: string | undefined;
    price: number | undefined;
    trialDays: number | undefined;
    features: Record<string, unknown> | undefined;
    limits: Record<string, unknown> | undefined;
    isActive: boolean | undefined;
  },
) {
  const existing = await planRepository.findPlanById(id);
  if (!existing) {
    throw new NotFoundError("Plan not found");
  }
  return planRepository.updatePlan(id, {
    name: input.name,
    price: input.price,
    trialDays: input.trialDays,
    features: input.features as Prisma.InputJsonValue | undefined,
    limits: input.limits as Prisma.InputJsonValue | undefined,
    isActive: input.isActive,
  });
}

export async function getPlanOrThrow(id: string) {
  const plan = await planRepository.findPlanById(id);
  if (!plan) {
    throw new NotFoundError("Plan not found");
  }
  return plan;
}
