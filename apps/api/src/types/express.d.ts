import type { RequestContext } from "./context.js";

declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
      requestId?: string;
    }
  }
}

export {};
