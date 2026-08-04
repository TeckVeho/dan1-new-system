import { Router } from "express";
import { z } from "zod";
import { customerSettingSchema } from "@dan1/shared";
import { authenticate, authorize } from "../../middleware/auth.js";
import { sendData } from "../../lib/response.js";
import { paramId } from "../../lib/http.js";
import { resolveCustomerSetting, getCustomerSettingHistory, updateCustomerSetting } from "../../services/settings.service.js";

export const customerSettingsRouter = Router({ mergeParams: true });

customerSettingsRouter.use(authenticate);

const asOfQuerySchema = z.object({ asOf: z.string().optional() });

customerSettingsRouter.get("/", authorize("master.read"), async (req, res, next) => {
  try {
    const { asOf } = asOfQuerySchema.parse(req.query);
    const customerId = BigInt(paramId(req.params.customerId));
    const setting = await resolveCustomerSetting(customerId, asOf ? new Date(asOf) : new Date());
    sendData(res, setting);
  } catch (error) {
    next(error);
  }
});

customerSettingsRouter.get("/history", authorize("master.read"), async (req, res, next) => {
  try {
    const customerId = BigInt(paramId(req.params.customerId));
    const history = await getCustomerSettingHistory(customerId);
    sendData(res, history);
  } catch (error) {
    next(error);
  }
});

customerSettingsRouter.put("/", authorize("master.customer.update"), async (req, res, next) => {
  try {
    const input = customerSettingSchema.parse(req.body);
    const customerId = BigInt(paramId(req.params.customerId));
    const updated = await updateCustomerSetting({
      ctx: req.context!,
      customerId,
      value: input.settings,
      validFrom: new Date(input.validFrom),
      reason: input.reason,
    });
    sendData(res, updated, 201);
  } catch (error) {
    next(error);
  }
});
