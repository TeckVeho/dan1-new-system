"use client";

import { ShieldAlert } from "lucide-react";
import { useAuth } from "./AuthProvider";

const ADMIN_ROLES = ["system_admin", "internal_admin"] as const;

/**
 * 管理者（system_admin / internal_admin）専用ページを保護する。
 */
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user.type !== "internal" || !ADMIN_ROLES.includes(user.role as (typeof ADMIN_ROLES)[number])) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-white px-6 py-16 text-center">
        <ShieldAlert className="mb-3 h-8 w-8 text-muted" />
        <p className="text-[15px] font-medium text-text">このページへのアクセス権限がありません</p>
        <p className="mt-1 text-[13px] text-muted">管理者専用の機能です。</p>
      </div>
    );
  }

  return <>{children}</>;
}

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}
