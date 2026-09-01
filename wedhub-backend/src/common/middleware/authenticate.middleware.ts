import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../utils/token.util";
import { AuthenticationError } from "../errors";
import type { Role } from "../enums/roles.enum";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      role: Role;
    };
  }
}

export function authenticateMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    next(new AuthenticationError("Missing or malformed authorization header"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError("Access token has expired"));
      return;
    }
    next(new AuthenticationError("Invalid access token"));
  }
}

// For public routes that behave the same for everyone but want to attach
// req.user when a valid token happens to be present (e.g. search analytics
// attributing a query to a logged-in user without gating the endpoint).
// A missing or invalid token is never an error here — it just stays anonymous.
export function optionalAuthenticateMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    // ignore invalid/expired tokens on optional-auth routes
  }
  next();
}
