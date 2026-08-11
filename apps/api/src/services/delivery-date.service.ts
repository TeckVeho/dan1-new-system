import { prisma } from "@dan1/database";
import { NotFoundError } from "../lib/errors.js";
import { calculateDeliveryDates } from "../lib/delivery-date.js";
import { resolveEffectiveDated } from "./settings.service.js";

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function loadHolidaySet(from: Date, to: Date): Promise<Set<string>> {
  const holidays = await prisma.businessCalendar.findMany({
    where: { isHoliday: true, calDate: { gte: from, lte: to } },
    select: { calDate: true },
  });
  return new Set(holidays.map((h) => dateKey(h.calDate)));
}

export async function resolveCustomerProductionPattern(customerId: bigint, asOf: Date) {
  const assignments = await prisma.customerProductionPattern.findMany({
    where: { customerId },
    include: { productionPattern: true },
  });
  const assignment = resolveEffectiveDated(assignments, asOf);
  return assignment?.productionPattern ?? null;
}

export type PreviewDeliveryDatesInput = {
  customerId: bigint;
  serviceDate: Date;
};

export async function previewDeliveryDates(input: PreviewDeliveryDatesInput) {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new NotFoundError("施設が見つかりません");

  const pattern = await resolveCustomerProductionPattern(input.customerId, input.serviceDate);
  if (!pattern) {
    throw new NotFoundError("指定日に有効な製造パターンが割り当てられていません");
  }

  const from = new Date(input.serviceDate);
  from.setUTCDate(from.getUTCDate() - 10);
  const to = new Date(input.serviceDate);
  to.setUTCDate(to.getUTCDate() + 5);
  const holidaySet = await loadHolidaySet(from, to);

  const dates = calculateDeliveryDates(input.serviceDate, pattern, holidaySet);

  return {
    customer: { id: customer.id, name: customer.name, customerCode: customer.customerCode },
    pattern: { id: pattern.id, code: pattern.code, name: pattern.name, leadDays: pattern.leadDays },
    ...dates,
  };
}
