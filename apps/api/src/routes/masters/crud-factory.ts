import { Router } from "express";
import type { ZodSchema } from "zod";
import { masterSortOrderSchema } from "@dan1/shared";
import { authenticate, authorize } from "../../middleware/auth.js";
import { paginationQuerySchema } from "../../lib/pagination.js";
import { sendData, sendList, sendNoContent, buildPageMeta } from "../../lib/response.js";
import { NotFoundError } from "../../lib/errors.js";
import { paramId } from "../../lib/http.js";
import { recordAuditLog } from "../../services/audit.service.js";

// The delegate shape varies per Prisma model; a generic factory necessarily
// works against the common subset of the Prisma Client API.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaDelegate = any;

export type MasterResourceConfig<TCreate = unknown, TUpdate = unknown> = {
  entityType: string;
  model: PrismaDelegate;
  createSchema: ZodSchema<TCreate>;
  updateSchema: ZodSchema<TUpdate>;
  searchFields?: string[];
  defaultSortField?: string;
  softDelete?: boolean;
  toCreateData?: (input: TCreate) => Record<string, unknown>;
  toUpdateData?: (input: TUpdate) => Record<string, unknown>;
  readPermission?: string;
  writePermission?: string;
  include?: Record<string, unknown>;
  /** Maps query-string keys to Prisma where fields (e.g. customerId → customerId). */
  filterQuery?: Record<string, string>;
};

export function createMasterRouter<TCreate, TUpdate>(config: MasterResourceConfig<TCreate, TUpdate>): Router {
  const router = Router();
  const softDelete = config.softDelete ?? true;
  const sortField = config.defaultSortField ?? "sortOrder";
  const readPerm = config.readPermission ?? "master.read";
  const writePerm = config.writePermission ?? "master.read";

  router.use(authenticate);

  router.get("/", authorize(readPerm), async (req, res, next) => {
    try {
      const query = paginationQuerySchema.parse(req.query);
      const where: Record<string, unknown> = {};
      if (softDelete && !query.includeDeleted) where.deletedAt = null;
      if (query.q && config.searchFields?.length) {
        where.OR = config.searchFields.map((field) => ({ [field]: { contains: query.q } }));
      }
      if (config.filterQuery) {
        for (const [queryKey, field] of Object.entries(config.filterQuery)) {
          const raw = req.query[queryKey];
          if (raw !== undefined && raw !== "") {
            where[field] = BigInt(String(raw));
          }
        }
      }

      const [items, totalCount] = await Promise.all([
        config.model.findMany({
          where,
          include: config.include,
          orderBy: { [sortField]: "asc" },
          skip: (query.page - 1) * query.perPage,
          take: query.perPage,
        }),
        config.model.count({ where }),
      ]);

      sendList(res, items, buildPageMeta(query.page, query.perPage, totalCount));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/sort-order", authorize(writePerm), async (req, res, next) => {
    try {
      const input = masterSortOrderSchema.parse(req.body);
      await Promise.all(
        input.items.map((item) =>
          config.model.update({
            where: { id: BigInt(item.id) },
            data: { [sortField]: item.sortOrder },
          }),
        ),
      );
      await recordAuditLog({
        ctx: req.context!,
        action: "update",
        entityType: config.entityType,
        entityId: 0n,
        after: { sortOrder: input.items },
      });
      sendData(res, { updated: input.items.length });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", authorize(readPerm), async (req, res, next) => {
    try {
      const item = await config.model.findUnique({ where: { id: BigInt(paramId(req.params.id)) }, include: config.include });
      if (!item) throw new NotFoundError();
      sendData(res, item);
    } catch (error) {
      next(error);
    }
  });

  router.post("/", authorize(writePerm), async (req, res, next) => {
    try {
      const input = config.createSchema.parse(req.body);
      const data = config.toCreateData ? config.toCreateData(input) : (input as Record<string, unknown>);
      const created = await config.model.create({ data });
      await recordAuditLog({
        ctx: req.context!,
        action: "create",
        entityType: config.entityType,
        entityId: created.id,
        after: created,
      });
      sendData(res, created, 201);
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", authorize(writePerm), async (req, res, next) => {
    try {
      const id = BigInt(paramId(req.params.id));
      const before = await config.model.findUnique({ where: { id } });
      if (!before) throw new NotFoundError();

      const input = config.updateSchema.parse(req.body);
      const data = config.toUpdateData ? config.toUpdateData(input) : (input as Record<string, unknown>);
      const updated = await config.model.update({ where: { id }, data });
      await recordAuditLog({
        ctx: req.context!,
        action: "update",
        entityType: config.entityType,
        entityId: id,
        before,
        after: updated,
      });
      sendData(res, updated);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", authorize(writePerm), async (req, res, next) => {
    try {
      const id = BigInt(paramId(req.params.id));
      const before = await config.model.findUnique({ where: { id } });
      if (!before) throw new NotFoundError();

      if (softDelete) {
        await config.model.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
      } else {
        await config.model.delete({ where: { id } });
      }
      await recordAuditLog({ ctx: req.context!, action: "delete", entityType: config.entityType, entityId: id, before });
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  });

  if (softDelete) {
    router.post("/:id/restore", authorize(writePerm), async (req, res, next) => {
      try {
        const id = BigInt(paramId(req.params.id));
        const before = await config.model.findUnique({ where: { id } });
        if (!before) throw new NotFoundError();
        const restored = await config.model.update({ where: { id }, data: { deletedAt: null, isActive: true } });
        await recordAuditLog({ ctx: req.context!, action: "restore", entityType: config.entityType, entityId: id, before, after: restored });
        sendData(res, restored);
      } catch (error) {
        next(error);
      }
    });
  }

  return router;
}
