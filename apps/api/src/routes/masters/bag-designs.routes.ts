import { Router } from "express";
import { bagDesignSchema, pickingDestinationRuleSchema } from "@dan1/shared";
import { authenticate, authorize } from "../../middleware/auth.js";
import { sendData, sendList, sendNoContent, buildPageMeta } from "../../lib/response.js";
import { paramId } from "../../lib/http.js";
import {
  listBagDesigns,
  createBagDesign,
  updateBagDesign,
  deleteBagDesign,
  listPickingDestinations,
  upsertPickingDestination,
  deletePickingDestination,
} from "../../services/bag-design.service.js";

export const bagDesignsRouter = Router();
export const pickingDestinationsRouter = Router();

bagDesignsRouter.use(authenticate);

bagDesignsRouter.get("/", authorize("master.read"), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const perPage = Number(req.query.perPage ?? 50);
    const customerId = req.query.customerId ? BigInt(String(req.query.customerId)) : undefined;
    const { items, totalCount } = await listBagDesigns({ customerId, page, perPage });
    sendList(res, items, buildPageMeta(page, perPage, totalCount));
  } catch (error) {
    next(error);
  }
});

bagDesignsRouter.post("/", authorize("master.stock_item.update"), async (req, res, next) => {
  try {
    const input = bagDesignSchema.parse(req.body);
    const created = await createBagDesign({
      ctx: req.context!,
      customerId: BigInt(input.customerId),
      name: input.name,
      facilityNumber: input.facilityNumber,
      maxUnits: input.maxUnits,
      maxMeals: input.maxMeals,
      unitIds: input.unitIds.map((id) => BigInt(id)),
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    });
    sendData(res, created, 201);
  } catch (error) {
    next(error);
  }
});

bagDesignsRouter.patch("/:id", authorize("master.stock_item.update"), async (req, res, next) => {
  try {
    const input = bagDesignSchema.partial().parse(req.body);
    const updated = await updateBagDesign({
      ctx: req.context!,
      id: BigInt(paramId(req.params.id)),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.facilityNumber !== undefined ? { facilityNumber: input.facilityNumber } : {}),
      ...(input.maxUnits !== undefined ? { maxUnits: input.maxUnits } : {}),
      ...(input.maxMeals !== undefined ? { maxMeals: input.maxMeals } : {}),
      ...(input.unitIds !== undefined ? { unitIds: input.unitIds.map((id) => BigInt(id)) } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    sendData(res, updated);
  } catch (error) {
    next(error);
  }
});

bagDesignsRouter.delete("/:id", authorize("master.stock_item.update"), async (req, res, next) => {
  try {
    await deleteBagDesign(req.context!, BigInt(paramId(req.params.id)));
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});

pickingDestinationsRouter.use(authenticate);

pickingDestinationsRouter.get("/", authorize("master.read"), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const perPage = Number(req.query.perPage ?? 50);
    const { items, totalCount } = await listPickingDestinations({ page, perPage });
    sendList(res, items, buildPageMeta(page, perPage, totalCount));
  } catch (error) {
    next(error);
  }
});

pickingDestinationsRouter.put("/", authorize("master.stock_item.update"), async (req, res, next) => {
  try {
    const input = pickingDestinationRuleSchema.parse(req.body);
    const saved = await upsertPickingDestination({
      ctx: req.context!,
      stockItemId: BigInt(input.stockItemId),
      destination: input.destination,
      note: input.note,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    });
    sendData(res, saved);
  } catch (error) {
    next(error);
  }
});

pickingDestinationsRouter.delete("/:stockItemId", authorize("master.stock_item.update"), async (req, res, next) => {
  try {
    await deletePickingDestination(req.context!, BigInt(paramId(req.params.stockItemId)));
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
});
