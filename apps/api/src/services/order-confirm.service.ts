import { prisma } from "@dan1/database";
import { resolveDeadlinesForRange } from "./deadline.service.js";

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * Moves provisional meal orders past their deadline to confirmed status.
 */
export async function confirmProvisionalOrdersPastDeadline(): Promise<{ confirmed: number }> {
  const now = Date.now();
  const provisional = await prisma.mealOrder.findMany({
    where: { status: "provisional" },
    select: {
      id: true,
      customerId: true,
      serviceDate: true,
      quantity: true,
      provisionalQuantity: true,
    },
  });

  if (provisional.length === 0) return { confirmed: 0 };

  const byCustomer = new Map<string, typeof provisional>();
  for (const order of provisional) {
    const key = order.customerId.toString();
    const list = byCustomer.get(key) ?? [];
    list.push(order);
    byCustomer.set(key, list);
  }

  const toConfirm: bigint[] = [];

  for (const [customerIdStr, orders] of byCustomer) {
    const customerId = BigInt(customerIdStr);
    const dates = [...new Set(orders.map((o) => o.serviceDate))];
    const deadlines = await resolveDeadlinesForRange(dates, customerId, "normal");

    for (const order of orders) {
      const resolved = deadlines.get(toDateOnly(order.serviceDate));
      if (resolved && resolved.deadlineAt.getTime() <= now) {
        toConfirm.push(order.id);
      }
    }
  }

  if (toConfirm.length === 0) return { confirmed: 0 };

  await prisma.$transaction(async (tx) => {
    for (const id of toConfirm) {
      const order = provisional.find((o) => o.id === id);
      if (!order) continue;
      await tx.mealOrder.update({
        where: { id },
        data: {
          status: "confirmed",
          confirmedAt: new Date(),
          provisionalQuantity: order.provisionalQuantity ?? order.quantity,
        },
      });
    }
  });

  return { confirmed: toConfirm.length };
}
