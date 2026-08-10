/** docs/10_auth_roles.md §3.1 に準拠したロール定義 */
export const ROLE_CODES = [
  "system_admin",
  "internal_admin",
  "internal_staff",
  "facility_admin",
  "facility_staff",
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export const ROLE_DISPLAY_NAMES: Record<RoleCode, string> = {
  system_admin: "システム管理者",
  internal_admin: "社内管理者",
  internal_staff: "社内一般",
  facility_admin: "施設管理者",
  facility_staff: "施設一般",
};

export function getRoleDisplayName(code: string, fallback?: string): string {
  return ROLE_DISPLAY_NAMES[code as RoleCode] ?? fallback ?? code;
}
