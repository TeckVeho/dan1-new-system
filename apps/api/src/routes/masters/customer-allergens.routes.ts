import { Router } from "express";
import { prisma } from "@dan1/database";
import { customerAllergenSchema } from "@dan1/shared";
import { authenticate, authorize } from "../../middleware/auth.js";
import { sendData, sendList, sendNoContent, buildPageMeta } from "../../lib/response.js";
import { NotFoundError } from "../../lib/errors.js";
import { paramId } from "../../lib/http.js";
import { recordAuditLog } from "../../services/audit.service.js";

export const customerAllergensRouter = Router({ mergeParams: true });

customerAllergensRouter.use(authenticate);

customerAllergensRouter.get("/", authorize("master.read"), async (req, res, next) => {
  try {
    const customerId = BigInt(paramId(req.params.customerId));
    const items = await prisma.customerAllergen.findMany({
      where: { customerId, deletedAt: null },
      include: { allergenType: true },
      orderBy: { allergenType: { sortOrder: "asc" } },
    });
    sendList(res, items, buildPageMeta(1, items.length, items.length));
  } catch (error) {
    next(error);
  }
});

customerAllergensRouter.post("/", authorize("master.allergen.update"), async (req, res, next) => {
  try {
    const customerId = BigInt(paramId(req.params.customerId));
    const input = customerAllergenSchema.parse(req.body);
    const allergenTypeId = BigInt(input.allergenTypeId);

    const allergenType = await prisma.allergenType.findUnique({ where: { id: allergenTypeId } });
    if (!allergenType) throw new NotFoundError("アレルギー種類が見つかりません");

    const existing = await prisma.customerAllergen.findUnique({
      where: { customerId_allergenTypeId: { customerId, allergenTypeId } },
    });

    const created = existing?.deletedAt
      ? await prisma.customerAllergen.update({
          where: { id: existing.id },
          data: { deletedAt: null },
          include: { allergenType: true },
        })
      : existing
        ? existing
        : await prisma.customerAllergen.create({
            data: { customerId, allergenTypeId },
            include: { allergenType: true },
          });

    await recordAuditLog({
      ctx: req.context!,
      action: existing ? "update" : "create",
      entityType: "customer_allergen",
      entityId: created.id,
      after: created,
    });
    sendData(res, created, existing && !existing.deletedAt ? 200 : 201);
  } catch (error) {
    next(error);
  }
});

customerAllergensRouter.delete("/:allergenTypeId", authorize("master.allergen.delete"), async (req, res, next) => {
  try {
    const customerId = BigInt(paramId(req.params.customerId));
    const allergenTypeId = BigInt(paramId(req.params.allergenTypeId));
    const row = await prisma.customerAllergen.findUnique({
      where: { customerId_allergenTypeId: { customerId, allergenTypeId } },
    });
    if (!row) throw new NotFoundError();
    await prisma.customerAllergen.update({ where: { id: row.id }, data: { deletedAt: new Date() } });
    await recordAuditLog({
      ctx: req.context!,
      action: "delete",
      entityType: "customer_allergen",
      entityId: row.id,
      before: row,
    });
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});
