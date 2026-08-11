export type ProductionPatternOffsets = {
  leadDays: number;
  pickupOffsetD0: number;
  pickupOffsetD1: number;
  pickupOffsetD2: number;
  pickupOffsetD3: number;
  arrivalOffsetD1: number;
  arrivalOffsetD2: number;
  arrivalOffsetD3: number;
};

export type DeliveryDateResult = {
  serviceDate: string;
  manufacturingDate: string;
  pickupDate: string;
  arrivalDate: string;
  warnings: string[];
};

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addCalendarDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function isHoliday(date: Date, holidaySet: Set<string>): boolean {
  return holidaySet.has(dateKey(date));
}

/** 非営業日なら前営業日へ前倒し */
export function adjustBackwardToBusinessDay(date: Date, holidaySet: Set<string>): Date {
  let adjusted = new Date(date.getTime());
  while (isHoliday(adjusted, holidaySet)) {
    adjusted = addCalendarDays(adjusted, -1);
  }
  return adjusted;
}

/** 非営業日なら翌営業日へ後倒し */
export function adjustForwardToBusinessDay(date: Date, holidaySet: Set<string>): Date {
  let adjusted = new Date(date.getTime());
  while (isHoliday(adjusted, holidaySet)) {
    adjusted = addCalendarDays(adjusted, 1);
  }
  return adjusted;
}

function pickupOffsetDays(pattern: ProductionPatternOffsets): number {
  return pattern.pickupOffsetD0;
}

function arrivalOffsetDays(pattern: ProductionPatternOffsets): number {
  return pattern.arrivalOffsetD1;
}

/**
 * FR-505. 喫食日から製造日・集荷日・着日を逆算する。
 * docs/06_master_management_spec.md §5.4 の営業日調整に従う。
 */
export function calculateDeliveryDates(
  serviceDate: Date,
  pattern: ProductionPatternOffsets,
  holidaySet: Set<string> = new Set(),
): DeliveryDateResult {
  const warnings: string[] = [];

  let manufacturingDate = addCalendarDays(serviceDate, -pattern.leadDays);
  manufacturingDate = adjustBackwardToBusinessDay(manufacturingDate, holidaySet);

  let pickupDate = addCalendarDays(manufacturingDate, pickupOffsetDays(pattern));
  pickupDate = adjustBackwardToBusinessDay(pickupDate, holidaySet);

  let arrivalDate = addCalendarDays(manufacturingDate, arrivalOffsetDays(pattern));
  arrivalDate = adjustForwardToBusinessDay(arrivalDate, holidaySet);

  if (arrivalDate.getTime() > serviceDate.getTime()) {
    warnings.push("着日が喫食日を超えています。製造パターンまたは営業日カレンダーを確認してください");
  }

  return {
    serviceDate: dateKey(serviceDate),
    manufacturingDate: dateKey(manufacturingDate),
    pickupDate: dateKey(pickupDate),
    arrivalDate: dateKey(arrivalDate),
    warnings,
  };
}
