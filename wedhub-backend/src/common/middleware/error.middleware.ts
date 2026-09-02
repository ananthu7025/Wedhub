import type { NextFunction, Request, Response } from "express";
import { logger } from "../../config/logger";
import { isProduction } from "../../config/env";
import { AppError } from "../errors";
import { errorResponse } from "../utils/api-response.util";

// A non-Error rejection (e.g. the Razorpay SDK rejects with its own
// { statusCode, error: { description, ... } } shape, not a native Error)
// stringifies to the useless "[object Object]" via String(err) — a real bug
// caught live while debugging a genuine Razorpay validation failure whose
// actual message was hidden behind this. Dev-only (isProduction never
// reaches this branch), so surfacing provider internals here is safe.
function describeUnknownError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (err && typeof err === "object") {
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

// Express identifies error-handling middleware by arity (4 params) — the unused
// `next` parameter must stay for Express to route errors here.
export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    logger.warn(
      { requestId: req.requestId, code: err.code, statusCode: err.statusCode },
      err.message,
    );
    res.status(err.statusCode).json(errorResponse(err.code, err.message, err.details));
    return;
  }

  logger.error({ requestId: req.requestId, err }, "Unhandled error");

  res
    .status(500)
    .json(
      errorResponse(
        "INTERNAL_SERVER_ERROR",
        isProduction ? "Something went wrong" : describeUnknownError(err),
      ),
    );
}
