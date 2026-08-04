"use client";

import { ShieldAlert } from "lucide-react";
import { useAuth } from "./AuthProvider";

/**
 * 社内ユーザー専用ページを施設ユーザーから保護する。
 * ルーティングをネストさせず、ページ側でこのコンポーネントに包む方式（10_auth_roles.md §3.2）。
 */
export function InternalOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user.type !== "internal") {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-white px-6 py-16 text-center">
        <ShieldAlert className="mb-3 h-8 w-8 text-muted" />
        <p className="text-[15px] font-medium text-text">このページへのアクセス権限がありません</p>
        <p className="mt-1 text-[13px] text-muted">社内ユーザー専用の機能です。</p>
      </div>
    );
  }

  return <>{children}</>;
}
