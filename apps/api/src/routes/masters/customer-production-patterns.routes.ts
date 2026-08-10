import { Router } from "express";
import { prisma } from "@dan1/database";
import { customerProductionPatternSchema } from "@dan1/shared";
import { authenticate, authorize } from "../../middleware/auth.js";
import { sendData, sendNoContent } from "../../lib/response.js";
import { paramId } from "../../lib/http.js";
import { NotFoundError } from "../../lib/errors.js";
import { recordAuditLog } from "../../services/audit.service.js";

export const customerProductionPatternsRouter = Router({ mergeParams: true });

customerProductionPatternsRouter.use(authenticate);

customerProductionPatternsRouter.get("/", authorize("master.read"), async (req, res, next) => {
  try {
    const customerId = BigInt(paramId(req.params.customerId));
    const items = await prisma.customerProductionPattern.findMany({
      where: { customerId },
      include: { productionPattern: true },
      orderBy: { validFrom: "desc" },
    });
    sendData(res, items);
  } catch (error) {
    next(error);
  }
});

customerProductionPatternsRouter.post("/", authorize("master.production_pattern.update"), async (req, res, next) => {
  try {
    const customerId = BigInt(paramId(req.params.customerId));
    const input = customerProductionPatternSchema.parse(req.body);
    const created = await prisma.customerProductionPattern.create({
      data: {
        customerId,
        productionPatternId: BigInt(input.productionPatternId),
        validFrom: new Date(input.validFrom),
        validTo: input.validTo ? new Date(input.validTo) : null,
      },
      include: { productionPattern: true },
    });
    await recordAuditLog({
      ctx: req.context!,
      action: "create",
      entityType: "customer_production_pattern",
      entityId: created.id,
      after: created,
    });
    sendData(res, created, 201);
  } catch (error) {
    next(error);
  }
});

customerProductionPatternsRouter.delete(
  "/:id",
  authorize("master.production_pattern.update"),
  async (req, res, next) => {
    try {
      const customerId = BigInt(paramId(req.params.customerId));
      const id = BigInt(paramId(req.params.id));
      const before = await prisma.customerProductionPattern.findFirst({
        where: { id, customerId },
      });
      if (!before) throw new NotFoundError();
      await prisma.customerProductionPattern.delete({ where: { id } });
      await recordAuditLog({
        ctx: req.context!,
        action: "delete",
        entityType: "customer_production_pattern",
        entityId: id,
        before,
      });
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  },
);
