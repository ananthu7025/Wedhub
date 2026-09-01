import type { NextFunction, Request, Response } from "express";
import { AuthenticationError, AuthorizationError } from "../errors";
import type { Role } from "../enums/roles.enum";

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError());
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AuthorizationError());
      return;
    }

    next();
  };
}
