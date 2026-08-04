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
  ScheduleCell,
  ScheduleItem,
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

type ApiPageMeta = {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
};

type ApiJsonBody = {
  data?: unknown;
  meta?: ApiPageMeta;
  error?: { code?: string; message?: string; details?: unknown };
  success?: boolean;
} & Record<string, unknown>;

async function fetchApi(path: string, init?: RequestInit): Promise<ApiJsonBody> {
  const res = await fetch(`${V1}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = (await res.json().catch(() => ({}))) as ApiJsonBody;

  if (!res.ok || body?.success === false) {
    const err = body?.error ?? {};
    throw new ApiError(
      res.status,
      err.code ?? "UNKNOWN_ERROR",
      err.message ?? `通信に失敗しました (HTTP ${res.status})`,
      err.details,
    );
  }

  return body;
}

function toPaginated<T>(body: ApiJsonBody): Paginated<T> {
  const items = Array.isArray(body.data) ? (body.data as T[]) : [];
  const meta = body.meta;
  return {
    items,
    total: meta?.totalCount ?? items.length,
    page: meta?.page ?? 1,
    pageSize: meta?.perPage ?? items.length,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const body = await fetchApi(path, init);
  return (body.data ?? body) as T;
}

async function requestList<T>(path: string, init?: RequestInit): Promise<Paginated<T>> {
  return toPaginated<T>(await fetchApi(path, init));
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
  return requestList<OrderListItem>(`/orders${qs(params)}`);
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
  return requestList<T>(
    `/masters/${resource}${qs({
      page: params.page,
      perPage: params.pageSize,
      q: params.search,
      includeDeleted: params.includeInactive,
    })}`,
  );
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
  return requestList<DocumentItem>(
    `/documents${qs({
      customerId: params.customerId,
      documentType: params.documentType,
      page: params.page,
      perPage: params.pageSize,
    })}`,
  );
}

export const getMenuTemplates = async (params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<Paginated<MenuTemplate>> => {
  const res = await getMasterList<{
    id: string;
    title: string;
    body: string;
    tags?: string[] | null;
    useCount: number;
    isActive: boolean;
    deletedAt?: string | null;
  }>("setout-directions", params);

  return {
    ...res,
    items: res.items.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      tags: row.tags ?? [],
      usageCount: row.useCount,
      lastUsedAt: null,
      status: row.deletedAt || !row.isActive ? "archived" : "active",
    })),
  };
};

export async function getPlatingInstructions(params: {
  customerId?: string;
  serviceDateFrom?: string;
  serviceDateTo?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<PlatingInstruction>> {
  return requestList<PlatingInstruction>(
    `/documents/plating-instructions${qs({
      serviceDateFrom: params.serviceDateFrom,
      serviceDateTo: params.serviceDateTo,
      page: params.page,
      perPage: params.pageSize,
    })}`,
  );
}

// --- 発注・在庫 ---

type RawScheduleCell = {
  id?: string | number | null;
  deliveryDate?: string;
  requiredQty?: string;
  orderQty?: string;
  orderQuantity?: string;
  expectedStock?: string;
  actualStock?: string | null;
  stockQuantity?: string | null;
  adjustSource?: "auto" | "manual";
  isShortage?: boolean;
  unenteredCustomerCodes?: string[];
  version?: number;
};

function normalizeScheduleCell(raw: RawScheduleCell): ScheduleCell | null {
  if (raw.id == null || raw.deliveryDate == null || raw.version == null) return null;
  const orderQty = raw.orderQty ?? raw.orderQuantity ?? "0";
  return {
    id: String(raw.id),
    deliveryDate: raw.deliveryDate,
    requiredQty: raw.requiredQty ?? orderQty,
    orderQty,
    expectedStock: raw.expectedStock ?? raw.actualStock ?? raw.stockQuantity ?? "0",
    actualStock: raw.actualStock ?? raw.stockQuantity ?? null,
    adjustSource: raw.adjustSource ?? "auto",
    isShortage: raw.isShortage ?? false,
    unenteredCustomerCodes: raw.unenteredCustomerCodes ?? [],
    version: raw.version,
  };
}

function normalizeScheduleItem(raw: {
  stockItemId: string | number;
  name: string;
  unit: string;
  totalOrderQty: string;
  cells?: RawScheduleCell[];
}): ScheduleItem {
  const cells = (raw.cells ?? []).flatMap((cell) => {
    const normalized = normalizeScheduleCell(cell);
    return normalized ? [normalized] : [];
  });
  return {
    stockItemId: String(raw.stockItemId),
    name: raw.name,
    unit: raw.unit,
    totalOrderQty: raw.totalOrderQty,
    cells,
  };
}

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
  const body = await fetchApi(
    `/procurement/schedules${qs({
      supplierId: params.supplierId,
      deliveryFrom: params.deliveryDateFrom,
      deliveryTo: params.deliveryDateTo,
      search: params.itemQuery,
      category: params.categoryId,
      page: params.page,
      pageSize: params.perPage,
    })}`,
  );
  const paginated = toPaginated<ScheduleItem>(body);
  return {
    items: paginated.items.map((item) => normalizeScheduleItem(item)),
    meta: body.meta ?? {
      page: paginated.page,
      perPage: paginated.pageSize,
      totalCount: paginated.total,
      totalPages: Math.max(1, Math.ceil(paginated.total / paginated.pageSize)),
    },
    supplier: body.supplier as ScheduleResponse["supplier"],
    dates: body.dates as ScheduleResponse["dates"],
    calculatedAt: String(body.calculatedAt ?? ""),
  };
}

export async function patchScheduleCell(
  id: string,
  payload: { orderQty?: string; actualStock?: string; version: number },
): Promise<{ id: string; version: number }> {
  return request<{ id: string; version: number }>(`/procurement/schedules/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      orderQty: payload.orderQty,
      actualStock: payload.actualStock,
      version: payload.version,
    }),
  });
}

export async function getProcurementImports(params: {
  page?: number;
  pageSize?: number;
}): Promise<Paginated<ImportRecord>> {
  return requestList<ImportRecord>(
    `/procurement/imports${qs({
      page: params.page,
      perPage: params.pageSize,
    })}`,
  );
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
  return requestList<AuditLog>(
    `/audit-logs${qs({
      entityType: params.entityType,
      page: params.page,
      perPage: params.pageSize,
    })}`,
  );
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
