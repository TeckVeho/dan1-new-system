// dan1-new-system の packages/shared と型を揃えた apps/web 側の定義。
// apps/web を単独でビルド可能にするため、ここでは workspace パッケージに依存せず複製している。

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type UserType = "internal" | "facility";

export type AuthUser = {
  id: string;
  name: string;
  type: UserType;
  role: string;
  employeeCode?: string;
  customerId?: string;
  customerName?: string;
  impersonating?: boolean;
};

// --- 注文 ---

export type OrderWindowInfo = {
  serviceDateFrom: string;
  serviceDateTo: string;
  deadlineAt: string;
  remainingSeconds: number;
  isException: boolean;
  source: string;
};

export type WeeklyOrderDate = {
  date: string;
  weekday: string;
  editable: boolean;
  deadlineAt: string;
};

export type WeeklyOrderCell = {
  date: string;
  orderId: string | null;
  quantity: number | null;
  status: "draft" | "provisional" | "confirmed" | null;
  version: number | null;
};

export type WeeklyOrderRow = {
  unitId: string;
  unitName: string;
  mealTypeId: string;
  mealTypeName: string;
  menuKindId: string;
  menuKindName: string;
  swallowCategory: { id: string; code: string; name: string; sortOrder: number } | null;
  cells: WeeklyOrderCell[];
};

export type WeeklyOrdersResponse = {
  weekStart: string;
  dates: WeeklyOrderDate[];
  rows: WeeklyOrderRow[];
};

export type OrderListItem = {
  id: string;
  unitName: string;
  serviceDate: string;
  mealTypeName: string;
  menuKindName: string;
  currentQuantity: number;
  changedQuantity: number | null;
  reason: string | null;
  version: number;
};

export type RiceOrder = {
  id: string;
  unitId: string;
  serviceDate: string;
  riceType: string;
  quantity: number;
  status: "draft" | "provisional" | "confirmed";
  version: number;
};

export type AllergenOrder = {
  id: string;
  unitId: string;
  serviceDate: string;
  allergenTypeId: string;
  quantity: number;
  status: "draft" | "provisional" | "confirmed";
  version: number;
  allergenType?: { id: string; code: string; name: string };
};

export type UnenteredFacilityAlert = {
  customerId: string;
  customerCode: string;
  customerName: string;
  serviceDate: string;
  missingTypes: string[];
  previousOrderSummary: { lastServiceDate: string; totalQuantity: number } | null;
  alertStatus: string;
};

export type Unit = {
  id: string;
  name: string;
  customerId: string;
  isActive: boolean;
};

// --- マスタ ---

export type SwallowCategory = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type Customer = {
  id: string;
  customerCode: string;
  name: string;
  nameKana?: string;
  shortName?: string;
  contractStartDate: string;
  contractEndDate?: string | null;
  isInternalTest: boolean;
};

export type DeadlineRule = {
  id: string;
  name: string;
  scopeType: "global" | "group" | "customer";
  scopeId?: string | null;
  dayOffset: number;
  cutoffTime: string;
};

export type DeadlineException = {
  id: string;
  deadlineRuleId: string;
  serviceDate: string;
  dayOffset: number;
  cutoffTime: string;
  reason?: string;
};

// --- 資料・帳票 ---

export type DocumentItem = {
  id: string;
  documentType: string;
  title: string;
  customerName: string | null;
  serviceMonth: string;
  latestVersion: number;
  generatedAt: string | null;
  publishStatus: "published" | "unpublished";
  latestFileId: string | null;
};

export type DocumentVersion = {
  id: string;
  versionNo: number;
  fileId: string;
  generatedAt: string;
  supersededAt: string | null;
  settingsSnapshot: Record<string, unknown>;
};

export type DocumentDetail = DocumentItem & {
  customerId: string | null;
  isActive: boolean;
};

export type MenuTemplate = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  usageCount: number;
  lastUsedAt: string | null;
  status: "active" | "archived";
};

export type PlatingInstruction = {
  id: string;
  serviceDate: string;
  customerName: string;
  menuTemplateTitle: string | null;
  body: string;
  createdAt: string;
};

// --- 発注・在庫 ---

export type ScheduleCell = {
  id: string;
  deliveryDate: string;
  requiredQty: string;
  orderQty: string;
  expectedStock: string;
  actualStock: string | null;
  adjustSource: "auto" | "manual";
  isShortage: boolean;
  unenteredCustomerCodes: string[];
  version: number;
};

export type ScheduleItem = {
  stockItemId: string;
  name: string;
  unit: string;
  totalOrderQty: string;
  cells: ScheduleCell[];
};

export type ScheduleResponse = {
  supplier: { id: string; name: string };
  dates: { date: string; label: string; weekday: string }[];
  items: ScheduleItem[];
  meta: { page: number; perPage: number; totalCount: number; totalPages: number };
  calculatedAt: string;
};

export type ImportRecord = {
  id: string;
  importType: string;
  supplierName: string;
  status: "queued" | "running" | "completed" | "failed";
  targetDateFrom: string;
  targetDateTo: string;
  importedAt: string;
  importedBy: string;
  errorCount: number;
};

// --- 管理 ---

export type AuditLog = {
  id: string;
  actorType: "internal" | "facility";
  actorName: string;
  impersonatedCustomerName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  summary: string;
};
