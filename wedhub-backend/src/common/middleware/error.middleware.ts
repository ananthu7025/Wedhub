import type { NextFunction, Request, Response } from "express";
import { logger } from "../../config/logger";
import { isProduction } from "../../config/env";
import { AppError } from "../errors";
import { errorResponse } from "../utils/api-response.util";

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
        isProduction ? "Something went wrong" : err instanceof Error ? err.message : String(err),
      ),
    );
}
