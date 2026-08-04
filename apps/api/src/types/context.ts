export type UserType = "internal" | "facility";

export type RequestContext = {
  sessionId: bigint;
  userType: UserType;
  userId?: bigint;
  customerUserId?: bigint;
  customerId?: bigint;
  name: string;
  roleCode: string;
  permissions: Set<string>;
  supplierScopeIds?: bigint[];
  impersonatingCustomerId?: bigint;
  impersonatorId?: bigint;
  ipAddress?: string;
  userAgent?: string;
};
