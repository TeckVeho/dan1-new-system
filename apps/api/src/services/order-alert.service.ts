import { prisma } from "@dan1/database";

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type UnacceptableOrderReason = "allergen_only" | "zero_basic_with_allergen";

export type UnacceptableOrderAlert = {
  customerId: string;
  customerCode: string;
  customerName: string;
  serviceDate: string;
  reasons: UnacceptableOrderReason[];
  mealCount: number;
  allergenCount: number;
  riceCount: number;
};

export type UnacceptableOrdersQuery = {
  serviceDateFrom: Date;
  serviceDateTo: Date;
};

type CustomerInfo = { id: bigint; customerCode: string; name: string };

export function buildUnacceptableOrderAlerts(input: {
  mealByKey: Map<string, number>;
  allergenByKey: Map<string, number>;
  riceByKey: Map<string, number>;
  customers: CustomerInfo[];
}): UnacceptableOrderAlert[] {
  const customerMap = new Map(input.customers.map((c) => [c.id.toString(), c]));
  const alerts: UnacceptableOrderAlert[] = [];

  for (const [key, allergenCount] of input.allergenByKey) {
    const mealCount = input.mealByKey.get(key) ?? 0;
    const riceCount = input.riceByKey.get(key) ?? 0;
    if (mealCount > 0) continue;

    const [customerId, serviceDate] = key.split(":");
    const customer = customerMap.get(customerId!);
    if (!customer) continue;

    const reasons: UnacceptableOrderReason[] = [];
    if (allergenCount > 0 && mealCount === 0) {
      reasons.push(riceCount === 0 ? "allergen_only" : "zero_basic_with_allergen");
    }
    if (reasons.length === 0) continue;

    alerts.push({
      customerId: customer.id.toString(),
      customerCode: customer.customerCode,
      customerName: customer.name,
      serviceDate: serviceDate!,
      reasons,
      mealCount,
      allergenCount,
      riceCount,
    });
  }

  alerts.sort((a, b) => a.serviceDate.localeCompare(b.serviceDate) || a.customerCode.localeCompare(b.customerCode));
  return alerts;
}

/**
 * 仮注文締切後に確認すべき「受けられない注文」を検知する。
 * - allergen_only: 基本食数が未入力だがアレルギー注文がある
 * - zero_basic_with_allergen: 基本食数が0だがアレルギー注文がある
 */
export async function detectUnacceptableOrders(query: UnacceptableOrdersQuery) {
  const [mealOrders, allergenOrders, riceOrders, customers] = await Promise.all([
    prisma.mealOrder.findMany({
      where: {
        serviceDate: { gte: query.serviceDateFrom, lte: query.serviceDateTo },
        status: { in: ["provisional", "confirmed"] },
      },
      select: { customerId: true, serviceDate: true, quantity: true },
    }),
    prisma.allergenOrder.findMany({
      where: {
        serviceDate: { gte: query.serviceDateFrom, lte: query.serviceDateTo },
        quantity: { gt: 0 },
      },
      select: { customerId: true, serviceDate: true, quantity: true },
    }),
    prisma.riceOrder.findMany({
      where: {
        serviceDate: { gte: query.serviceDateFrom, lte: query.serviceDateTo },
        status: { in: ["provisional", "confirmed"] },
        quantity: { gt: 0 },
      },
      select: { customerId: true, serviceDate: true, quantity: true },
    }),
    prisma.customer.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, customerCode: true, name: true },
    }),
  ]);

  const mealByKey = new Map<string, number>();
  for (const row of mealOrders) {
    const key = `${row.customerId}:${dateKey(row.serviceDate)}`;
    mealByKey.set(key, (mealByKey.get(key) ?? 0) + row.quantity);
  }

  const allergenByKey = new Map<string, number>();
  for (const row of allergenOrders) {
    const key = `${row.customerId}:${dateKey(row.serviceDate)}`;
    allergenByKey.set(key, (allergenByKey.get(key) ?? 0) + row.quantity);
  }

  const riceByKey = new Map<string, number>();
  for (const row of riceOrders) {
    const key = `${row.customerId}:${dateKey(row.serviceDate)}`;
    riceByKey.set(key, (riceByKey.get(key) ?? 0) + row.quantity);
  }

  const alerts = buildUnacceptableOrderAlerts({ mealByKey, allergenByKey, riceByKey, customers });

  return { alerts, count: alerts.length };
}

export async function runUnacceptableOrderAlerts(serviceDateFrom: Date, serviceDateTo: Date) {
  const { alerts } = await detectUnacceptableOrders({ serviceDateFrom, serviceDateTo });
  return { alertCount: alerts.length, alerts };
}
