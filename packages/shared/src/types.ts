export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type AuthUser = {
  id: string;
  name: string;
  type: "internal" | "facility";
  role: string;
  roleName: string;
  employeeCode?: string;
  haccpNo?: string;
  customerId?: string;
  customerName?: string;
  impersonating?: boolean;
  passwordChangeRequired?: boolean;
};
