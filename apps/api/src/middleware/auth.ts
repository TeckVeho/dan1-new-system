import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { getSessionContext } from "../services/auth.service.js";
import { ForbiddenError, UnauthenticatedError } from "../lib/errors.js";
import { hasPermission } from "../lib/permissions.js";

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[env.sessionCookieName];
    if (!token) throw new UnauthenticatedError();

    const context = await getSessionContext(token);
    if (!context) throw new UnauthenticatedError("セッションが失効しました。再度ログインしてください");

    context.ipAddress = req.ip;
    context.userAgent = req.get("user-agent") ?? undefined;
    req.context = context;
    next();
  } catch (error) {
    next(error);
  }
}

/** Attaches context if a valid session cookie is present, but never rejects. */
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[env.sessionCookieName];
    if (token) {
      const context = await getSessionContext(token);
      if (context) {
        context.ipAddress = req.ip;
        context.userAgent = req.get("user-agent") ?? undefined;
        req.context = context;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...required: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.context) return next(new UnauthenticatedError());
    const missing = required.filter((code) => !hasPermission(req.context!.permissions, code));
    if (missing.length > 0) {
      return next(new ForbiddenError("この操作を行う権限がありません", missing.map((code) => ({ message: code }))));
    }
    next();
  };
}

export function requireInternal(req: Request, _res: Response, next: NextFunction): void {
  if (!req.context) return next(new UnauthenticatedError());
  if (req.context.userType !== "internal") return next(new ForbiddenError("社内ユーザーのみ利用できます"));
  next();
}
