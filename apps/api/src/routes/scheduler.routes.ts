import { Router } from "express";
import { schedulerAuth } from "../middleware/schedulerAuth.js";
import { sendData } from "../lib/response.js";
import { confirmProvisionalOrdersPastDeadline } from "../services/order-confirm.service.js";
import { runDeadlineReminders } from "../services/deadline-reminder.service.js";
import { getUnenteredFacilities } from "../services/orders.service.js";
import { createNotificationsForInternalUsers } from "../services/notification.service.js";
import { runUnacceptableOrderAlerts } from "../services/order-alert.service.js";

export const schedulerRouter = Router();

schedulerRouter.use(schedulerAuth);

schedulerRouter.post("/confirm-orders", async (_req, res, next) => {
  try {
    const result = await confirmProvisionalOrdersPastDeadline();
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});

schedulerRouter.post("/deadline-reminders", async (_req, res, next) => {
  try {
    const result = await runDeadlineReminders();
    sendData(res, result);
  } catch (error) {
    next(error);
  }
});

schedulerRouter.post("/unentered-alerts", async (_req, res, next) => {
  try {
    const today = new Date();
    const weekEnd = new Date(today.getTime());
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const { alerts } = await getUnenteredFacilities({
      serviceDateFrom: today,
      serviceDateTo: weekEnd,
    });

    let notified = 0;
    if (alerts.length > 0) {
      notified = await createNotificationsForInternalUsers("order_alert.read", {
        title: "未入力施設アラート",
        body: `今後7日間で未入力の施設が ${alerts.length} 件あります`,
        category: "unentered_alert",
        linkUrl: "/orders/alerts",
      });
    }

    sendData(res, { alertCount: alerts.length, notified });
  } catch (error) {
    next(error);
  }
});

schedulerRouter.post("/unacceptable-order-alerts", async (_req, res, next) => {
  try {
    const today = new Date();
    const weekEnd = new Date(today.getTime());
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const { alertCount, alerts } = await runUnacceptableOrderAlerts(today, weekEnd);

    let notified = 0;
    if (alertCount > 0) {
      notified = await createNotificationsForInternalUsers("order_alert.read", {
        title: "受けられない注文アラート",
        body: `今後7日間で受けられない注文が ${alertCount} 件あります`,
        category: "order_alert",
        linkUrl: "/dashboard/alerts?tab=unacceptable",
      });
    }

    sendData(res, { alertCount, notified, alerts });
  } catch (error) {
    next(error);
  }
});
