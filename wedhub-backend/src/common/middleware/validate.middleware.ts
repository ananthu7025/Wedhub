import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "../errors";

export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.flatten().fieldErrors as Record<string, unknown>;
      next(new ValidationError("Validation failed", details));
      return;
    }

    req.body = result.data;
    next();
  };
}

declare module "express-serve-static-core" {
  interface Request {
    validatedQuery?: unknown;
  }
}

export function validateQuery(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const details = result.error.flatten().fieldErrors as Record<string, unknown>;
      next(new ValidationError("Validation failed", details));
      return;
    }

    req.validatedQuery = result.data;
    next();
  };
}
