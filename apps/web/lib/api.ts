import { getApiBase } from "./auth";
import type {
  AuditLog,
  Customer,
  DeadlineException,
  DeadlineRule,
  DocumentItem,
  ImportRecord,
  MenuTemplate,
  OrderListItem,
  OrderWindowInfo,
  Paginated,
  PlatingInstruction,
  ScheduleResponse,
  SwallowCategory,
  WeeklyOrdersResponse,
} from "./types";

const API_BASE = getApiBase();
const V1 = `${API_BASE}/api/v1`;

export class ApiError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${V1}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok || body?.success === false) {
    const err = body?.error ?? {};
    throw new ApiError(
      res.status,
      err.code ?? "UNKNOWN_ERROR",
      err.message ?? `通信に失敗しました (HTTP ${res.status})`,
      err.details,
    );
  }

  return (body?.data ?? body) as T;
}

function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

// --- 注文 ---

export async function getOrderWindows(params: {
  orderType: string;
  from: string;
  to: string;
  unitId?: string;
  customerId?: string;
}): Promise<OrderWindowInfo> {
  const body = await request<{ nextDeadline: OrderWindowInfo }>(
    `/order-windows${qs(params)}`,
  );
  return body.nextDeadline;
}

export async function getWeeklyOrders(params: {
  weekStart: string;
  unitId?: string;
  customerId?: string;
}): Promise<WeeklyOrdersResponse> {
  return request<WeeklyOrdersResponse>(`/orders/weekly${qs(params)}`);
}

export async function saveWeeklyOrders(payload: {
  weekStart: string;
  customerId?: string;
  commit: boolean;
  cells: {
    unitId: string;
    serviceDate: string;
    mealTypeId: string;
    menuKindId: string;
    quantity: number;
    version: number | null;
  }[];
}): Promise<{ saved: number }> {
  return request<{ saved: number }>(`/orders/weekly`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getOrders(params: {
  customerId?: string;
  serviceDateFrom?: string;
  serviceDateTo?: string;
  page?: number;
  perPage?: number;
}): Promise<Paginated<OrderListItem>> {
  return request<Paginated<OrderListItem>>(`/orders${qs(params)}`);
}

export async function patchOrder(
  id: string,
  payload: { quantity: number; reason?: string; version: number },
): Promise<OrderListItem> {
  return request<OrderListItem>(`/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// --- マスタ共通 CRUD ---

export type MasterResource =
  | "swallow-categories"
  | "customers"
  | "deadline-rules"
  | "deadline-exceptions"
  | "setout-directions";

export async function getMasterList<T>(
  resource: MasterResource,
  params: { page?: number; pageSize?: number; search?: string; includeInactive?: boolean } = {},
): Promise<Paginated<T>> {
  return request<Paginated<T>>(`/masters/${resource}${qs(params)}`);
}

export async function createMaster<T>(resource: MasterResource, payload: unknown): Promise<T> {
  return request<T>(`/masters/${resource}`, { method: "POST", body: JSON.stringify(payload) });
}

export async function updateMaster<T>(
  resource: MasterResource,
  id: string,
  payload: unknown,
): Promise<T> {
  return request<T>(`/masters/${resource}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteMaster(resource: MasterResource, id: string): Promise<void> {
  await request<void>(`/masters/${resource}/${id}`, { method: "DELETE" });
}

export const getSwallowCategories = (params?: { page?: number; pageSize?: number; search?: string }) =>
  getMasterList<SwallowCategory>("swallow-categories", params);

export const getCustomers = (params?: { page?: number; pageSize?: number; search?: string }) =>
  getMasterList<Customer>("customers", params);

export const getDeadlineRules = (params?: { page?: number; pageSize?: number; search?: string }) =>
  getMasterList<DeadlineRule>("deadline-rules", params);

export const getDeadlineExceptions = (params?: { page?: number; pageSize?: number; search?: string }) =>
  getMasterList<DeadlineException>("deadline-exceptions", params);

// --- 資料・帳票 ---

export async function getDocuments(params: {
  customerId?: string;
  documentType?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<DocumentItem>> {
  return request<Paginated<DocumentItem>>(`/documents${qs(params)}`);
}

export const getMenuTemplates = (params?: { page?: number; pageSize?: number; search?: string }) =>
  getMasterList<MenuTemplate>("setout-directions", params);

export async function getPlatingInstructions(params: {
  customerId?: string;
  serviceDateFrom?: string;
  serviceDateTo?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<PlatingInstruction>> {
  return request<Paginated<PlatingInstruction>>(`/setout-instructions${qs(params)}`);
}

// --- 発注・在庫 ---

export async function getProcurementSchedule(params: {
  supplierId: string;
  deliveryDateFrom: string;
  deliveryDateTo: string;
  itemQuery?: string;
  categoryId?: string;
  shortageOnly?: boolean;
  mode?: "detail" | "simple";
  page?: number;
  perPage?: number;
}): Promise<ScheduleResponse> {
  return request<ScheduleResponse>(`/procurement/schedules${qs(params)}`);
}

export async function patchScheduleCell(
  id: string,
  payload: { orderQty?: string; actualStock?: string; version: number },
): Promise<{ id: string; version: number }> {
  return request<{ id: string; version: number }>(`/procurement/schedules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getProcurementImports(params: {
  page?: number;
  pageSize?: number;
}): Promise<Paginated<ImportRecord>> {
  return request<Paginated<ImportRecord>>(`/procurement/imports${qs(params)}`);
}

export async function postProcurementImport(payload: {
  importType: string;
  supplierId: string;
  fileId: string;
  targetDateFrom: string;
  targetDateTo: string;
}): Promise<{ importId: string; jobId: string; status: string }> {
  return request<{ importId: string; jobId: string; status: string }>(`/procurement/imports`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// --- 管理 ---

export async function getAuditLogs(params: {
  actorType?: string;
  entityType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<AuditLog>> {
  return request<Paginated<AuditLog>>(`/audit-logs${qs(params)}`);
}

export type SystemSettings = {
  brandName: string;
  supportEmail: string;
  sessionTimeoutMinutes: number;
  maintenanceMode: boolean;
};

export async function getSystemSettings(): Promise<SystemSettings> {
  return request<SystemSettings>(`/admin/settings`);
}

export async function putSystemSettings(payload: SystemSettings): Promise<SystemSettings> {
  return request<SystemSettings>(`/admin/settings`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await request<void>(`/auth/password/change`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
