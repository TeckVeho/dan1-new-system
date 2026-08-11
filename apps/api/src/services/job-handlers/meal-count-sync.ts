import { prisma } from "@dan1/database";
import type { JobHandler } from "./index.js";

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type MealAggregate = { customerId: bigint; serviceDate: Date; totalMeals: number };

export const handleMealCountSync: JobHandler = async (job, { setProgress }) => {
  const params = (job.params ?? {}) as Record<string, unknown>;
  const dateFrom = new Date(String(params.dateFrom));
  const dateTo = new Date(String(params.dateTo));

  await setProgress(10, "食数を集計中");

  const mealOrders = await prisma.mealOrder.groupBy({
    by: ["customerId", "serviceDate"],
    where: {
      serviceDate: { gte: dateFrom, lte: dateTo },
      status: { in: ["provisional", "confirmed"] },
    },
    _sum: { quantity: true },
  });

  const aggregates: MealAggregate[] = mealOrders
    .map((row) => ({
      customerId: row.customerId,
      serviceDate: row.serviceDate,
      totalMeals: row._sum.quantity ?? 0,
    }))
    .filter((row) => row.totalMeals > 0);

  await setProgress(40, "発注スケジュールへ反映中");

  const schedules = await prisma.orderSchedule.findMany({
    where: { deliveryDate: { gte: dateFrom, lte: dateTo } },
    select: { id: true, deliveryDate: true },
  });

  const schedulesByDate = new Map<string, bigint[]>();
  for (const schedule of schedules) {
    const key = dateKey(schedule.deliveryDate);
    const list = schedulesByDate.get(key) ?? [];
    list.push(schedule.id);
    schedulesByDate.set(key, list);
  }

  let referenceCount = 0;
  for (const agg of aggregates) {
    const scheduleIds = schedulesByDate.get(dateKey(agg.serviceDate)) ?? [];
    if (scheduleIds.length === 0) continue;

    for (const scheduleId of scheduleIds) {
      await prisma.orderScheduleReference.deleteMany({
        where: { orderScheduleId: scheduleId, customerId: agg.customerId },
      });
      await prisma.orderScheduleReference.create({
        data: {
          orderScheduleId: scheduleId,
          customerId: agg.customerId,
          referenceDate: agg.serviceDate,
          referenceQty: agg.totalMeals,
          fallbackUsed: false,
        },
      });
      referenceCount += 1;
    }
  }

  await setProgress(90, "同期結果を集計中");

  const byDate = aggregates.reduce<Map<string, number>>((map, row) => {
    const key = dateKey(row.serviceDate);
    map.set(key, (map.get(key) ?? 0) + row.totalMeals);
    return map;
  }, new Map());

  const byDateList = [...byDate.entries()]
    .map(([date, totalMeals]) => ({ date, totalMeals }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalMeals = byDateList.reduce((sum, d) => sum + d.totalMeals, 0);

  return {
    dateFrom: dateKey(dateFrom),
    dateTo: dateKey(dateTo),
    totalMeals,
    customerCount: aggregates.length,
    referenceCount,
    byDate: byDateList,
  };
};
