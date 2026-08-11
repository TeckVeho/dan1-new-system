import { Router } from "express";
import { importCalendarQuerySchema } from "@dan1/shared";
import { authenticate, authorize } from "../../middleware/auth.js";
import { sendData } from "../../lib/response.js";
import { getImportCalendar } from "../../services/procurement.service.js";

export const importCalendarRouter = Router();

importCalendarRouter.use(authenticate);

importCalendarRouter.get("/", authorize("procurement.import.execute"), async (req, res, next) => {
  try {
    const query = importCalendarQuerySchema.parse(req.query);
    const result = await getImportCalendar({
      month: query.month,
      supplierId: query.supplierId ? BigInt(query.supplierId) : undefined,
    });
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});
