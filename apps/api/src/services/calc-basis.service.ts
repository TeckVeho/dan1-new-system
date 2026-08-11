import { prisma } from "@dan1/database";
import { NotFoundError } from "../lib/errors.js";
import { parseReferenceRuleConfig, resolveLookbackDays } from "../lib/reference-rule-resolver.js";
import { resolveEffectiveDated } from "./settings.service.js";

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function resolveLatestRiceQuantity(input: {
  customerId: bigint;
  serviceDate: Date;
  lookbackDays?: number;
}) {
  const from = new Date(input.serviceDate);
  from.setUTCDate(from.getUTCDate() - (input.lookbackDays ?? 14));

  const riceOrder = await prisma.riceOrder.findFirst({
    where: {
      customerId: input.customerId,
      serviceDate: { gte: from, lte: input.serviceDate },
      status: { in: ["provisional", "confirmed"] },
      quantity: { gt: 0 },
    },
    orderBy: { serviceDate: "desc" },
    include: { unit: { select: { name: true } } },
  });

  if (!riceOrder) {
    return { quantity: null, referenceDate: null, fallbackUsed: true };
  }

  const fallbackUsed = riceOrder.serviceDate.getTime() !== input.serviceDate.getTime();
  return {
    quantity: riceOrder.quantity,
    referenceDate: dateKey(riceOrder.serviceDate),
    fallbackUsed,
    unitName: riceOrder.unit.name,
  };
}

export async function getScheduleCalcBasis(scheduleId: bigint) {
  const schedule = await prisma.orderSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      stockItem: { select: { id: true, name: true, itemCode: true, unit: true } },
      supplier: { select: { id: true, name: true } },
      references: {
        include: {
          orderSchedule: false,
        },
        orderBy: { referenceDate: "asc" },
      },
    },
  });
  if (!schedule) throw new NotFoundError("発注スケジュールが見つかりません");

  const customerIds = [...new Set(schedule.references.map((r) => r.customerId))];
  const customers = customerIds.length
    ? await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, customerCode: true, name: true },
      })
    : [];
  const customerMap = new Map(customers.map((c) => [c.id.toString(), c]));

  const referenceDetails = await Promise.all(
    schedule.references.map(async (ref) => {
      const customer = customerMap.get(ref.customerId.toString());
      const rules = await prisma.customerReferenceRule.findMany({
        where: { customerId: ref.customerId },
        include: { referenceRule: true },
      });
      const activeRule = resolveEffectiveDated(rules, ref.referenceDate);
      const config = parseReferenceRuleConfig(activeRule?.referenceRule.ruleConfig);
      const rice = await resolveLatestRiceQuantity({
        customerId: ref.customerId,
        serviceDate: ref.referenceDate,
        lookbackDays: resolveLookbackDays(config),
      });

      return {
        customerId: ref.customerId.toString(),
        customerCode: customer?.customerCode ?? null,
        customerName: customer?.name ?? null,
        referenceDate: dateKey(ref.referenceDate),
        referenceQty: ref.referenceQty.toString(),
        fallbackUsed: ref.fallbackUsed,
        ruleCode: activeRule?.referenceRule.code ?? null,
        ruleName: activeRule?.referenceRule.name ?? null,
        latestRice: rice,
      };
    }),
  );

  return {
    schedule: {
      id: schedule.id.toString(),
      deliveryDate: dateKey(schedule.deliveryDate),
      orderQuantity: schedule.orderQuantity.toString(),
      stockQuantity: schedule.stockQuantity?.toString() ?? null,
      status: schedule.status,
    },
    stockItem: schedule.stockItem,
    supplier: schedule.supplier,
    calcSnapshot: schedule.calcSnapshot,
    references: referenceDetails,
  };
}
