import type { Prisma } from "@prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "../../common/errors";
import { generateUniqueSlug, slugify } from "../../common/utils/slug.util";
import * as planRepository from "./plan.repository";

export function listActivePlans() {
  return planRepository.listActivePlans();
}

export function listAllPlansAdmin() {
  return planRepository.listAllPlans();
}

export async function createPlan(input: {
  slug: string;
  billingInterval: "MONTHLY" | "YEARLY";
  name: string;
  price: number;
  currency: string;
  trialDays: number;
  isDefault: boolean;
  sortOrder: number;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
}) {
  const baseSlug = slugify(input.slug.length > 0 ? input.slug : input.name);
  const slug = await generateUniqueSlug(baseSlug, planRepository.existsBySlug);

  const plan = await planRepository.createPlan({
    slug,
    billingInterval: input.billingInterval,
    name: input.name,
    price: input.price,
    currency: input.currency,
    trialDays: input.trialDays,
    isDefault: false, // set via setDefaultPlan below, never directly on create, so the
    // "clear the old default first" transaction always runs through one code path
    sortOrder: input.sortOrder,
    features: input.features as Prisma.InputJsonValue,
    limits: input.limits as Prisma.InputJsonValue,
  });

  if (input.isDefault) {
    await planRepository.setDefaultPlan(plan.id);
    return planRepository.findPlanById(plan.id);
  }

  return plan;
}

export async function updatePlan(
  id: string,
  input: {
    name: string | undefined;
    price: number | undefined;
    trialDays: number | undefined;
    sortOrder: number | undefined;
    isDefault: boolean | undefined;
    features: Record<string, unknown> | undefined;
    limits: Record<string, unknown> | undefined;
    isActive: boolean | undefined;
  },
) {
  const existing = await planRepository.findPlanById(id);
  if (!existing) {
    throw new NotFoundError("Plan not found");
  }

  // A vendor with no subscription, or a lapsed one, falls back to whatever
  // plan is isDefault — deactivating that plan would leave getEffectivePlan()
  // with nothing to fall back to for every free-tier vendor at once.
  if (input.isActive === false && existing.isDefault) {
    throw new ValidationError("Cannot deactivate the default plan — set a different plan as default first.");
  }

  if (input.isDefault === false && existing.isDefault) {
    throw new ValidationError("Cannot unset the default plan directly — set a different plan as default instead.");
  }

  const updated = await planRepository.updatePlan(id, {
    name: input.name,
    price: input.price,
    trialDays: input.trialDays,
    sortOrder: input.sortOrder,
    isDefault: undefined, // never written by the generic update path — see setDefaultPlan below
    features: input.features as Prisma.InputJsonValue | undefined,
    limits: input.limits as Prisma.InputJsonValue | undefined,
    isActive: input.isActive,
  });

  if (input.isDefault === true && !existing.isDefault) {
    await planRepository.setDefaultPlan(id);
    return planRepository.findPlanById(id);
  }

  return updated;
}

export async function getPlanOrThrow(id: string) {
  const plan = await planRepository.findPlanById(id);
  if (!plan) {
    throw new NotFoundError("Plan not found");
  }
  return plan;
}

// Used by entitlement.service.ts as the last real read before falling back
// to hardcoded FEATURE_CATALOG defaults (which should be unreachable given
// the partial unique index, but getEffectivePlan() must never throw).
export async function getDefaultPlanOrThrow() {
  const plan = await planRepository.findDefaultPlan();
  if (!plan) {
    throw new ConflictError("No default plan is configured");
  }
  return plan;
}
