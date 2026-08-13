import { getApiBase } from "./auth";
import type {
  AuditLog,
  AdminPermission,
  AdminRole,
  Customer,
  DeadlineException,
  DeadlineRule,
  DeliveryDatePreview,
  ImportCalendarResponse,
  InquiryThreadDetail,
  InquiryThreadItem,
  MealCountAdjustmentItem,
  MealCountConfirmResponse,
  MealCountSyncHistoryItem,
  MealType,
  ReportCatalogItem,
  BagDesignItem,
  PickingDestinationItem,
  ScheduleCalcBasis,
  SalesPricePreview,
  DocumentItem,
  DocumentDetail,
  DocumentOutputMatrix,
  DocumentVersion,
  FacilityAdminUser,
  ImportRecord,
  InternalAdminUser,
  InvoiceDetail,
  InvoiceItem,
  InvoiceClosePreview,
  InvoiceCorrectionHistory,
  InvoiceLineInput,
  JobDetail,
  JobItem,
  MenuTemplate,
  MenuTemplateDuplicateGroup,
  AnnouncementFeedItem,
  NewYearOrdersResponse,
  NotificationItem,
  OrderChangeLogItem,
  OrderListItem,
  OrderSummaryResponse,
  OrderWindowInfo,
  OrderWindowsResponse,
  Paginated,
  PlatingInstruction,
  ScheduleCell,
  ScheduleItem,
  RiceOrderLogItem,
  ScheduleResponse,
  StockRecordItem,
  UnacceptableOrderAlert,
  SwallowCategory,
  OrderEntryResponse,
  OrderEntrySaveResult,
  RiceType,
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

export async function getOrderWindowsFull(params: {
  orderType: string;
  from: string;
  to: string;
  unitId?: string;
  customerId?: string;
}): Promise<OrderWindowsResponse> {
  return request<OrderWindowsResponse>(`/order-windows${qs(params)}`);
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

export async function getOrderEntry(params: {
  weekStart: string;
  customerId?: string;
}): Promise<OrderEntryResponse> {
  return request<OrderEntryResponse>(`/orders/entry${qs(params)}`);
}

export async function saveOrderEntry(payload: {
  customerId?: string;
  commit: boolean;
  cells: Array<{
    rowType: "meal" | "allergen" | "rice";
    rowKey: string;
    unitId: string;
    serviceDate: string;
    quantity: number;
    version: number | null;
    mealTypeId?: string;
    menuKindId?: string;
    allergenTypeId?: string;
    riceType?: string;
    orderId?: string | null;
  }>;
}): Promise<OrderEntrySaveResult> {
  return request<OrderEntrySaveResult>(`/orders/entry`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function addOrderEntryAllergenRow(payload: {
  customerId?: string;
  weekStart: string;
  unitId: string;
  allergenTypeId: string;
}): Promise<OrderEntryResponse> {
  return request<OrderEntryResponse>(`/orders/entry/allergen-row`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getNewYearOrders(params: {
  year: number;
  customerId?: string;
}): Promise<NewYearOrdersResponse> {
  return request<NewYearOrdersResponse>(`/orders/new-year${qs(params)}`);
}

export async function saveNewYearOrders(payload: {
  year: number;
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
  return request<{ saved: number }>(`/orders/new-year`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getOrders(params: {
  customerId?: string;
  search?: string;
  serviceDateFrom?: string;
  serviceDateTo?: string;
  status?: "draft" | "provisional" | "confirmed";
  page?: number;
  perPage?: number;
}): Promise<Paginated<OrderListItem>> {
  return requestList<OrderListItem>(`/orders${qs(params)}`);
}

export async function getOrder(id: string): Promise<OrderListItem> {
  return request<OrderListItem>(`/orders/${id}`);
}

export async function getOrderSummary(params: {
  customerId?: string;
  serviceDateFrom: string;
  serviceDateTo: string;
  groupBy: "unit" | "day" | "month";
}): Promise<OrderSummaryResponse> {
  return request<OrderSummaryResponse>(`/orders/summary${qs(params)}`);
}

export async function getOrderChanges(orderId: string): Promise<OrderChangeLogItem[]> {
  const res = await requestList<OrderChangeLogItem>(`/orders/${orderId}/changes`);
  return res.items;
}

export async function exportOrdersCsv(params: {
  customerId?: string;
  serviceDateFrom?: string;
  serviceDateTo?: string;
  status?: "draft" | "provisional" | "confirmed";
}): Promise<void> {
  const res = await fetch(`${V1}/orders/export${qs(params)}`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new ApiError(res.status, "EXPORT_FAILED", "CSVの出力に失敗しました");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-${params.serviceDateFrom ?? "all"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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

export async function getAnnouncementFeed(params?: {
  page?: number;
  perPage?: number;
  category?: string;
}): Promise<Paginated<AnnouncementFeedItem>> {
  return requestList<AnnouncementFeedItem>(`/announcements/feed${qs(params ?? {})}`);
}

export async function markAnnouncementRead(id: string): Promise<void> {
  await request(`/announcements/${id}/read`, { method: "POST" });
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

export async function updateOrderAlertStatus(payload: {
  customerId: string;
  serviceDate: string;
  status: string;
  note?: string;
}): Promise<void> {
  await request(`/orders/alerts/status`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getOrderUnits(params: { customerId?: string } = {}): Promise<Unit[]> {
  return request<Unit[]>(`/orders/units${qs(params)}`);
}

export async function getAllergenOrderOptions(params: { customerId?: string } = {}): Promise<{
  units: Unit[];
  allergens: { id: string; allergenType: { id: string; code: string; name: string } }[];
}> {
  return request(`/orders/allergen/options${qs(params)}`);
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
  | "diet-types"
  | "customer-groups"
  | "order-types"
  | "rice-types"
  | "long-holidays"
  | "unit-prices"
  | "tax-rates"
  | "units"
  | "announcements";

function crudBasePath(resource: MasterResource): string {
  if (resource === "announcements") return "/announcements";
  return `/masters/${resource}`;
}

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
    `${crudBasePath(resource)}${qs({
      page: params.page,
      perPage: params.pageSize,
      q: params.search,
      includeDeleted: params.includeInactive,
      customerId: params.customerId,
    })}`,
  );
}

export async function createMaster<T>(resource: MasterResource, payload: unknown): Promise<T> {
  return request<T>(`${crudBasePath(resource)}`, { method: "POST", body: JSON.stringify(payload) });
}

export async function updateMaster<T>(
  resource: MasterResource,
  id: string,
  payload: unknown,
): Promise<T> {
  return request<T>(`${crudBasePath(resource)}/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteMaster(resource: MasterResource, id: string): Promise<void> {
  await request<void>(`${crudBasePath(resource)}/${id}`, { method: "DELETE" });
}

export async function restoreMaster<T>(resource: MasterResource, id: string): Promise<T> {
  return request<T>(`${crudBasePath(resource)}/${id}/restore`, { method: "POST" });
}

export async function updateMasterSortOrder(
  resource: MasterResource,
  items: Array<{ id: string; sortOrder: number }>,
): Promise<{ updated: number }> {
  return request<{ updated: number }>(`${crudBasePath(resource)}/sort-order`, {
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
  return request<T>(`${crudBasePath(resource)}/${id}`);
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

export type CustomerSettingRecord = {
  id: string;
  customerId: string;
  validFrom: string;
  validTo?: string | null;
  settings: Record<string, unknown>;
};

export async function getCustomerSettings(customerId: string, asOf?: string): Promise<CustomerSettingRecord | null> {
  return request<CustomerSettingRecord | null>(
    `/masters/customers/${customerId}/settings${qs({ asOf })}`,
  );
}

export async function updateCustomerSettings(
  customerId: string,
  payload: { validFrom: string; settings: Record<string, unknown>; reason?: string },
): Promise<CustomerSettingRecord> {
  return request<CustomerSettingRecord>(`/masters/customers/${customerId}/settings`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export type CustomerProductionPattern = {
  id: string;
  customerId: string;
  productionPatternId: string;
  validFrom: string;
  validTo?: string | null;
  productionPattern: { id: string; code: string; name: string };
};

export async function getCustomerProductionPatterns(customerId: string): Promise<CustomerProductionPattern[]> {
  return request<CustomerProductionPattern[]>(`/masters/customers/${customerId}/production-patterns`);
}

export async function addCustomerProductionPattern(
  customerId: string,
  payload: { productionPatternId: string; validFrom: string; validTo?: string },
): Promise<CustomerProductionPattern> {
  return request<CustomerProductionPattern>(`/masters/customers/${customerId}/production-patterns`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeCustomerProductionPattern(customerId: string, id: string): Promise<void> {
  await request<void>(`/masters/customers/${customerId}/production-patterns/${id}`, { method: "DELETE" });
}

export const getSwallowCategories = (params?: { page?: number; pageSize?: number; search?: string }) =>
  getMasterList<SwallowCategory>("swallow-categories", params);

export const getRiceTypes = (params?: { page?: number; pageSize?: number; search?: string }) =>
  getMasterList<RiceType>("rice-types", params);

export const getCustomers = (params?: { page?: number; pageSize?: number; search?: string }) =>
  getMasterList<Customer>("customers", params);

export const getMealTypes = (params?: { page?: number; pageSize?: number; search?: string }) =>
  getMasterList<MealType>("meal-types", params);

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
    publishStatus: hasVersion && raw.isActive === true ? "published" : "unpublished",
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

export async function setDocumentPublished(documentId: string, published: boolean): Promise<void> {
  await request(`/documents/${documentId}/publish`, {
    method: "POST",
    body: JSON.stringify({ published }),
  });
}

export async function getDocumentOutputMatrix(): Promise<DocumentOutputMatrix> {
  return request<DocumentOutputMatrix>("/documents/output-rules/matrix");
}

export async function previewDocumentOutputRules(
  customerId: string,
  asOf?: string,
): Promise<{ dietTypeCode: string; documentTypes: string[]; source: "rule" | "override" }> {
  return request("/documents/output-rules/preview", {
    method: "POST",
    body: JSON.stringify({ customerId, asOf }),
  });
}

export async function getMenuTemplateDuplicates(): Promise<MenuTemplateDuplicateGroup[]> {
  return request<MenuTemplateDuplicateGroup[]>("/documents/templates/duplicates");
}

export async function bulkArchiveMenuTemplates(payload: {
  ids?: string[];
  unusedSinceDays?: number;
}): Promise<{ archived: number }> {
  return request("/documents/templates/bulk-archive", { method: "POST", body: JSON.stringify(payload) });
}

export async function mergeMenuTemplates(payload: {
  keepId: string;
  mergeIds: string[];
}): Promise<{ keepId: string; merged: number }> {
  return request("/documents/templates/merge", { method: "POST", body: JSON.stringify(payload) });
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
    lastUsedAt?: string | null;
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
      lastUsedAt: row.lastUsedAt ?? null,
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
  saveAsTemplate?: boolean;
  templateTitle?: string;
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
      shortageOnly: params.shortageOnly,
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

export async function exportProcurementSchedule(payload: {
  supplierId: string;
  deliveryFrom: string;
  deliveryTo: string;
  search?: string;
  category?: string;
  shortageOnly?: boolean;
  format?: "xlsx" | "csv";
}): Promise<{ jobId: string; status: string; statusUrl: string }> {
  return request(`/procurement/schedules/export`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function postProcurementImport(payload: {
  fileType: string;
  supplierId: string;
  fileId: string;
  targetDateFrom?: string;
  targetDateTo?: string;
}): Promise<{ importId: string; jobId: string; status: string }> {
  return request<{ importId: string; jobId: string; status: string }>(`/procurement/imports`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getImportCalendar(params: {
  month: string;
  supplierId?: string;
}): Promise<ImportCalendarResponse> {
  return request<ImportCalendarResponse>(`/procurement/imports/calendar${qs(params)}`);
}

export async function getStockRecords(params: {
  stockItemId?: string;
  recordDateFrom?: string;
  recordDateTo?: string;
  page?: number;
  perPage?: number;
}): Promise<Paginated<StockRecordItem>> {
  return requestList<StockRecordItem>(`/procurement/stock-records${qs(params)}`);
}

export async function createStockRecord(payload: {
  stockItemId: string;
  recordDate: string;
  quantity: number;
  recordType?: "inventory" | "adjustment";
}): Promise<StockRecordItem> {
  return request<StockRecordItem>(`/procurement/stock-records`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMealCountAdjustments(params: {
  customerId?: string;
  serviceDateFrom?: string;
  serviceDateTo?: string;
  page?: number;
  perPage?: number;
}): Promise<Paginated<MealCountAdjustmentItem>> {
  return requestList<MealCountAdjustmentItem>(`/procurement/adjustments${qs(params)}`);
}

export async function putMealCountAdjustments(payload: {
  items: Array<{
    customerId: string;
    serviceDate: string;
    mealTypeId: string;
    adjustMeals: number;
    reason?: string;
    version?: number;
  }>;
}): Promise<{ saved: number; items: MealCountAdjustmentItem[] }> {
  return request(`/procurement/adjustments`, { method: "PUT", body: JSON.stringify(payload) });
}

export async function getInquiryThreads(params?: {
  customerId?: string;
  status?: "open" | "closed";
  page?: number;
  perPage?: number;
}): Promise<Paginated<InquiryThreadItem>> {
  return requestList<InquiryThreadItem>(`/inquiries/threads${qs(params ?? {})}`);
}

export async function createInquiryThread(payload: {
  customerId?: string;
  subject?: string;
  body: string;
}): Promise<InquiryThreadDetail> {
  return request<InquiryThreadDetail>(`/inquiries/threads`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getInquiryThread(id: string): Promise<InquiryThreadDetail> {
  return request<InquiryThreadDetail>(`/inquiries/threads/${id}`);
}

export async function postInquiryMessage(threadId: string, body: string) {
  return request(`/inquiries/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function patchInquiryThreadStatus(threadId: string, status: "open" | "closed") {
  return request(`/inquiries/threads/${threadId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function markInquiryThreadRead(threadId: string) {
  return request(`/inquiries/threads/${threadId}/read`, { method: "PATCH" });
}

export async function postMealCountSync(payload: {
  dateFrom: string;
  dateTo: string;
}): Promise<{ jobId: string; status: string; statusUrl: string }> {
  return request(`/procurement/meal-count-sync`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMealCountSyncHistory(params?: {
  page?: number;
  perPage?: number;
}): Promise<Paginated<MealCountSyncHistoryItem>> {
  return requestList<MealCountSyncHistoryItem>(`/procurement/meal-count-sync/history${qs(params ?? {})}`);
}

export async function getRiceOrderLogs(params: {
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
}): Promise<Paginated<RiceOrderLogItem>> {
  return requestList<RiceOrderLogItem>(`/orders/rice/logs${qs(params)}`);
}

export async function getMealCountConfirmation(params: {
  customerId?: string;
  serviceDateFrom: string;
  serviceDateTo: string;
}): Promise<MealCountConfirmResponse> {
  return request<MealCountConfirmResponse>(`/orders/meal-counts${qs(params)}`);
}

export async function getUnacceptableOrderAlerts(params: {
  serviceDateFrom: string;
  serviceDateTo: string;
}): Promise<{ alerts: UnacceptableOrderAlert[]; count: number }> {
  return request(`/orders/unacceptable-alerts${qs(params)}`);
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

export async function requestPasswordReset(loginId: string): Promise<string> {
  const body = await request<{ message: string }>(`/auth/password-reset/request`, {
    method: "POST",
    body: JSON.stringify({ loginId }),
  });
  return body.message;
}

export async function confirmPasswordReset(payload: {
  token: string;
  newPassword: string;
}): Promise<string> {
  const body = await request<{ message: string }>(`/auth/password-reset/confirm`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return body.message;
}

export async function getAdminUsers(params: {
  type?: "internal" | "facility";
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<InternalAdminUser | FacilityAdminUser>> {
  return request<Paginated<InternalAdminUser | FacilityAdminUser>>(
    `/admin/users${qs(params)}`,
  );
}

export async function createInternalUser(payload: {
  employeeNo: string;
  haccpNo?: string;
  name: string;
  email?: string;
  roleId: string;
  password?: string;
}): Promise<{ user: InternalAdminUser; temporaryPassword?: string }> {
  return request(`/admin/users/internal`, { method: "POST", body: JSON.stringify(payload) });
}

export async function updateInternalUser(
  id: string,
  payload: Partial<{
    employeeNo: string;
    haccpNo: string | null;
    name: string;
    email: string | null;
    roleId: string;
    isActive: boolean;
  }>,
): Promise<InternalAdminUser> {
  return request(`/admin/users/internal/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function createFacilityUser(payload: {
  customerId: string;
  loginId: string;
  name: string;
  roleId: string;
  password?: string;
}): Promise<{ user: FacilityAdminUser; temporaryPassword?: string }> {
  return request(`/admin/users/facility`, { method: "POST", body: JSON.stringify(payload) });
}

export async function updateFacilityUser(
  id: string,
  payload: Partial<{ loginId: string; name: string; roleId: string; isActive: boolean }>,
): Promise<FacilityAdminUser> {
  return request(`/admin/users/facility/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function resetAdminUserPassword(
  type: "internal" | "facility",
  id: string,
): Promise<{ temporaryPassword?: string }> {
  return request(`/admin/users/${type}/${id}/reset-password`, { method: "POST", body: "{}" });
}

export async function deleteAdminUser(type: "internal" | "facility", id: string): Promise<void> {
  await request(`/admin/users/${type}/${id}`, { method: "DELETE" });
}

export async function getAdminRoles(): Promise<AdminRole[]> {
  return request<AdminRole[]>(`/admin/roles`);
}

export async function getAdminPermissions(): Promise<AdminPermission[]> {
  return request<AdminPermission[]>(`/admin/permissions`);
}

export async function updateRolePermissions(
  roleId: string,
  permissionCodes: string[],
): Promise<{ id: string; code: string; name: string; permissionCodes: string[] }> {
  return request(`/admin/roles/${roleId}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissionCodes }),
  });
}

export async function getNotifications(params?: {
  page?: number;
  perPage?: number;
  isRead?: boolean;
  category?: string;
}): Promise<Paginated<NotificationItem>> {
  return requestList<NotificationItem>(`/notifications${qs(params ?? {})}`);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const body = await request<{ count: number }>(`/notifications/unread-count`);
  return body.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await request(`/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await request(`/notifications/read-all`, { method: "POST", body: "{}" });
}

export async function getJobs(params?: {
  page?: number;
  perPage?: number;
  status?: string;
  jobType?: string;
  from?: string;
  to?: string;
}): Promise<Paginated<JobItem>> {
  return requestList<JobItem>(`/jobs${qs(params ?? {})}`);
}

export async function getJob(id: string): Promise<JobDetail> {
  return request<JobDetail>(`/jobs/${id}`);
}

export async function cancelJob(id: string): Promise<JobItem> {
  return request<JobItem>(`/jobs/${id}/cancel`, { method: "POST", body: "{}" });
}

// --- 請求 ---

export async function getInvoices(params?: {
  page?: number;
  perPage?: number;
  invoiceMonth?: string;
  customerId?: string;
  status?: string;
}): Promise<Paginated<InvoiceItem>> {
  return requestList<InvoiceItem>(`/invoices${qs(params ?? {})}`);
}

export async function getInvoice(id: string): Promise<InvoiceDetail> {
  return request<InvoiceDetail>(`/invoices/${id}`);
}

export async function previewInvoices(payload: {
  invoiceMonth: string;
  customerIds?: string[];
}): Promise<InvoiceClosePreview> {
  return request<InvoiceClosePreview>(`/invoices/preview`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getInvoiceCorrections(id: string): Promise<InvoiceCorrectionHistory> {
  return request<InvoiceCorrectionHistory>(`/invoices/${id}/corrections`);
}

export async function closeInvoices(payload: {
  invoiceMonth: string;
  customerIds?: string[];
}): Promise<{ invoiceMonth: string; createdCount: number; invoiceIds: string[] }> {
  return request(`/invoices/close`, { method: "POST", body: JSON.stringify(payload) });
}

export async function issueInvoice(id: string): Promise<InvoiceDetail> {
  return request<InvoiceDetail>(`/invoices/${id}/issue`, { method: "POST", body: "{}" });
}

export async function correctInvoice(
  id: string,
  payload: { lines: InvoiceLineInput[]; reason?: string },
): Promise<InvoiceDetail> {
  return request<InvoiceDetail>(`/invoices/${id}/correct`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteDraftInvoice(id: string): Promise<void> {
  await request(`/invoices/${id}`, { method: "DELETE" });
}

export async function getInvoiceDownloadUrl(id: string): Promise<{
  downloadUrl: string;
  expiresAt: string;
  originalName: string;
  mimeType: string;
}> {
  return request(`/invoices/${id}/download`);
}

export async function downloadInvoicePdf(id: string): Promise<void> {
  const { downloadUrl } = await getInvoiceDownloadUrl(id);
  window.open(`${getApiBase()}${downloadUrl}`, "_blank", "noopener,noreferrer");
}

export async function downloadManualPdf(): Promise<void> {
  const res = await fetch(`${V1}/manual/pdf`, { credentials: "include", cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      body?.error?.code ?? "DOWNLOAD_FAILED",
      body?.error?.message ?? "マニュアルのダウンロードに失敗しました",
    );
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "manual.pdf";
  a.click();
  URL.revokeObjectURL(url);
}

export async function previewDeliveryDates(params: {
  customerId: string;
  serviceDate: string;
}): Promise<DeliveryDatePreview> {
  return request<DeliveryDatePreview>(`/invoices/delivery-date/preview${qs(params)}`);
}

// --- 帳票 ---

export async function getReportCatalog(): Promise<ReportCatalogItem[]> {
  return request<ReportCatalogItem[]>(`/reports`);
}

export async function generateReport(
  key: string,
  params: Record<string, unknown>,
): Promise<{ jobId: string; status: string; reportKey: string; statusUrl: string }> {
  return request(`/reports/${key}/generate`, {
    method: "POST",
    body: JSON.stringify({ params }),
  });
}

// --- 発注・売価（A+C） ---

export async function getScheduleCalcBasis(scheduleId: string): Promise<ScheduleCalcBasis> {
  return request<ScheduleCalcBasis>(`/procurement/schedules/${scheduleId}/calc-basis`);
}

export async function getBagDesigns(params?: {
  customerId?: string;
  page?: number;
  perPage?: number;
}): Promise<Paginated<BagDesignItem>> {
  return requestList<BagDesignItem>(`/masters/bag-designs${qs(params ?? {})}`);
}

export async function createBagDesign(payload: {
  customerId: string;
  name: string;
  facilityNumber?: number;
  maxUnits?: number;
  maxMeals?: number;
  unitIds: string[];
  sortOrder?: number;
  isActive?: boolean;
}): Promise<BagDesignItem> {
  return request<BagDesignItem>(`/masters/bag-designs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBagDesign(
  id: string,
  payload: Partial<{
    name: string;
    facilityNumber: number | null;
    maxUnits: number;
    maxMeals: number;
    unitIds: string[];
    sortOrder: number;
    isActive: boolean;
  }>,
): Promise<BagDesignItem> {
  return request<BagDesignItem>(`/masters/bag-designs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteBagDesign(id: string): Promise<void> {
  await request<void>(`/masters/bag-designs/${id}`, { method: "DELETE" });
}

export async function getPickingDestinations(params?: {
  page?: number;
  perPage?: number;
}): Promise<Paginated<PickingDestinationItem>> {
  return requestList<PickingDestinationItem>(`/masters/picking-destinations${qs(params ?? {})}`);
}

export async function upsertPickingDestination(payload: {
  stockItemId: string;
  destination: "regular_menu" | "allergen_menu" | "pouch" | "other";
  note?: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<PickingDestinationItem> {
  return request<PickingDestinationItem>(`/masters/picking-destinations`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deletePickingDestination(stockItemId: string): Promise<void> {
  await request<void>(`/masters/picking-destinations/${stockItemId}`, { method: "DELETE" });
}

export async function previewSalesPrice(params: {
  invoiceMonth: string;
  customerIds?: string;
}): Promise<SalesPricePreview> {
  return request<SalesPricePreview>(`/sales-prices/preview${qs(params)}`);
}

export async function generateSalesPrice(payload: {
  invoiceMonth: string;
  customerIds?: string[];
  format?: "xlsx" | "csv";
}): Promise<{ jobId: string; status: string; statusUrl: string }> {
  return request(`/sales-prices/generate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
