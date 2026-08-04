import type { RequestContext } from "../types/context.js";
import { ScopeViolationError } from "./errors.js";

/**
 * Injects the caller's customer scope into a Prisma `where` clause.
 * Enforced here (not just in controllers) per docs/10_auth_roles.md §4.1 —
 * facility users must never see another facility's rows even if the
 * request omits or forges a customerId.
 */
export function applyCustomerScope<T extends Record<string, unknown>>(
  where: T,
  ctx: RequestContext,
): T & { customerId?: bigint } {
  if (ctx.userType === "facility") {
    return { ...where, customerId: ctx.customerId! };
  }
  if (ctx.impersonatingCustomerId) {
    return { ...where, customerId: ctx.impersonatingCustomerId };
  }
  return where;
}

/** Resolves which customerId a request should operate on, enforcing scope. */
export function resolveScopedCustomerId(ctx: RequestContext, requestedCustomerId?: string | bigint | null): bigint {
  const requested = requestedCustomerId !== undefined && requestedCustomerId !== null
    ? BigInt(requestedCustomerId)
    : undefined;

  if (ctx.userType === "facility") {
    if (requested !== undefined && requested !== ctx.customerId) {
      throw new ScopeViolationError();
    }
    return ctx.customerId!;
  }

  if (ctx.impersonatingCustomerId) {
    if (requested !== undefined && requested !== ctx.impersonatingCustomerId) {
      throw new ScopeViolationError();
    }
    return ctx.impersonatingCustomerId;
  }

  if (requested === undefined) {
    throw new ScopeViolationError("customerId を指定してください");
  }
  return requested;
}

export function supplierScopeGuard(ctx: RequestContext, supplierId: bigint): void {
  if (ctx.userType !== "internal") return;
  if (!ctx.supplierScopeIds || ctx.supplierScopeIds.length === 0) return; // no scope row = all suppliers
  if (!ctx.supplierScopeIds.some((id) => id === supplierId)) {
    throw new ScopeViolationError("担当業者外の商品です");
  }
}
