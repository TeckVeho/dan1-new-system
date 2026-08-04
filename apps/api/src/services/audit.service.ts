import { prisma } from "@dan1/database";
import type { RequestContext } from "../types/context.js";

export type AuditAction = "create" | "update" | "delete" | "restore" | "login" | "logout" | "impersonate";

export type RecordAuditLogInput = {
  ctx: RequestContext;
  action: AuditAction | string;
  entityType: string;
  entityId?: string | bigint | null;
  before?: unknown;
  after?: unknown;
};

/**
 * Writes to `audit_logs` (FR-001). The actor recorded is always the real
 * operator; when acting on behalf of a facility (impersonation), the
 * customerId being impersonated is embedded in `after` since the schema
 * has no dedicated column for it (docs/10_auth_roles.md §5.3).
 */
export async function recordAuditLog(input: RecordAuditLogInput): Promise<void> {
  const { ctx, action, entityType } = input;
  const impersonatedCustomerId = ctx.impersonatingCustomerId;
  const after =
    impersonatedCustomerId !== undefined
      ? { ...(typeof input.after === "object" && input.after ? input.after : { value: input.after }), impersonatedCustomerId: impersonatedCustomerId.toString() }
      : input.after;

  await prisma.auditLog.create({
    data: {
      userId: ctx.userId ?? null,
      action,
      entityType,
      entityId: input.entityId !== undefined && input.entityId !== null ? String(input.entityId) : null,
      before: input.before === undefined ? undefined : (input.before as never),
      after: after === undefined ? undefined : (after as never),
      ipAddress: ctx.ipAddress ?? null,
      userAgent: ctx.userAgent ?? null,
    },
  });
}

export type ListAuditLogsQuery = {
  entityType?: string;
  entityId?: string;
  userId?: string;
  page: number;
  perPage: number;
};

export async function listAuditLogs(query: ListAuditLogsQuery) {
  const where = {
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.entityId ? { entityId: query.entityId } : {}),
    ...(query.userId ? { userId: BigInt(query.userId) } : {}),
  };
  const [items, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, totalCount };
}
