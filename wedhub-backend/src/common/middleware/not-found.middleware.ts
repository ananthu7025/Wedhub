import type { Request, Response } from "express";
import { errorResponse } from "../utils/api-response.util";

export function notFoundMiddleware(req: Request, res: Response): void {
  res
    .status(404)
    .json(errorResponse("ROUTE_NOT_FOUND", `No route matches ${req.method} ${req.originalUrl}`));
}
