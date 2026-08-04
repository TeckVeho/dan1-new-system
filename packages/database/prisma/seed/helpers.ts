import { randomBytes, scryptSync } from "node:crypto";
import type { MealOrderStatus } from "@prisma/client";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** UTC 日付（DB の @db.Date と整合） */
export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** 当週月曜（UTC） */
export function getWeekStart(from = new Date()): Date {
  const weekday = from.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  return utcDate(from.getUTCFullYear(), from.getUTCMonth() + 1, from.getUTCDate() + mondayOffset);
}

export function weekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export type MealOrderSeed = {
  unitId: bigint;
  customerId: bigint;
  serviceDate: Date;
  mealTypeId: bigint;
  menuKindId: bigint;
  orderTypeId: bigint;
  quantity: number;
  status: MealOrderStatus;
};
