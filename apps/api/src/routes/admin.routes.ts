import { Router } from "express";
import { systemSettingsSchema } from "@dan1/shared";
import { authenticate, authorize } from "../middleware/auth.js";
import { sendData } from "../lib/response.js";
import { getSystemSettings, updateSystemSettings } from "../services/system-settings.service.js";

export const adminRouter = Router();

adminRouter.get(
  "/settings",
  authenticate,
  authorize("admin.settings.read"),
  async (_req, res, next) => {
    try {
      sendData(res, await getSystemSettings());
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.put(
  "/settings",
  authenticate,
  authorize("admin.settings.update"),
  async (req, res, next) => {
    try {
      const input = systemSettingsSchema.parse(req.body);
      sendData(res, await updateSystemSettings(req.context!, input));
    } catch (error) {
      next(error);
    }
  },
);
