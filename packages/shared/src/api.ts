export function serializeBigInt<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v)),
  ) as T;
}

export function ok<T>(data: T) {
  return { success: true as const, data: serializeBigInt(data) };
}

export function fail(code: string, message: string, details?: unknown) {
  return { success: false as const, error: { code, message, details } };
}
