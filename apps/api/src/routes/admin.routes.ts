import { Router } from "express";
import {
  systemSettingsSchema,
  internalUserCreateSchema,
  internalUserUpdateSchema,
  facilityUserCreateSchema,
  facilityUserUpdateSchema,
  adminPasswordResetSchema,
  rolePermissionsUpdateSchema,
} from "@dan1/shared";
import { authenticate, authorize } from "../middleware/auth.js";
import { sendData } from "../lib/response.js";
import { getSystemSettings, updateSystemSettings } from "../services/system-settings.service.js";
import {
  listUsers,
  createInternalUser,
  updateInternalUser,
  deleteInternalUser,
  createFacilityUser,
  updateFacilityUser,
  deleteFacilityUser,
  resetUserPassword,
} from "../services/user-admin.service.js";
import { listRoles, listPermissions, updateRolePermissions } from "../services/role-admin.service.js";

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

adminRouter.get("/users", authenticate, authorize("admin.user.read"), async (req, res, next) => {
  try {
    const type = req.query.type === "facility" ? "facility" : req.query.type === "internal" ? "internal" : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 30)));
    sendData(res, await listUsers({ type, search, page, pageSize }));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/users/internal", authenticate, authorize("admin.user.create"), async (req, res, next) => {
  try {
    const input = internalUserCreateSchema.parse(req.body);
    sendData(res, await createInternalUser(req.context!, input), 201);
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/users/internal/:id", authenticate, authorize("admin.user.update"), async (req, res, next) => {
  try {
    const input = internalUserUpdateSchema.parse(req.body);
    sendData(res, await updateInternalUser(req.context!, BigInt(String(req.params.id)), input));
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/users/internal/:id", authenticate, authorize("admin.user.update"), async (req, res, next) => {
  try {
    await deleteInternalUser(req.context!, BigInt(String(req.params.id)));
    sendData(res, { ok: true });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/users/facility", authenticate, authorize("admin.user.create"), async (req, res, next) => {
  try {
    const input = facilityUserCreateSchema.parse(req.body);
    sendData(res, await createFacilityUser(req.context!, input), 201);
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/users/facility/:id", authenticate, authorize("admin.user.update"), async (req, res, next) => {
  try {
    const input = facilityUserUpdateSchema.parse(req.body);
    sendData(res, await updateFacilityUser(req.context!, BigInt(String(req.params.id)), input));
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/users/facility/:id", authenticate, authorize("admin.user.update"), async (req, res, next) => {
  try {
    await deleteFacilityUser(req.context!, BigInt(String(req.params.id)));
    sendData(res, { ok: true });
  } catch (error) {
    next(error);
  }
});

adminRouter.post(
  "/users/:type/:id/reset-password",
  authenticate,
  authorize("admin.user.update"),
  async (req, res, next) => {
    try {
      const type = req.params.type === "facility" ? "facility" : "internal";
      const input = adminPasswordResetSchema.parse(req.body ?? {});
      sendData(res, await resetUserPassword(req.context!, type, BigInt(String(req.params.id)), input));
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get("/roles", authenticate, authorize("admin.user.read"), async (_req, res, next) => {
  try {
    sendData(res, await listRoles());
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/permissions", authenticate, authorize("admin.role.update"), async (_req, res, next) => {
  try {
    sendData(res, await listPermissions());
  } catch (error) {
    next(error);
  }
});

adminRouter.put(
  "/roles/:id/permissions",
  authenticate,
  authorize("admin.role.update"),
  async (req, res, next) => {
    try {
      const input = rolePermissionsUpdateSchema.parse(req.body);
      sendData(res, await updateRolePermissions(BigInt(String(req.params.id)), input));
    } catch (error) {
      next(error);
    }
  },
);
