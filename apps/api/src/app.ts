import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { requestId } from "./middleware/requestId.js";
import { auditContext } from "./middleware/auditContext.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.routes.js";
import { mastersRouter } from "./routes/masters/index.js";
import { ordersRouter } from "./routes/orders/index.js";
import { documentsRouter } from "./routes/documents/index.js";
import { procurementRouter } from "./routes/procurement/index.js";
import { auditLogsRouter } from "./routes/audit-logs.routes.js";
import { jobsRouter } from "./routes/jobs.routes.js";
import { notificationsRouter } from "./routes/notifications.routes.js";
import { announcementsRouter } from "./routes/announcements.routes.js";
import { orderWindowsRouter } from "./routes/order-windows.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { filesRouter } from "./routes/files.routes.js";
import { schedulerRouter } from "./routes/scheduler.routes.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);

  app.use(requestId);
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "5mb" }));
  app.use(cookieParser());
  app.use(auditContext);

  app.use(healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/masters", mastersRouter);
  app.use("/api/v1/orders", ordersRouter);
  app.use("/api/v1/order-windows", orderWindowsRouter);
  app.use("/api/v1/documents", documentsRouter);
  app.use("/api/v1/procurement", procurementRouter);
  app.use("/api/v1/audit-logs", auditLogsRouter);
  app.use("/api/v1/jobs", jobsRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1/announcements", announcementsRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/v1/files", filesRouter);
  app.use("/api/v1/internal/scheduler", schedulerRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
