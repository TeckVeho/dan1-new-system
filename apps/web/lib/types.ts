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
  roleName: string;
  employeeCode?: string;
  haccpNo?: string;
  customerId?: string;
  customerName?: string;
  impersonating?: boolean;
  passwordChangeRequired?: boolean;
  permissions?: string[];
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

export type OrderWindowsResponse = {
  orderType: string;
  nextDeadline: OrderWindowInfo;
  windows: Array<{
    serviceDate: string;
    deadlineAt: string | null;
    editable: boolean;
    isException: boolean;
    exceptionReason?: string;
  }>;
  changeWindow?: {
    serviceDateFrom: string;
    serviceDateTo: string;
    message: string;
  };
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

export type OrderGridRowType = "meal" | "allergen" | "rice";

export type OrderEntryRow = {
  rowType: OrderGridRowType;
  rowKey: string;
  unitId: string;
  unitName: string;
  unitSortOrder: number;
  mealTypeId?: string;
  mealTypeName?: string;
  mealTypeSortOrder?: number;
  menuKindId?: string;
  menuKindName?: string;
  menuKindSortOrder?: number;
  swallowCategory?: { id: string; code: string; name: string; sortOrder: number } | null;
  allergenTypeId?: string;
  allergenTypeCode?: string;
  allergenTypeName?: string;
  riceType?: string;
  riceTypeName?: string;
  cells: WeeklyOrderCell[];
};

export type OrderEntryResponse = {
  weekStart: string;
  dates: WeeklyOrderDate[];
  rows: OrderEntryRow[];
  riceTypes: Array<{ code: string; name: string; sortOrder: number }>;
  allergenOptions: Array<{ id: string; code: string; name: string }>;
  windowInfo: { deadlineAt: string; remainingSeconds: number } | null;
};

export type OrderEntrySaveFailure = {
  rowType: OrderGridRowType;
  key: string;
  code: string;
  message: string;
};

export type OrderEntrySaveResult = {
  saved: number;
  failed: OrderEntrySaveFailure[];
  mealTotal: number;
  allergenTotal: number;
  riceTotal: number;
};

export type RiceType = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type OrderWorkspaceTab = "entry" | "content" | "calendar";

export type OrderListItem = {
  id: string;
  customerId?: string;
  customerCode?: string;
  customerName?: string;
  unitName: string;
  serviceDate: string;
  mealTypeName: string;
  menuKindName: string;
  currentQuantity: number;
  changedQuantity: number | null;
  reason: string | null;
  version: number;
  status?: "draft" | "provisional" | "confirmed" | "cancelled";
};

export type OrderChangeLogItem = {
  id: string;
  mealOrderId: string;
  fieldName: string;
  beforeValue: string | null;
  afterValue: string | null;
  reason: string | null;
  changedByType: string | null;
  changedAt: string;
};

export type OrderSummaryResponse = {
  groupBy: "unit" | "day" | "month";
  rows: Array<
    | { unitId: string; unitName: string; total: number }
    | { date: string; total: number }
    | { month: string; total: number }
  >;
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
  deadlineAt: string | null;
};

export type Unit = {
  id: string;
  name: string;
  customerId: string;
  isActive: boolean;
};

export type AnnouncementFeedItem = {
  id: string;
  title: string;
  body: string;
  category: string;
  severity: string;
  isPinned: boolean;
  publishFrom: string;
  publishTo: string | null;
  isRead: boolean;
};

export type NewYearOrdersResponse = {
  year: number;
  weekStart: string;
  accepting: boolean;
  nextDeadline: OrderWindowInfo | null;
  changeWindow?: { serviceDateFrom: string; serviceDateTo: string; message: string };
  grid: WeeklyOrdersResponse;
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
  customerGroupId?: string | null;
  postalCode?: string;
  prefecture?: string;
  address?: string;
  phone?: string;
  fax?: string;
  contactName?: string;
  contractStartDate: string;
  contractEndDate?: string | null;
  isInternalTest: boolean;
  isActive?: boolean;
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

export type MenuTemplateDuplicateGroup = {
  normalizedBody: string;
  templates: Array<{
    id: string;
    title: string;
    body: string;
    usageCount: number;
    lastUsedAt: string | null;
  }>;
};

export type DocumentOutputMatrix = {
  dietTypes: Array<{ code: string; name: string }>;
  documentTypes: string[];
  rules: Array<{
    id: string;
    dietTypeCode: string;
    documentType: string;
    isEnabled: boolean;
    sortOrder: number;
  }>;
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

export type AdminRole = {
  id: string;
  code: string;
  name: string;
  scope: string;
  userCount: number;
  permissionCodes: string[];
};

export type AdminPermission = {
  code: string;
  name: string;
  category: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  category: string;
  isRead: boolean;
  linkUrl: string | null;
  createdAt: string;
};

export type JobItem = {
  id: string;
  jobType: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  createdByName: string | null;
};

export type JobLogItem = {
  id: string;
  level: string;
  message: string;
  createdAt: string;
};

export type JobDetail = JobItem & {
  params: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  logs: JobLogItem[];
};

export type InternalAdminUser = {
  id: string;
  type: "internal";
  employeeNo: string;
  haccpNo: string | null;
  name: string;
  email: string | null;
  isActive: boolean;
  role: { id: string; code: string; name: string };
  supplierIds: string[];
};

export type FacilityAdminUser = {
  id: string;
  type: "facility";
  loginId: string;
  name: string;
  isActive: boolean;
  customer: { id: string; customerCode: string; name: string };
  role: { id: string; code: string; name: string };
};

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

// --- 請求 ---

export type InvoiceStatus = "draft" | "issued" | "corrected" | "cancelled";

export type InvoiceLine = {
  id: string;
  lineNo: number;
  description: string;
  quantity: number;
  unitPrice: string;
  amount: string;
  lineType: string;
};

export type InvoiceLineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineType?: "meal" | "surcharge" | "adjustment";
};

export type InvoiceItem = {
  id: string;
  customerId: string;
  invoiceMonth: string;
  status: InvoiceStatus;
  totalAmount: string;
  version: number;
  pdfFileId?: string | null;
  issuedAt: string | null;
  createdAt: string;
  customer?: { id: string; customerCode: string; name: string };
  lines?: InvoiceLine[];
};

export type InvoiceDetail = InvoiceItem & {
  lines: InvoiceLine[];
  settingsSnapshot?: Record<string, unknown> | null;
};

export type InvoicePreviewItem = {
  customerId: string;
  customerCode: string;
  customerName: string;
  skipReason?: "existing_draft" | "no_orders" | "no_priced_lines";
  lines: InvoiceLine[];
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  taxRate: string;
};

export type InvoiceClosePreview = {
  invoiceMonth: string;
  taxRate: string;
  period: { from: string; to: string };
  creatableCount: number;
  skippedCount: number;
  totalSubtotal: string;
  totalAmount: string;
  items: InvoicePreviewItem[];
};

export type InvoiceCorrectionVersion = {
  id: string;
  version: number;
  status: InvoiceStatus;
  totalAmount: string;
  issuedAt: string | null;
  correctedFromVersion: number | null;
  correctionReason: string | null;
  correctedAt: string | null;
  lineCount: number;
  lines: InvoiceLine[];
};

export type InvoiceCorrectionHistory = {
  invoiceId: string;
  customerId: string;
  invoiceMonth: string;
  currentVersion: number;
  items: InvoiceCorrectionVersion[];
};

export type DeliveryDatePreview = {
  customer: { id: string; name: string; customerCode: string };
  pattern: { id: string; code: string; name: string; leadDays: number };
  serviceDate: string;
  manufacturingDate: string;
  pickupDate: string;
  arrivalDate: string;
  warnings: string[];
};

export type StockRecordItem = {
  id: string;
  stockItemId: string;
  stockItemName: string;
  stockItemCode: string;
  unit: string;
  recordDate: string;
  quantity: string;
  recordType: string;
  createdAt: string;
  createdBy: string;
};

export type MealCountAdjustmentItem = {
  id: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  serviceDate: string;
  mealTypeId: string;
  mealTypeCode: string;
  mealTypeName: string;
  adjustMeals: number;
  reason: string | null;
  version: number;
  updatedAt: string;
};

export type MealType = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type InquiryMessageItem = {
  id: string;
  senderType: string;
  senderUserId: string | null;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type InquiryThreadItem = {
  id: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  subject: string | null;
  status: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount?: number;
  lastMessage?: InquiryMessageItem | null;
};

export type InquiryThreadDetail = InquiryThreadItem & {
  messages: InquiryMessageItem[];
};

export type ImportCalendarDay = {
  date: string;
  total: number;
  completed: number;
  failed: number;
  running: number;
  queued: number;
  batches: Array<{ id: string; supplierName: string; fileType: string; status: string }>;
};

export type ImportCalendarResponse = {
  month: string;
  days: ImportCalendarDay[];
};

export type RiceOrderLogItem = {
  id: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  action: string;
  entityType: string;
  summary: string;
  actorName: string;
  createdAt: string;
};

export type MealCountSyncHistoryItem = {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  dateFrom: string;
  dateTo: string;
  totalMeals: number;
  customerCount: number;
  referenceCount: number;
  error: string | null;
  executedBy: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type MealCountConfirmRow = {
  id: string;
  serviceDate: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  unitId: string;
  unitName: string;
  mealType: string;
  menuKind: string;
  orderType: string;
  quantity: number;
  status: string;
};

export type MealCountConfirmResponse = {
  rows: MealCountConfirmRow[];
  totalQuantity: number;
  customerCount: number;
};

export type UnacceptableOrderAlert = {
  customerId: string;
  customerCode: string;
  customerName: string;
  serviceDate: string;
  reasons: Array<"allergen_only" | "zero_basic_with_allergen">;
  mealCount: number;
  allergenCount: number;
  riceCount: number;
};

// --- 帳票 ---

export type ReportParamField = {
  key: string;
  label: string;
  type: "date" | "string" | "number" | "boolean" | "select";
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
};

export type ReportCatalogItem = {
  key: string;
  name: string;
  description: string;
  category: "procurement" | "production" | "delivery" | "order" | "billing";
  formats: Array<"xlsx" | "csv" | "pdf">;
  permission: string;
  specStatus: "confirmed" | "provisional";
  paramFields: ReportParamField[];
};

export type BagDesignItem = {
  id: string;
  customerId: string;
  name: string;
  facilityNumber: number | null;
  maxUnits: number;
  maxMeals: number;
  sortOrder: number;
  isActive: boolean;
  customer?: { id: string; customerCode: string; name: string };
  units?: Array<{ id: string; unitId: string; unit: { id: string; name: string; unitCode: string } }>;
};

export type PickingDestinationItem = {
  id: string;
  stockItemId: string;
  destination: string;
  note: string | null;
  sortOrder: number;
  isActive: boolean;
  stockItem?: {
    id: string;
    name: string;
    itemCode: string;
    supplier?: { id: string; name: string; code: string };
  };
};

export type ScheduleCalcBasis = {
  schedule: {
    id: string;
    deliveryDate: string;
    orderQuantity: string;
    stockQuantity: string | null;
    status: string;
  };
  stockItem: { id: string; name: string; itemCode: string; unit: string };
  supplier: { id: string; name: string };
  calcSnapshot: unknown;
  references: Array<{
    customerId: string;
    customerCode: string | null;
    customerName: string | null;
    referenceDate: string;
    referenceQty: string;
    fallbackUsed: boolean;
    ruleCode: string | null;
    ruleName: string | null;
    latestRice: {
      quantity: number | null;
      referenceDate: string | null;
      fallbackUsed: boolean;
      unitName?: string;
    };
  }>;
};

export type SalesPricePreview = {
  invoiceMonth: string;
  rowCount: number;
  preview: (string | number)[][];
};
