"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { AdminHub } from "@/components/admin/AdminHub";

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        title="システム管理"
        description="ユーザー・権限・監査ログ・ジョブ・設定を一元管理します"
      />
      <AdminHub />
    </div>
  );
}
