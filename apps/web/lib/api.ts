import { getApiBase } from "./auth";
import type {
  AuditLog,
  Customer,
  DeadlineException,
  DeadlineRule,
  DocumentItem,
  DocumentDetail,
  DocumentVersion,
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
  RiceOrder,
  AllergenOrder,
  UnenteredFacilityAlert,
  Unit,
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

export async function getRiceOrders(params: {
  customerId?: string;
  unitId?: string;
  dateFrom: string;
  dateTo: string;
}): Promise<RiceOrder[]> {
  return request<RiceOrder[]>(`/orders/rice${qs(params)}`);
}

export async function saveRiceOrders(payload: {
  customerId?: string;
  commit: boolean;
  cells: {
    unitId: string;
    serviceDate: string;
    riceType: string;
    quantity: number;
    version?: number | null;
  }[];
}): Promise<{ saved: number; cells: RiceOrder[] }> {
  return request(`/orders/rice`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function getAllergenOrders(params: {
  customerId?: string;
  unitId?: string;
  dateFrom: string;
  dateTo: string;
}): Promise<AllergenOrder[]> {
  return request<AllergenOrder[]>(`/orders/allergen${qs(params)}`);
}

export async function createAllergenOrder(payload: {
  customerId?: string;
  unitId: string;
  serviceDate: string;
  allergenTypeId: string;
  quantity: number;
}): Promise<AllergenOrder> {
  return request<AllergenOrder>(`/orders/allergen`, { method: "POST", body: JSON.stringify(payload) });
}

export async function updateAllergenOrder(
  id: string,
  payload: { quantity: number; version: number },
): Promise<AllergenOrder> {
  return request<AllergenOrder>(`/orders/allergen/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function getUnenteredFacilities(params: {
  serviceDateFrom: string;
  serviceDateTo: string;
}): Promise<{
  alerts: UnenteredFacilityAlert[];
  excluded: {
    contractEnded: number;
    orderSuspended: number;
    longHoliday: number;
    weekdayNotApplicable: number;
  };
}> {
  const body = await fetchApi(`/orders/unentered-facilities${qs(params)}`);
  return {
    alerts: (body.data ?? []) as UnenteredFacilityAlert[],
    excluded: (body.excluded ?? {
      contractEnded: 0,
      orderSuspended: 0,
      longHoliday: 0,
      weekdayNotApplicable: 0,
    }) as {
      contractEnded: number;
      orderSuspended: number;
      longHoliday: number;
      weekdayNotApplicable: number;
    },
  };
}

// --- マスタ共通 CRUD ---

export type MasterResource =
  | "swallow-categories"
  | "customers"
  | "deadline-rules"
  | "deadline-exceptions"
  | "setout-directions"
  | "meal-types"
  | "menu-kinds"
  | "allergens"
  | "suppliers"
  | "stock-items"
  | "production-patterns"
  | "reference-rules"
  | "business-calendars"
  | "order-suspensions"
  | "document-output-rules"
  | "customer-groups"
  | "order-types"
  | "units";

export async function getMasterList<T>(
  resource: MasterResource,
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    includeInactive?: boolean;
    customerId?: string;
  } = {},
): Promise<Paginated<T>> {
  return requestList<T>(
    `/masters/${resource}${qs({
      page: params.page,
      perPage: params.pageSize,
      q: params.search,
      includeDeleted: params.includeInactive,
      customerId: params.customerId,
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

export async function restoreMaster<T>(resource: MasterResource, id: string): Promise<T> {
  return request<T>(`/masters/${resource}/${id}/restore`, { method: "POST" });
}

export async function updateMasterSortOrder(
  resource: MasterResource,
  items: Array<{ id: string; sortOrder: number }>,
): Promise<{ updated: number }> {
  return request<{ updated: number }>(`/masters/${resource}/sort-order`, {
    method: "PATCH",
    body: JSON.stringify({ items }),
  });
}

export type FileUploadUrlResponse = {
  storageKey: string;
  uploadUrl: string;
  expiresAt: string;
};

export async function createFileUploadUrl(payload: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<FileUploadUrlResponse> {
  return request<FileUploadUrlResponse>("/files/upload-url", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadFileContent(uploadUrl: string, file: Blob, mimeType: string): Promise<void> {
  const res = await fetch(`${getApiBase()}${uploadUrl}`, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": mimeType },
    credentials: "include",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new ApiError(res.status, "UPLOAD_FAILED", body.error?.message ?? "ファイルのアップロードに失敗しました");
  }
}

export async function registerFile(payload: {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<{ id: string }> {
  return request<{ id: string }>("/files", { method: "POST", body: JSON.stringify(payload) });
}

export async function getFileDownloadUrl(fileId: string): Promise<{
  downloadUrl: string;
  expiresAt: string;
  originalName: string;
  mimeType: string;
}> {
  return request(`/files/${fileId}/download-url`);
}

export async function getMasterById<T>(resource: MasterResource, id: string): Promise<T> {
  return request<T>(`/masters/${resource}/${id}`);
}

export async function getCustomerAllergens(customerId: string) {
  return requestList<{ id: string; allergenType: { id: string; code: string; name: string } }>(
    `/masters/customers/${customerId}/allergens`,
  );
}

export async function addCustomerAllergen(customerId: string, allergenTypeId: string) {
  return request(`/masters/customers/${customerId}/allergens`, {
    method: "POST",
    body: JSON.stringify({ allergenTypeId }),
  });
}

export async function removeCustomerAllergen(customerId: string, allergenTypeId: string) {
  await request<void>(`/masters/customers/${customerId}/allergens/${allergenTypeId}`, { method: "DELETE" });
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

type RawDocumentRow = {
  id: string | number;
  documentType: string;
  title: string;
  serviceMonth: string;
  customerId?: string | null;
  isActive?: boolean;
  customer?: { name: string } | null;
  versions?: Array<{
    id: string | number;
    versionNo: number;
    generatedAt: string;
    fileId: string | number;
    supersededAt?: string | null;
    settingsSnapshot?: Record<string, unknown>;
  }>;
};

function normalizeDocumentItem(raw: RawDocumentRow): DocumentItem {
  const latest = raw.versions?.[0];
  const hasVersion = Boolean(latest);
  return {
    id: String(raw.id),
    documentType: raw.documentType,
    title: raw.title,
    customerName: raw.customer?.name ?? null,
    serviceMonth: raw.serviceMonth,
    latestVersion: latest?.versionNo ?? 0,
    generatedAt: latest?.generatedAt ?? null,
    publishStatus: hasVersion && raw.isActive !== false ? "published" : "unpublished",
    latestFileId: latest ? String(latest.fileId) : null,
  };
}

export async function getDocuments(params: {
  customerId?: string;
  documentType?: string;
  serviceMonth?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<DocumentItem>> {
  const res = await requestList<RawDocumentRow>(
    `/documents${qs({
      customerId: params.customerId,
      documentType: params.documentType,
      serviceMonth: params.serviceMonth,
      page: params.page,
      perPage: params.pageSize,
    })}`,
  );
  return { ...res, items: res.items.map(normalizeDocumentItem) };
}

export async function createDocument(payload: {
  customerId?: string;
  documentType: string;
  title: string;
  serviceMonth: string;
}): Promise<DocumentDetail> {
  const raw = await request<RawDocumentRow>("/documents", { method: "POST", body: JSON.stringify(payload) });
  return {
    ...normalizeDocumentItem(raw),
    customerId: raw.customerId ? String(raw.customerId) : null,
    isActive: raw.isActive !== false,
  };
}

export async function getDocumentById(id: string): Promise<DocumentDetail & { versions: DocumentVersion[] }> {
  const raw = await request<
    RawDocumentRow & {
      versions: Array<{
        id: string | number;
        versionNo: number;
        fileId: string | number;
        generatedAt: string;
        supersededAt?: string | null;
        settingsSnapshot?: Record<string, unknown>;
      }>;
    }
  >(`/documents/${id}`);
  return {
    ...normalizeDocumentItem(raw),
    customerId: raw.customerId ? String(raw.customerId) : null,
    isActive: raw.isActive !== false,
    versions: (raw.versions ?? []).map((v) => ({
      id: String(v.id),
      versionNo: v.versionNo,
      fileId: String(v.fileId),
      generatedAt: v.generatedAt,
      supersededAt: v.supersededAt ?? null,
      settingsSnapshot: v.settingsSnapshot ?? {},
    })),
  };
}

export async function getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const rows = await request<
    Array<{
      id: string | number;
      versionNo: number;
      fileId: string | number;
      generatedAt: string;
      supersededAt?: string | null;
      settingsSnapshot?: Record<string, unknown>;
    }>
  >(`/documents/${documentId}/versions`);
  return rows.map((v) => ({
    id: String(v.id),
    versionNo: v.versionNo,
    fileId: String(v.fileId),
    generatedAt: v.generatedAt,
    supersededAt: v.supersededAt ?? null,
    settingsSnapshot: v.settingsSnapshot ?? {},
  }));
}

export async function createDocumentVersion(documentId: string, fileId: string): Promise<DocumentVersion> {
  const v = await request<{
    id: string | number;
    versionNo: number;
    fileId: string | number;
    generatedAt: string;
    supersededAt?: string | null;
    settingsSnapshot?: Record<string, unknown>;
  }>(`/documents/${documentId}/versions`, { method: "POST", body: JSON.stringify({ fileId }) });
  return {
    id: String(v.id),
    versionNo: v.versionNo,
    fileId: String(v.fileId),
    generatedAt: v.generatedAt,
    supersededAt: v.supersededAt ?? null,
    settingsSnapshot: v.settingsSnapshot ?? {},
  };
}

export async function uploadFile(file: File): Promise<{ id: string }> {
  const upload = await createFileUploadUrl({
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  });
  await uploadFileContent(upload.uploadUrl, file, file.type || "application/octet-stream");
  return registerFile({
    storageKey: upload.storageKey,
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  });
}

export async function downloadFile(fileId: string): Promise<void> {
  const { downloadUrl } = await getFileDownloadUrl(fileId);
  window.open(`${getApiBase()}${downloadUrl}`, "_blank", "noopener,noreferrer");
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
  const res = await requestList<{
    id: string | number;
    serviceDate: string;
    bodySnapshot: string;
    createdAt: string;
    menuTemplate?: { title: string } | null;
  }>(
    `/documents/plating-instructions${qs({
      serviceDateFrom: params.serviceDateFrom,
      serviceDateTo: params.serviceDateTo,
      page: params.page,
      perPage: params.pageSize,
    })}`,
  );
  return {
    ...res,
    items: res.items.map((row) => ({
      id: String(row.id),
      serviceDate: row.serviceDate.slice(0, 10),
      customerName: "—",
      menuTemplateTitle: row.menuTemplate?.title ?? null,
      body: row.bodySnapshot,
      createdAt: row.createdAt,
    })),
  };
}

export async function createPlatingInstruction(payload: {
  serviceDate: string;
  menuTemplateId?: string;
  body: string;
}): Promise<PlatingInstruction> {
  const created = await request<{
    id: string | number;
    serviceDate: string;
    bodySnapshot: string;
    createdAt: string;
    menuTemplateId?: string | null;
  }>("/documents/plating-instructions", { method: "POST", body: JSON.stringify(payload) });
  return {
    id: String(created.id),
    serviceDate: created.serviceDate.slice(0, 10),
    customerName: "—",
    menuTemplateTitle: null,
    body: created.bodySnapshot,
    createdAt: created.createdAt,
  };
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
