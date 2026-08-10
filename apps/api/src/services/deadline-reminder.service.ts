import { prisma } from "@dan1/database";
import { resolveDeadlinesForRange } from "./deadline.service.js";
import { createNotificationsForCustomerUsers } from "./notification.service.js";

const REMINDER_WINDOW_MS = 60 * 60 * 1000;

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Sends in-app reminders to facility users whose next deadline is within one hour.
 */
export async function runDeadlineReminders(): Promise<{ notified: number }> {
  const now = Date.now();
  const horizon = new Date(now + REMINDER_WINDOW_MS);
  const customers = await prisma.customer.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true },
  });

  let notified = 0;

  for (const customer of customers) {
    const dateRange: Date[] = [];
    for (let i = 0; i < 14; i++) {
      const d = utcDateOnly(new Date(now + i * 86400000));
      dateRange.push(d);
    }
    const deadlines = await resolveDeadlinesForRange(dateRange, customer.id, "normal");

    let nearest: { deadlineAt: Date; serviceDate: string } | null = null;
    for (const [serviceDate, resolved] of deadlines) {
      if (!resolved) continue;
      const t = resolved.deadlineAt.getTime();
      if (t > now && t <= horizon.getTime()) {
        if (!nearest || t < nearest.deadlineAt.getTime()) {
          nearest = { deadlineAt: resolved.deadlineAt, serviceDate };
        }
      }
    }

    if (!nearest) continue;

    const draftCount = await prisma.mealOrder.count({
      where: {
        customerId: customer.id,
        status: "draft",
        serviceDate: { gte: utcDateOnly(new Date()) },
      },
    });

    if (draftCount === 0) continue;

    const deadlineLabel = nearest.deadlineAt.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const count = await createNotificationsForCustomerUsers(customer.id, {
      title: "注文締切が近づいています",
      body: `${customer.name}：${deadlineLabel} までに注文の確定が必要です（下書き ${draftCount} 件）`,
      category: "deadline_reminder",
      linkUrl: "/orders/weekly",
    });
    notified += count;
  }

  return { notified };
}
