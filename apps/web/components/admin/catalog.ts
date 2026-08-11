import type { LucideIcon } from "lucide-react";
import { Activity, ScrollText, Settings, ShieldCheck, Users } from "lucide-react";

export type AdminLink = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  permission?: string;
};

export const ADMIN_LINKS: AdminLink[] = [
  {
    href: "/admin/users",
    label: "ユーザー管理",
    description: "社内・施設ユーザーの登録・編集・パスワードリセット",
    icon: Users,
    permission: "admin.user.read",
  },
  {
    href: "/admin/roles",
    label: "ロール設定",
    description: "ロールと権限の割り当て",
    icon: ShieldCheck,
    permission: "admin.role.update",
  },
  {
    href: "/audit-logs",
    label: "監査ログ",
    description: "操作履歴の閲覧",
    icon: ScrollText,
    permission: "admin.audit_log.read",
  },
  {
    href: "/admin/jobs",
    label: "処理状況",
    description: "非同期ジョブの実行状況",
    icon: Activity,
    permission: "admin.job.read",
  },
  {
    href: "/settings",
    label: "設定",
    description: "アカウント設定と通知設定",
    icon: Settings,
  },
];

export function getAdminLink(href: string): AdminLink | undefined {
  return ADMIN_LINKS.find((entry) => entry.href === href);
}
