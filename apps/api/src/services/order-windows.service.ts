import { resolveDeadlinesForRange } from "./deadline.service.js";

function toDateOnly(value: string | Date): Date {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function datesInRange(from: string, to: string): Date[] {
  const start = toDateOnly(from);
  const end = toDateOnly(to);
  const dates: Date[] = [];
  for (let d = new Date(start); d.getTime() <= end.getTime(); d = addDays(d, 1)) {
    dates.push(new Date(d));
  }
  return dates;
}

function mapOrderTypeCode(orderType: string): string | undefined {
  const mapped: Record<string, string> = {
    provisional: "normal",
    change: "normal",
    rice: "normal",
    allergen: "normal",
    new_year: "new_year",
    special: "special",
  };
  return mapped[orderType] ?? orderType;
}

function formatServiceDateLabel(dateStr: string): string {
  const d = toDateOnly(dateStr);
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
}

export type OrderWindowsQuery = {
  customerId?: bigint;
  unitId?: bigint;
  orderType: string;
  from: string;
  to: string;
};

export type OrderWindowDay = {
  serviceDate: string;
  deadlineAt: string | null;
  editable: boolean;
  isException: boolean;
  exceptionReason?: string;
};

export type OrderWindowsResult = {
  orderType: string;
  nextDeadline: {
    serviceDateFrom: string;
    serviceDateTo: string;
    deadlineAt: string;
    remainingSeconds: number;
    isException: boolean;
    source: string;
  };
  windows: OrderWindowDay[];
  changeWindow?: {
    serviceDateFrom: string;
    serviceDateTo: string;
    message: string;
  };
};

export async function getOrderWindows(query: OrderWindowsQuery): Promise<OrderWindowsResult> {
  const dates = datesInRange(query.from, query.to);
  const orderTypeCode = mapOrderTypeCode(query.orderType);
  const deadlineMap = await resolveDeadlinesForRange(dates, query.customerId, orderTypeCode);

  const windows: OrderWindowDay[] = dates.map((date) => {
    const key = date.toISOString().slice(0, 10);
    const resolved = deadlineMap.get(key);
    const deadlineAt = resolved?.deadlineAt.toISOString() ?? null;
    return {
      serviceDate: key,
      deadlineAt,
      editable: resolved ? resolved.deadlineAt.getTime() > Date.now() : true,
      isException: resolved?.isException ?? false,
      exceptionReason: resolved?.exceptionReason,
    };
  });

  const now = Date.now();
  const withDeadline = windows.filter((w) => w.deadlineAt);
  const futureWindows = withDeadline
    .filter((w) => new Date(w.deadlineAt!).getTime() > now)
    .sort((a, b) => new Date(a.deadlineAt!).getTime() - new Date(b.deadlineAt!).getTime());

  const nextWindow = futureWindows[0] ?? withDeadline[0];
  const nextResolved = nextWindow ? deadlineMap.get(nextWindow.serviceDate) : null;
  const nextDeadlineAt = nextWindow?.deadlineAt ?? new Date().toISOString();

  const nextDeadline = {
    serviceDateFrom: query.from,
    serviceDateTo: query.to,
    deadlineAt: nextDeadlineAt,
    remainingSeconds: Math.max(0, Math.floor((new Date(nextDeadlineAt).getTime() - now) / 1000)),
    isException: nextResolved?.isException ?? false,
    source: nextResolved?.source ?? "global",
  };

  let changeWindow: OrderWindowsResult["changeWindow"];
  if (query.orderType === "change") {
    const editableDays = windows.filter((w) => w.editable);
    if (editableDays.length > 0) {
      const from = editableDays[0].serviceDate;
      const to = editableDays[editableDays.length - 1].serviceDate;
      changeWindow = {
        serviceDateFrom: from,
        serviceDateTo: to,
        message: `${formatServiceDateLabel(from)} 〜 ${formatServiceDateLabel(to)} 喫食分が変更可能です`,
      };
    }
  }

  return {
    orderType: query.orderType,
    nextDeadline,
    windows,
    ...(changeWindow ? { changeWindow } : {}),
  };
}
