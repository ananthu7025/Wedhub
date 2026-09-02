import type { Request, Response } from "express";
import { successResponse } from "../../common/utils/api-response.util";
import * as planService from "./plan.service";
import type { CreatePlanBody, UpdatePlanBody } from "./plan.schema";

export async function listPlans(_req: Request, res: Response): Promise<void> {
  const plans = await planService.listActivePlans();
  res.json(successResponse(plans));
}

export async function listPlansAdmin(_req: Request, res: Response): Promise<void> {
  const plans = await planService.listAllPlansAdmin();
  res.json(successResponse(plans));
}

export async function createPlan(req: Request, res: Response): Promise<void> {
  const body = req.body as CreatePlanBody;
  const plan = await planService.createPlan({
    tier: body.tier,
    billingInterval: body.billingInterval,
    name: body.name,
    price: body.price,
    currency: body.currency,
    trialDays: body.trialDays,
    features: body.features,
    limits: body.limits,
  });
  res.status(201).json(successResponse(plan));
}

export async function updatePlan(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdatePlanBody;
  const plan = await planService.updatePlan(req.params.id as string, {
    name: body.name,
    price: body.price,
    trialDays: body.trialDays,
    features: body.features,
    limits: body.limits,
    isActive: body.isActive,
  });
  res.json(successResponse(plan));
}
