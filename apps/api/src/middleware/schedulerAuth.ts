import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { ForbiddenError } from "../lib/errors.js";

export function schedulerAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.header("x-scheduler-token");
  if (!env.schedulerToken) {
    return next(new ForbiddenError("スケジューラトークンが設定されていません"));
  }
  if (!token || token !== env.schedulerToken) {
    return next(new ForbiddenError("スケジューラ認証に失敗しました"));
  }
  next();
}
