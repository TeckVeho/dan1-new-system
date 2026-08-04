import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../../middleware/auth.js";
import { resolveScopedCustomerId } from "../../lib/scope.js";
import { sendData } from "../../lib/response.js";
import { getAllergenOrderOptions, getCustomerUnitsForOrder } from "../../services/rice-allergen.service.js";

export const orderFormDataRouter = Router();

orderFormDataRouter.use(authenticate);

const customerQuerySchema = z.object({
  customerId: z.string().optional(),
});

/** Self-scoped unit list for order entry screens (facility users lack master.read). */
orderFormDataRouter.get("/units", authorize("order.read"), async (req, res, next) => {
  try {
    const query = customerQuerySchema.parse(req.query);
    const customerId = resolveScopedCustomerId(req.context!, query.customerId);
    const units = await getCustomerUnitsForOrder(customerId);
    sendData(res, units);
  } catch (error) {
    next(error);
  }
});

/** Unit + allergen-type options for allergen order forms. */
orderFormDataRouter.get("/allergen/options", authorize("order.read"), async (req, res, next) => {
  try {
    const query = customerQuerySchema.parse(req.query);
    const customerId = resolveScopedCustomerId(req.context!, query.customerId);
    const options = await getAllergenOrderOptions(customerId);
    sendData(res, options);
  } catch (error) {
    next(error);
  }
});
