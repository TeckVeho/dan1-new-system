import type { NextFunction, Request, Response } from "express";

export type RequestMeta = { ipAddress?: string; userAgent?: string };

/** Exposes ip/user-agent uniformly, including on pre-auth routes like /auth/login. */
export function auditContext(req: Request, res: Response, next: NextFunction): void {
  res.locals.requestMeta = {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
  } satisfies RequestMeta;
  next();
}
