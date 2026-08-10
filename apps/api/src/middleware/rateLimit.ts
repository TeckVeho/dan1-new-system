import type { NextFunction, Request, Response } from "express";
import { RateLimitedError } from "../lib/errors.js";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyFn: (req: Request) => string;
}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = options.keyFn(req);
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > options.max) {
      next(new RateLimitedError("リクエストが多すぎます。しばらくしてから再度お試しください"));
      return;
    }
    next();
  };
}
